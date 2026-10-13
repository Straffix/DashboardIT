// Public demonstration account. These credentials do not protect application data.
;(function defineTestAccount() {
	if (typeof window === 'undefined') return

	window.DashboardTestAccount = Object.freeze({
		id: 'dashboard-test-account',
		fullName: 'Konto testowe',
		login: 'tester',
		password: 'test123',
		role: 'admin',
		avatarId: 'blue',
		profileTitle: 'TEST',
		bookmarkDefaultColor: '#94a3b8',
		profileAccentColor: '#c8102e',
		createdAt: '2026-10-13T00:00:00.000Z',
	})
})()
