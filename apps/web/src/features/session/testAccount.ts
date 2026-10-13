import '../../../../../js/shared/test-account.js'

import type { AppSessionUser } from './types'

type TestAccount = AppSessionUser & { password: string; createdAt: string }

declare global {
	interface Window {
		DashboardTestAccount?: TestAccount
	}
}

export function getTestAccount() {
	return typeof window === 'undefined' ? undefined : window.DashboardTestAccount
}

export function withTestAccount(users: AppSessionUser[]) {
	const account = getTestAccount()
	if (!account) return users

	const { password: _password, createdAt: _createdAt, ...profile } = account
	const storedUser = users.find(user => user.id === account.id)
	return [
		...users.filter(user => user.id !== account.id),
		{ ...profile, ...storedUser, id: account.id, login: account.login, role: account.role },
	]
}

export function validateTestAccountLogin(login: string, password: string) {
	const account = getTestAccount()
	if (!account || login.trim().toLowerCase() !== account.login || password !== account.password) {
		throw new Error('Nieprawidłowy login lub hasło konta testowego.')
	}
	return account.id
}
