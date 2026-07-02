import type { PropsWithChildren } from 'react'
import { createContext, useContext, useEffect, useMemo, useState } from 'react'

import { demoUsers } from './demoUsers'
import type { AppSessionUser } from './types'

const ACTIVE_USER_STORAGE_KEY = 'dashboardit.react.session.active-user'
const USERS_STORAGE_KEY = 'dashboardit.react.session.users'
const LEGACY_USERS_STORAGE_KEY = 'dashboard_users'
const LEGACY_SESSION_STORAGE_KEY = 'dashboard_user_session'
const DEFAULT_BOOKMARK_COLOR = '#94a3b8'
const DEFAULT_PROFILE_ACCENT = '#c8102e'

function ensureWindow() {
	return typeof window !== 'undefined'
}

function normalizeBookmarkDefaultColor(value: unknown) {
	const normalizedValue = String(value || '')
		.trim()
		.toLowerCase()

	return /^#[0-9a-f]{6}$/.test(normalizedValue) ? normalizedValue : DEFAULT_BOOKMARK_COLOR
}

function normalizeProfileAccentColor(value: unknown) {
	const normalizedValue = String(value || '')
		.trim()
		.toLowerCase()

	return /^#[0-9a-f]{6}$/.test(normalizedValue) ? normalizedValue : DEFAULT_PROFILE_ACCENT
}

function normalizeOptionalDataUrl(value: unknown) {
	const normalizedValue = String(value || '').trim()
	return /^data:image\/(?:png|jpe?g|webp|gif);base64,/i.test(normalizedValue) ? normalizedValue : ''
}

function normalizeSessionUser(record: unknown): AppSessionUser | null {
	const source = record && typeof record === 'object' ? (record as Partial<AppSessionUser>) : {}
	const id = String(source.id || '').trim()
	const fullName = String(source.fullName || '').trim()
	const login = String(source.login || '').trim()

	if (!id || !fullName || !login) return null

	return {
		id,
		fullName,
		login,
		role: source.role === 'admin' ? 'admin' : 'user',
		bookmarkDefaultColor: normalizeBookmarkDefaultColor(source.bookmarkDefaultColor),
		avatarId: String(source.avatarId || '').trim() || 'blue',
		avatarImage: normalizeOptionalDataUrl(source.avatarImage),
		profileAccentColor: normalizeProfileAccentColor(source.profileAccentColor),
		profileCoverImage: normalizeOptionalDataUrl(source.profileCoverImage),
		profileTitle: String(source.profileTitle || '').trim(),
	}
}

function readBrowserJsonValue<T>(key: string, fallback: T) {
	if (!ensureWindow()) return fallback

	try {
		const rawValue = window.localStorage.getItem(key)
		if (!rawValue) return fallback

		return JSON.parse(rawValue) as T
	} catch {
		return fallback
	}
}

function writeBrowserJsonValue<T>(key: string, value: T) {
	if (!ensureWindow()) return

	try {
		window.localStorage.setItem(key, JSON.stringify(value))
	} catch {
		// Ignore storage write failures and keep the app usable.
	}
}

function readStoredUsers() {
	const storedUsers = readBrowserJsonValue<unknown[]>(USERS_STORAGE_KEY, [])
	const normalizedStoredUsers = storedUsers.map(record => normalizeSessionUser(record)).filter(Boolean) as AppSessionUser[]
	if (normalizedStoredUsers.length > 0) {
		return normalizedStoredUsers
	}

	const legacyUsers = readBrowserJsonValue<unknown[]>(LEGACY_USERS_STORAGE_KEY, [])
	const normalizedLegacyUsers = legacyUsers.map(record => normalizeSessionUser(record)).filter(Boolean) as AppSessionUser[]
	if (normalizedLegacyUsers.length > 0) {
		writeBrowserJsonValue(USERS_STORAGE_KEY, normalizedLegacyUsers)
		return normalizedLegacyUsers
	}

	return demoUsers
}

function readStoredActiveUserId() {
	if (!ensureWindow()) return ''

	const storedActiveUserId = window.localStorage.getItem(ACTIVE_USER_STORAGE_KEY) || ''
	if (storedActiveUserId) {
		return storedActiveUserId
	}

	const legacySession = readBrowserJsonValue<{ userId?: string } | null>(LEGACY_SESSION_STORAGE_KEY, null)
	return String(legacySession?.userId || '').trim()
}

type AppSessionContextValue = {
	activeUser: AppSessionUser | null
	activeUserId: string
	users: AppSessionUser[]
	setActiveUserId: (userId: string) => void
	clearActiveUser: () => void
	setUserBookmarkDefaultColor: (userId: string, colorHex: string) => void
}

const AppSessionContext = createContext<AppSessionContextValue | null>(null)

export function AppSessionProvider({ children }: PropsWithChildren) {
	const [users, setUsers] = useState<AppSessionUser[]>(() => readStoredUsers())
	const [activeUserId, setActiveUserIdState] = useState(() => readStoredActiveUserId())

	useEffect(() => {
		if (!ensureWindow()) return

		const handleStorage = (event: StorageEvent) => {
			const storageKey = String(event.key || '')
			if ([USERS_STORAGE_KEY, LEGACY_USERS_STORAGE_KEY].includes(storageKey)) {
				setUsers(readStoredUsers())
			}

			if ([ACTIVE_USER_STORAGE_KEY, LEGACY_SESSION_STORAGE_KEY].includes(storageKey)) {
				setActiveUserIdState(readStoredActiveUserId())
			}
		}

		window.addEventListener('storage', handleStorage)
		return () => {
			window.removeEventListener('storage', handleStorage)
		}
	}, [])

	const setActiveUserId = (userId: string) => {
		const normalizedUserId = String(userId || '').trim()
		const hasMatchingUser = users.some(user => user.id === normalizedUserId)
		const nextUserId = hasMatchingUser ? normalizedUserId : ''

		setActiveUserIdState(nextUserId)
		if (!ensureWindow()) return

		if (nextUserId) {
			window.localStorage.setItem(ACTIVE_USER_STORAGE_KEY, nextUserId)
		} else {
			window.localStorage.removeItem(ACTIVE_USER_STORAGE_KEY)
		}
	}

	const clearActiveUser = () => {
		setActiveUserIdState('')
		if (!ensureWindow()) return

		window.localStorage.removeItem(ACTIVE_USER_STORAGE_KEY)
	}

	const setUserBookmarkDefaultColor = (userId: string, colorHex: string) => {
		const normalizedUserId = String(userId || '').trim()
		if (!normalizedUserId) return

		setUsers(currentUsers => {
			const nextUsers = currentUsers.map(user =>
				user.id === normalizedUserId
					? {
							...user,
							bookmarkDefaultColor: normalizeBookmarkDefaultColor(colorHex),
						}
					: user
			)

			writeBrowserJsonValue(USERS_STORAGE_KEY, nextUsers)
			return nextUsers
		})
	}

	const activeUser = useMemo(() => users.find(user => user.id === activeUserId) || null, [activeUserId, users])

	return (
		<AppSessionContext.Provider
			value={{
				activeUser,
				activeUserId,
				users,
				setActiveUserId,
				clearActiveUser,
				setUserBookmarkDefaultColor,
			}}>
			{children}
		</AppSessionContext.Provider>
	)
}

export function useAppSession() {
	const context = useContext(AppSessionContext)
	if (!context) {
		throw new Error('useAppSession must be used within AppSessionProvider.')
	}

	return context
}
