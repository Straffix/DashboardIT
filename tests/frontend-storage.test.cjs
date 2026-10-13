const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const test = require('node:test')

function createApp(address, { testAccount = false, persistedValues } = {}) {
	const values = new Map(persistedValues || [
		['nowe_zatrudnienia_dane', JSON.stringify([{ id: 'existing-hire' }])],
		['dashboard-theme', 'dark'],
	])
	const originalValues = new Map(values)
	const localStorage = {
		getItem: key => values.get(key) ?? null,
		setItem: (key, value) => values.set(key, String(value)),
		removeItem: key => values.delete(key),
	}
	let networkAttempts = 0
	const rejectNetwork = () => {
		networkAttempts += 1
		throw new Error('Unexpected network request')
	}
	const element = () => ({
		style: { setProperty() {} },
		classList: { toggle() {}, add() {}, remove() {} },
		setAttribute() {}, appendChild() {}, querySelector: () => null,
	})
	const document = {
		baseURI: address, body: element(), documentElement: element(),
		createElement: element, dispatchEvent() {},
	}
	const window = {
		location: new URL(address), localStorage, setTimeout() {},
		fetch: rejectNetwork, XMLHttpRequest: rejectNetwork,
	}
	const context = vm.createContext({
		window, document, localStorage, URL, console,
		fetch: rejectNetwork, XMLHttpRequest: rejectNetwork,
		btoa: value => Buffer.from(value, 'binary').toString('base64'),
		CustomEvent: class {},
	})
	for (const file of [
		'js/shared/base.js', 'js/shared/runtime-config.js',
		...(testAccount ? ['js/shared/test-account.js'] : []),
		'js/core/storage-service.js',
		'js/shared/auth.js', 'js/shared/public-api.js', 'js/core/domain-services.js',
	]) {
		vm.runInContext(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), context, { filename: file })
	}
	const json = value => JSON.parse(JSON.stringify(value))
	return { services: window.AppServices, values, originalValues, json, testAccount: window.DashboardTestAccount, networkAttempts: () => networkAttempts }
}

test('the shipped account logs in on independent devices and survives reload at a Pages repository URL', () => {
	const address = 'https://straffix.github.io/DashboardIT/'
	const devices = [createApp(address, { testAccount: true }), createApp(address, { testAccount: true })]
	const identities = []
	for (const app of devices) {
		const { authService: auth, usersService: users } = app.services
		auth.syncCurrentUserFromSession()
		assert.throws(() => auth.login({ login: app.testAccount.login, password: 'incorrect' }), /Nieprawidłowy/)
		assert.equal(auth.getCurrentUser(), null)
		const user = auth.login(app.testAccount)
		assert.equal(user.role, 'admin')
		assert.equal(users.getAll().filter(record => record.id === user.id).length, 1)
		identities.push(user.id)
		assert.deepEqual(app.json(app.services.hiresService.getAll()), [{ id: 'existing-hire' }])
		assert.equal(app.networkAttempts(), 0)

		const reloaded = createApp(address, { testAccount: true, persistedValues: app.values })
		assert.equal(reloaded.services.authService.syncCurrentUserFromSession().id, user.id)
		reloaded.services.authService.logout({ silent: true })
		assert.equal(reloaded.services.sessionService.getCurrent(), null)
		assert.equal(reloaded.services.authService.login(app.testAccount).id, user.id)
		assert.equal(reloaded.networkAttempts(), 0)
	}
	assert.equal(identities[0], identities[1])
})

test('the shipped account keeps fixed credentials and preserves existing local accounts', () => {
	const existingUser = {
		id: 'existing-owner', fullName: 'Existing Owner', login: 'existing.owner', role: 'admin',
		passwordHash: Buffer.from('existing-password').toString('base64'),
	}
	const values = new Map([['dashboard_users', JSON.stringify([existingUser])]])
	const app = createApp('https://straffix.github.io/DashboardIT/', { testAccount: true, persistedValues: values })
	const { authService: auth, usersService: users } = app.services
	const credentials = app.testAccount
	const storedBefore = app.values.get('dashboard_users')
	assert.equal(users.getAll().length, 2)
	assert.equal(app.values.get('dashboard_users'), storedBefore)
	auth.syncCurrentUserFromSession()
	auth.login(credentials)
	assert.throws(() => auth.resetPassword({ login: credentials.login, password: 'changed-password' }), /stałe/)
	assert.throws(() => auth.changePassword({ currentPassword: credentials.password, newPassword: 'changed-password' }), /stałe/)
	assert.throws(() => auth.updateProfile({ fullName: credentials.fullName, login: 'renamed' }), /stały/)
	auth.logout({ silent: true })
	auth.login({ login: existingUser.login, password: 'existing-password' })
	assert.throws(() => auth.deleteUser(credentials.id), /stałe/)
	assert.throws(() => auth.updateUserAccess({ userId: credentials.id, fullName: 'Changed', login: 'changed', role: 'user' }), /stałe/)
	assert.equal(app.values.get('dashboard_users'), storedBefore)
	assert.equal(app.networkAttempts(), 0)
})

for (const address of [
	'file:///dashboard/index.html',
	'http://127.0.0.1:5500/index.html',
	'http://dashboard.intranet/index.html',
	'https://dashboard.example.test/index.html',
]) {
	test(`accounts, records and chat work without network requests at ${address}`, () => {
		const app = createApp(address)
		const { authService: auth, hiresService: hires, notesService: notes, storageService: storage } = app.services
		assert.deepEqual(app.values, app.originalValues, 'starting the app must preserve existing data')
		assert.deepEqual(app.json(hires.getAll()), [{ id: 'existing-hire' }])

		const user = auth.register({ fullName: 'Test User', login: 'test.user', password: 'test-password' })
		const colleague = auth.register({ fullName: 'Other User', login: 'other.user', password: 'other-password' })
		auth.logout({ silent: true })
		assert.equal(app.services.sessionService.getCurrent(), null)
		assert.equal(auth.login({ login: user.login, password: 'test-password' }).id, user.id)

		hires.saveAll([{ id: 'new-hire' }])
		assert.deepEqual(JSON.parse(app.values.get('nowe_zatrudnienia_dane')), [{ id: 'new-hire' }])
		assert.equal(app.services.usersService.getAll().length, 2)
		assert.equal(auth.syncCurrentUserFromSession().id, user.id)

		const message = notes.createChatMessage({ content: 'Hello', actor: user })
		assert.equal(notes.getChatMessages()[0].content, 'Hello')
		assert.throws(() => notes.updateChatMessage({ messageId: message.id, content: 'Changed', actor: colleague }), /tylko swoje/)
		notes.updateChatMessage({ messageId: message.id, content: 'Changed', actor: user })
		notes.setChatMessagePinned({ messageId: message.id, isPinned: true, actor: user })
		assert.equal(notes.getPinnedChatMessages()[0].content, 'Changed')
		notes.deleteChatMessage({ messageId: message.id, actor: user })
		assert.equal(notes.getChatMessages().length, 0)

		auth.logout({ silent: true })
		hires.saveAll([{ id: 'guest-write' }])
		storage.remove('nowe_zatrudnienia_dane')
		assert.deepEqual(app.json(hires.getAll()), [{ id: 'new-hire' }], 'guest writes must stay blocked')
		assert.equal(app.networkAttempts(), 0)
	})
}
