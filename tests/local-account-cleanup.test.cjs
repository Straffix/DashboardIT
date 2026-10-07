const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const test = require('node:test')

const owner = {
	id: 'owner', fullName: 'Arkadiusz Lisiecki', login: 'arkadiusz',
	passwordHash: Buffer.from('fixture-password').toString('base64'), role: 'admin',
	avatarId: 'amber', avatarImage: 'data:image/png;base64,fixture',
	profileTitle: 'Lider', profileBio: 'My profile', profileAccentColor: '#123456',
	bookmarkDefaultColor: '#654321', createdAt: '2026-01-01T00:00:00Z',
	updatedAt: '2026-01-02T00:00:00Z', extraMetadata: { retained: true },
}
const colleague = { ...owner, id: 'other', fullName: 'Other User', login: 'other', role: 'user' }
const otherAdmin = { ...colleague, id: 'other-admin', login: 'other.admin', role: 'admin' }
const marker = 'dashboard_account_cleanup::2026-10-07-dev-account-cleanup'

function createApp({ users = [owner, colleague, otherAdmin], session = owner.id, remote = false, fallback = true, failKey = '' } = {}) {
	const values = new Map([
		['dashboard_users', JSON.stringify(users)],
		['dashboard_user_session', JSON.stringify(session ? { userId: session, loginAt: '2026-10-07T08:00:00Z' } : null)],
		['dashboardit.react.session.users', JSON.stringify(users.map(({ passwordHash, ...user }) => user))],
		['dashboardit.react.session.active-user', colleague.id],
		['nowe_zatrudnienia_dane', JSON.stringify([{ id: 'hire', preparedBy: 'Other User', location: 'Centrala' }])],
		['dashboard_notes_entries', JSON.stringify([{ id: 'note', authorId: colleague.id, body: 'Keep this note' }])],
		['dashboard_user_bookmarks', JSON.stringify([{ id: 'mine', userId: owner.id }, { id: 'theirs', userId: colleague.id }])],
		['dashboard-theme::user::owner', 'blush'],
	])
	let failed = false
	const localStorage = {
		getItem: key => values.get(key) ?? null,
		setItem(key, value) {
			if (key === failKey && !failed) { failed = true; throw new Error('Fixture storage failure') }
			values.set(key, String(value))
		},
		removeItem: key => values.delete(key),
	}
	const read = (key, defaultValue = null) => JSON.parse(values.get(key) || JSON.stringify(defaultValue))
	const element = () => ({
		style: { setProperty() {} }, classList: { toggle() {}, add() {}, remove() {} },
		setAttribute() {}, appendChild() {}, querySelector: () => null,
	})
	const document = { body: element(), documentElement: element(), createElement: element, dispatchEvent() {} }
	const window = {
		setTimeout() {}, location: { protocol: 'http:', hostname: '127.0.0.1' },
		AppServices: {
			storageService: {
				isRemoteEnabled: () => remote, isBrowserFallbackMode: () => fallback,
				readJson: read, writeJson: (key, value) => values.set(key, JSON.stringify(value)),
			},
			usersService: { getAll: () => read('dashboard_users', []), saveAll: users => values.set('dashboard_users', JSON.stringify(users)) },
			sessionService: {
				getCurrent: () => read('dashboard_user_session'),
				save: session => values.set('dashboard_user_session', JSON.stringify(session)),
				clear: () => values.delete('dashboard_user_session'),
			},
		},
	}
	const context = vm.createContext({ window, document, localStorage, URL, console, btoa: value => Buffer.from(value, 'binary').toString('base64'), CustomEvent: class {} })
	for (const relativePath of ['js/shared/base.js', 'js/shared/runtime-config.js', 'js/shared/auth.js']) {
		vm.runInContext(fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8'), context, { filename: relativePath })
	}
	return { values, read, context, auth: window.AppServices.authService }
}

test('keeps the owner credentials, avatar and preferences; deletes other accounts and labels DEV', () => {
	const app = createApp()
	const sessionBefore = app.values.get('dashboard_user_session')
	const hiresBefore = app.values.get('nowe_zatrudnienia_dane')
	const current = app.auth.syncCurrentUserFromSession()
	assert.equal(current.id, owner.id)
	assert.equal(current.profileTitle, 'DEV')
	assert.equal(app.auth.getRoleLabel(current.role), 'DEV')
	assert.equal(app.auth.isCurrentUserAdmin(), true)
	assert.equal(app.auth.hasPermission('it_support'), true)
	const [stored] = app.read('dashboard_users')
	assert.deepEqual({ ...stored, profileTitle: owner.profileTitle, updatedAt: owner.updatedAt }, owner)
	assert.equal(app.read('dashboard_users').length, 1)
	assert.ok(app.values.has(marker))
	assert.equal(app.values.get('dashboard_user_session'), sessionBefore)
	assert.equal(app.values.get('nowe_zatrudnienia_dane'), hiresBefore)
	assert.equal(app.values.get('dashboard-theme::user::owner'), 'blush')
	assert.deepEqual(app.read('dashboard_user_bookmarks'), [{ id: 'mine', userId: owner.id }])
	assert.deepEqual(app.read('dashboard_notes_entries'), [{ id: 'note', authorId: '', body: 'Keep this note' }])
	assert.deepEqual(app.read('dashboardit.react.session.users').map(user => user.id), [owner.id])
	assert.equal(app.read('dashboardit.react.session.users')[0].passwordHash, undefined)
	assert.equal(app.values.has('dashboardit.react.session.active-user'), false)
})

test('a completed cleanup preserves subsequently created accounts and profile changes', () => {
	const app = createApp()
	app.auth.syncCurrentUserFromSession()
	const storedOwner = { ...app.read('dashboard_users')[0], profileTitle: 'Custom title' }
	app.values.set('dashboard_users', JSON.stringify([storedOwner, colleague]))
	app.auth.syncCurrentUserFromSession()
	assert.equal(app.read('dashboard_users').length, 2)
	assert.equal(app.auth.getCurrentUser().profileTitle, 'Custom title')
})

test('a signed-out owner can still log in with the existing password and trigger cleanup', () => {
	const app = createApp({ session: null })
	app.auth.syncCurrentUserFromSession()
	assert.equal(app.read('dashboard_users').length, 3)
	const loggedIn = app.auth.login({ login: owner.login, password: 'fixture-password' })
	assert.equal(loggedIn.profileTitle, 'DEV')
	assert.equal(app.read('dashboard_users').length, 1)
	assert.equal(app.auth.getCurrentUser().profileTitle, 'DEV')
	app.auth.logout()
	app.auth.login({ login: owner.login, password: 'fixture-password' })
	assert.equal(app.auth.getCurrentUser().id, owner.id)
})

for (const [name, options] of [
	['another employee', { session: colleague.id }],
	['another administrator', { session: otherAdmin.id }],
	['a remote backend', { remote: true }],
	['a disabled browser fallback', { fallback: false }],
	['ambiguous owner names', { users: [owner, { ...owner, id: 'duplicate', login: 'duplicate' }, colleague] }],
]) {
	test(`does not delete accounts for ${name}`, () => {
		const app = createApp(options)
		const before = app.values.get('dashboard_users')
		app.auth.syncCurrentUserFromSession()
		assert.equal(app.values.get('dashboard_users'), before)
		assert.equal(app.values.has(marker), false)
	})
}

test('cleanup can be disabled by runtime configuration', () => {
	const app = createApp()
	vm.runInContext("window.DashboardRuntimeConfig.oneTimeAccountCleanup.version = ''", app.context)
	app.auth.syncCurrentUserFromSession()
	assert.equal(app.read('dashboard_users').length, 3)
	assert.equal(app.values.has(marker), false)
})

test('replaces an invalid React directory cache without blocking cleanup', () => {
	const app = createApp()
	app.values.set('dashboardit.react.session.users', '{invalid')
	app.auth.syncCurrentUserFromSession()
	assert.equal(app.read('dashboard_users').length, 1)
	assert.deepEqual(app.read('dashboardit.react.session.users').map(user => user.id), [owner.id])
})

for (const failKey of ['dashboard_users', 'dashboardit.react.session.users', marker]) {
	test(`rolls back account storage after a failed write to ${failKey}`, () => {
		const app = createApp({ failKey })
		const before = new Map(app.values)
		app.auth.syncCurrentUserFromSession()
		assert.deepEqual(app.values, before)
		assert.equal(app.values.has(marker), false)
		assert.equal(app.auth.getCurrentUser().id, owner.id)
		app.auth.syncCurrentUserFromSession()
		assert.equal(app.read('dashboard_users').length, 1)
		assert.ok(app.values.has(marker))
	})
}

test('local login shows password reset before the directory has been loaded', () => {
	const app = createApp({ session: null })
	const hidden = vm.runInContext(`
		authState.authModal = { dataset: {} };
		authState.authForm = {};
		authState.authResetBtn = { hidden: true };
		updateAuthMode('login');
		authState.authResetBtn.hidden;
	`, app.context)
	assert.equal(hidden, false)
})

test('local password reset remains available when no accounts are cached', () => {
	const app = createApp({ users: [], session: null })
	const hidden = vm.runInContext(`
		authState.authModal = { dataset: {} };
		authState.authForm = {};
		authState.authResetBtn = { hidden: true };
		updateAuthMode('login');
		authState.authResetBtn.hidden;
	`, app.context)
	assert.equal(hidden, false)
})

test('remote login keeps the local reset button hidden', () => {
	const app = createApp({ remote: true, session: null })
	const hidden = vm.runInContext(`
		authState.authModal = { dataset: {} };
		authState.authForm = {};
		authState.authResetBtn = { hidden: false };
		updateAuthMode('login');
		authState.authResetBtn.hidden;
	`, app.context)
	assert.equal(hidden, true)
	assert.throws(() => app.auth.resetPassword({ login: owner.login, password: 'new-fixture-password' }), /trybie serwerowym/)
})

test('reset reads current accounts without prior login and preserves the profile and other accounts', () => {
	const app = createApp({ session: null })
	app.values.set(marker, 'completed')
	const dataBefore = new Map([...app.values].filter(([key]) => !['dashboard_users', 'dashboard_user_session'].includes(key)))
	const resetUser = app.auth.resetPassword({ login: owner.login.toUpperCase(), password: 'new-fixture-password' })
	assert.equal(resetUser.id, owner.id)
	assert.equal(resetUser.avatarImage, owner.avatarImage)
	assert.equal(resetUser.profileTitle, owner.profileTitle)
	assert.equal(resetUser.profileBio, owner.profileBio)
	assert.equal(app.auth.getRoleLabel(resetUser.role), 'DEV')
	assert.equal(app.read('dashboard_users').length, 3)
	assert.equal(app.read('dashboard_users').find(user => user.id === colleague.id).passwordHash, colleague.passwordHash)
	assert.deepEqual(new Map([...app.values].filter(([key]) => !['dashboard_users', 'dashboard_user_session'].includes(key))), dataBefore)
	app.auth.logout({ silent: true })
	assert.throws(() => app.auth.login({ login: owner.login, password: 'fixture-password' }), /Nieprawidłowy/)
	assert.equal(app.auth.login({ login: owner.login, password: 'new-fixture-password' }).id, owner.id)
})

test('an unknown login does not change any accounts or create a session', () => {
	const app = createApp({ session: null })
	const before = new Map(app.values)
	assert.throws(() => app.auth.resetPassword({ login: 'missing', password: 'new-fixture-password' }), /Nie znaleziono/)
	assert.deepEqual(app.values, before)
})

test('an invalid new password leaves credentials unchanged', () => {
	const app = createApp({ session: null })
	const before = new Map(app.values)
	assert.throws(() => app.auth.resetPassword({ login: owner.login, password: 'short' }), /co najmniej 8/)
	assert.deepEqual(app.values, before)
})

test('a failed password write does not report success or log the user in', () => {
	const app = createApp({ session: null })
	const before = new Map(app.values)
	vm.runInContext('window.AppServices.usersService.saveAll = () => {}', app.context)
	assert.throws(() => app.auth.resetPassword({ login: owner.login, password: 'new-fixture-password' }), /Nie udało się zapisać/)
	assert.deepEqual(app.values, before)
	assert.equal(app.auth.getCurrentUser(), null)
})
