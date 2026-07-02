import type { DashboardActiveUserRecord } from './types'

export const DASHBOARD_ACTIVE_USERS_STORAGE_KEY = 'dashboard_active_users'
export const DASHBOARD_ACTIVE_USERS_TAB_ID_KEY = 'dashboardit.react.active-users.tab-id'
export const DASHBOARD_ACTIVE_USERS_TTL_MS = 45_000
export const DASHBOARD_ACTIVE_USERS_HEARTBEAT_MS = 10_000

function getTimestamp(value: string) {
	const parsedValue = Date.parse(value)
	return Number.isFinite(parsedValue) ? parsedValue : 0
}

export function normalizeProfileAccentColor(value: unknown) {
	const normalizedValue = String(value || '')
		.trim()
		.toLowerCase()

	return /^#[0-9a-f]{6}$/.test(normalizedValue) ? normalizedValue : '#c8102e'
}

export function normalizeOptionalDataUrl(value: unknown) {
	const normalizedValue = String(value || '').trim()
	return /^data:image\/(?:png|jpe?g|webp|gif);base64,/i.test(normalizedValue) ? normalizedValue : ''
}

export function normalizeDashboardActiveUserRecord(record: unknown): DashboardActiveUserRecord | null {
	const source = record && typeof record === 'object' ? (record as Partial<DashboardActiveUserRecord>) : {}
	const userId = String(source.userId || '').trim()
	const tabId = String(source.tabId || '').trim()

	if (!userId || !tabId) return null

	return {
		tabId,
		userId,
		login: String(source.login || '').trim(),
		fullName: String(source.fullName || '').trim() || `Konto ${userId}`,
		role: source.role === 'admin' ? 'admin' : 'user',
		lastSeenAt: String(source.lastSeenAt || new Date().toISOString()),
		avatarId: String(source.avatarId || '').trim() || 'blue',
		avatarImage: normalizeOptionalDataUrl(source.avatarImage),
		profileAccentColor: normalizeProfileAccentColor(source.profileAccentColor),
		profileCoverImage: normalizeOptionalDataUrl(source.profileCoverImage),
		profileTitle: String(source.profileTitle || '').trim(),
	}
}

export function getFreshDashboardActiveUserRecords(records: DashboardActiveUserRecord[]) {
	const now = Date.now()

	return records
		.filter(record => now - getTimestamp(record.lastSeenAt) <= DASHBOARD_ACTIVE_USERS_TTL_MS)
		.sort((leftRecord, rightRecord) => leftRecord.fullName.localeCompare(rightRecord.fullName, 'pl'))
}

export function dedupeDashboardActiveUserRecords(records: DashboardActiveUserRecord[]) {
	return Array.from(
		new Map(
			getFreshDashboardActiveUserRecords(records).map(record => [record.userId, record] as const)
		).values()
	)
}

export function getOrCreateDashboardActiveUsersTabId() {
	if (typeof window === 'undefined') {
		return 'dashboard-active-users-ssr'
	}

	try {
		const existingId = window.sessionStorage.getItem(DASHBOARD_ACTIVE_USERS_TAB_ID_KEY)
		if (existingId) return existingId

		const nextId =
			typeof window.crypto?.randomUUID === 'function'
				? window.crypto.randomUUID()
				: `dashboard-active-users-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`

		window.sessionStorage.setItem(DASHBOARD_ACTIVE_USERS_TAB_ID_KEY, nextId)
		return nextId
	} catch {
		return `dashboard-active-users-${Date.now()}`
	}
}

export function getRoleLabel(role: 'admin' | 'user') {
	return role === 'admin' ? 'Lider' : 'Pracownik'
}

export function getUserInitials(fullName: string) {
	const parts = String(fullName || '')
		.trim()
		.split(/\s+/)
		.filter(Boolean)

	if (parts.length === 0) return '?'
	if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
	return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase()
}

export function formatPresenceTimeLabel(value: string) {
	const parsedValue = new Date(value)
	if (Number.isNaN(parsedValue.getTime())) return '--'

	return new Intl.DateTimeFormat('pl-PL', {
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit',
	}).format(parsedValue)
}
