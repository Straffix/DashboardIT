import { useEffect, useState } from 'react'

import type { AppSessionUser } from '../session/types'

import type { NotesViewerRecord } from './types'
import {
	dedupeNotesViewerRecords,
	NOTES_ACTIVE_VIEWERS_STORAGE_KEY,
	NOTES_PRESENCE_HEARTBEAT_MS,
	NOTES_PRESENCE_TAB_ID_KEY,
	normalizeNotesViewerRecord,
} from './utils'

function ensureWindow() {
	return typeof window !== 'undefined'
}

function readViewerRecords() {
	if (!ensureWindow()) return [] as NotesViewerRecord[]

	try {
		const rawValue = window.localStorage.getItem(NOTES_ACTIVE_VIEWERS_STORAGE_KEY)
		if (!rawValue) return []

		const parsedValue = JSON.parse(rawValue) as unknown
		if (!Array.isArray(parsedValue)) return []

		return parsedValue
			.map(record => normalizeNotesViewerRecord(record))
			.filter((record): record is NotesViewerRecord => Boolean(record))
	} catch {
		return []
	}
}

function writeViewerRecords(records: NotesViewerRecord[]) {
	if (!ensureWindow()) return
	window.localStorage.setItem(NOTES_ACTIVE_VIEWERS_STORAGE_KEY, JSON.stringify(records))
}

function getOrCreatePresenceTabId() {
	if (!ensureWindow()) {
		return 'notes-tab-ssr'
	}

	try {
		const existingId = window.sessionStorage.getItem(NOTES_PRESENCE_TAB_ID_KEY)
		if (existingId) return existingId

		const nextId =
			typeof window.crypto?.randomUUID === 'function'
				? window.crypto.randomUUID()
				: `notes-tab-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`

		window.sessionStorage.setItem(NOTES_PRESENCE_TAB_ID_KEY, nextId)
		return nextId
	} catch {
		return `notes-tab-${Date.now()}`
	}
}

function removeCurrentViewer(tabId: string) {
	const nextRecords = readViewerRecords().filter(record => record.tabId !== tabId)
	writeViewerRecords(nextRecords)
	return dedupeNotesViewerRecords(nextRecords)
}

export function useNotesActiveViewers(activeUser: AppSessionUser | null) {
	const [tabId] = useState(() => getOrCreatePresenceTabId())
	const [viewers, setViewers] = useState<NotesViewerRecord[]>([])

	useEffect(() => {
		if (!ensureWindow()) return

		const syncPresence = () => {
			const nextRecords = readViewerRecords().filter(record => record.tabId !== tabId)

			if (activeUser && !document.hidden) {
				nextRecords.push({
					tabId,
					userId: activeUser.id,
					login: activeUser.login,
					fullName: activeUser.fullName,
					lastSeenAt: new Date().toISOString(),
				})
			}

			writeViewerRecords(nextRecords)
			setViewers(dedupeNotesViewerRecords(nextRecords))
		}

		const refreshPresence = () => {
			setViewers(dedupeNotesViewerRecords(readViewerRecords()))
		}

		const clearPresence = (shouldUpdateState: boolean) => {
			const nextViewers = removeCurrentViewer(tabId)
			if (shouldUpdateState) {
				setViewers(nextViewers)
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
			if (String(event.key || '') !== NOTES_ACTIVE_VIEWERS_STORAGE_KEY) return
			refreshPresence()
		}

		const handleBeforeUnload = () => {
			clearPresence(false)
		}

		syncPresence()

		const heartbeatId = window.setInterval(() => {
			if (document.hidden) return
			syncPresence()
		}, NOTES_PRESENCE_HEARTBEAT_MS)

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

	return viewers
}
