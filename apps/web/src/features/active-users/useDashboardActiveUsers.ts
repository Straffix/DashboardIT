import { useEffect, useState } from 'react'

import type { AppSessionUser } from '../session/types'

import type { DashboardActiveUserRecord } from './types'
import {
	DASHBOARD_ACTIVE_USERS_HEARTBEAT_MS,
	DASHBOARD_ACTIVE_USERS_STORAGE_KEY,
	dedupeDashboardActiveUserRecords,
	getOrCreateDashboardActiveUsersTabId,
	normalizeDashboardActiveUserRecord,
	normalizeOptionalDataUrl,
	normalizeProfileAccentColor,
} from './utils'

function ensureWindow() {
	return typeof window !== 'undefined'
}

function readActiveUserRecords() {
	if (!ensureWindow()) return [] as DashboardActiveUserRecord[]

	try {
		const rawValue = window.localStorage.getItem(DASHBOARD_ACTIVE_USERS_STORAGE_KEY)
		if (!rawValue) return []

		const parsedValue = JSON.parse(rawValue) as unknown
		if (!Array.isArray(parsedValue)) return []

		return parsedValue
			.map(record => normalizeDashboardActiveUserRecord(record))
			.filter((record): record is DashboardActiveUserRecord => Boolean(record))
	} catch {
		return []
	}
}

function writeActiveUserRecords(records: DashboardActiveUserRecord[]) {
	if (!ensureWindow()) return
	window.localStorage.setItem(DASHBOARD_ACTIVE_USERS_STORAGE_KEY, JSON.stringify(records))
}

function removeCurrentTabPresence(tabId: string) {
	const nextRecords = readActiveUserRecords().filter(record => record.tabId !== tabId)
	writeActiveUserRecords(nextRecords)
	return dedupeDashboardActiveUserRecords(nextRecords)
}

export function useDashboardActiveUsers(activeUser: AppSessionUser | null) {
	const [tabId] = useState(() => getOrCreateDashboardActiveUsersTabId())
	const [activeUsers, setActiveUsers] = useState<DashboardActiveUserRecord[]>([])

	useEffect(() => {
		if (!ensureWindow()) return

		const syncPresence = () => {
			const nextRecords = readActiveUserRecords().filter(record => record.tabId !== tabId)

			if (activeUser && !document.hidden) {
				nextRecords.push({
					tabId,
					userId: activeUser.id,
					login: activeUser.login,
					fullName: activeUser.fullName,
					role: activeUser.role,
					lastSeenAt: new Date().toISOString(),
					avatarId: String(activeUser.avatarId || '').trim() || 'blue',
					avatarImage: normalizeOptionalDataUrl(activeUser.avatarImage),
					profileAccentColor: normalizeProfileAccentColor(activeUser.profileAccentColor),
					profileCoverImage: normalizeOptionalDataUrl(activeUser.profileCoverImage),
					profileTitle: String(activeUser.profileTitle || '').trim(),
				})
			}

			writeActiveUserRecords(nextRecords)
			setActiveUsers(dedupeDashboardActiveUserRecords(nextRecords))
		}

		const refreshPresence = () => {
			setActiveUsers(dedupeDashboardActiveUserRecords(readActiveUserRecords()))
		}

		const clearPresence = (shouldUpdateState: boolean) => {
			const nextUsers = removeCurrentTabPresence(tabId)
			if (shouldUpdateState) {
				setActiveUsers(nextUsers)
			}
		}

		const handleVisibilityChange = () => {
			if (document.hidden) {
				clearPresence(true)
				return
			}

			syncPresence()
		}

		const handleStorage = (event: StorageEvent) => {
			if (String(event.key || '') !== DASHBOARD_ACTIVE_USERS_STORAGE_KEY) return
			refreshPresence()
		}

		const handleBeforeUnload = () => {
			clearPresence(false)
		}

		syncPresence()

		const heartbeatId = window.setInterval(() => {
			if (document.hidden) return
			syncPresence()
		}, DASHBOARD_ACTIVE_USERS_HEARTBEAT_MS)

		window.addEventListener('storage', handleStorage)
		window.addEventListener('beforeunload', handleBeforeUnload)
		document.addEventListener('visibilitychange', handleVisibilityChange)

		return () => {
			window.clearInterval(heartbeatId)
			window.removeEventListener('storage', handleStorage)
			window.removeEventListener('beforeunload', handleBeforeUnload)
			document.removeEventListener('visibilitychange', handleVisibilityChange)
			clearPresence(false)
		}
	}, [activeUser, tabId])

	return activeUsers
}
