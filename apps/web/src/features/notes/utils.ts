import type { AppSessionUser } from '../session/types'

import type { NotesMessage, NotesViewerRecord } from './types'

export const NOTES_REACT_STORAGE_KEY = 'dashboardit.react.notes.entries'
export const NOTES_LEGACY_STORAGE_KEY = 'dashboard_notes_entries'
export const NOTES_ACTIVE_VIEWERS_STORAGE_KEY = 'dashboardit.react.notes.active-viewers'
export const NOTES_PRESENCE_TAB_ID_KEY = 'dashboardit.react.notes.presence-tab-id'
export const NOTES_PRESENCE_TTL_MS = 45_000
export const NOTES_PRESENCE_HEARTBEAT_MS = 10_000
export const NOTES_REFRESH_INTERVAL_MS = 15_000

function getTimestamp(value: string) {
	const parsedValue = Date.parse(value)
	return Number.isFinite(parsedValue) ? parsedValue : 0
}

export function normalizeNotesMessage(record: unknown): NotesMessage {
	const source = record && typeof record === 'object' ? (record as Partial<NotesMessage>) : {}

	return {
		id: String(source.id || ''),
		content: String(source.content || '').trim(),
		authorId: String(source.authorId || ''),
		createdAt: String(source.createdAt || new Date().toISOString()),
		updatedAt: String(source.updatedAt || source.createdAt || new Date().toISOString()),
		isPinned: Boolean(source.isPinned),
		pinnedAt: String(source.pinnedAt || ''),
		pinnedBy: String(source.pinnedBy || ''),
	}
}

export function normalizeNotesViewerRecord(record: unknown): NotesViewerRecord | null {
	const source = record && typeof record === 'object' ? (record as Partial<NotesViewerRecord>) : {}
	const userId = String(source.userId || '').trim()
	const tabId = String(source.tabId || '').trim()

	if (!userId || !tabId) return null

	return {
		tabId,
		userId,
		login: String(source.login || '').trim(),
		fullName: String(source.fullName || '').trim() || `Konto ${userId}`,
		lastSeenAt: String(source.lastSeenAt || new Date().toISOString()),
	}
}

export function dedupeNotesMessages(messages: NotesMessage[]) {
	return Array.from(new Map(messages.filter(message => message.id).map(message => [message.id, message] as const)).values())
}

export function sortNotesMessages(messages: NotesMessage[]) {
	return [...messages].sort((leftMessage, rightMessage) => {
		const createdDiff = getTimestamp(leftMessage.createdAt) - getTimestamp(rightMessage.createdAt)
		if (createdDiff !== 0) return createdDiff

		const updatedDiff = getTimestamp(leftMessage.updatedAt) - getTimestamp(rightMessage.updatedAt)
		if (updatedDiff !== 0) return updatedDiff

		return leftMessage.id.localeCompare(rightMessage.id, 'pl')
	})
}

export function getPinnedNotesMessages(messages: NotesMessage[]) {
	return [...messages]
		.filter(message => message.isPinned)
		.sort((leftMessage, rightMessage) => {
			const pinnedDiff = getTimestamp(rightMessage.pinnedAt) - getTimestamp(leftMessage.pinnedAt)
			if (pinnedDiff !== 0) return pinnedDiff

			return getTimestamp(rightMessage.updatedAt) - getTimestamp(leftMessage.updatedAt)
		})
}

export function formatNotesDateTimeLabel(value: string) {
	const parsedValue = new Date(value)
	if (Number.isNaN(parsedValue.getTime())) return '--'

	const now = new Date()
	const isSameDay =
		now.getFullYear() === parsedValue.getFullYear() &&
		now.getMonth() === parsedValue.getMonth() &&
		now.getDate() === parsedValue.getDate()

	return new Intl.DateTimeFormat('pl-PL', {
		day: isSameDay ? undefined : '2-digit',
		month: isSameDay ? undefined : '2-digit',
		hour: '2-digit',
		minute: '2-digit',
	}).format(parsedValue)
}

export function getLatestNotesUpdateLabel(messages: NotesMessage[]) {
	const latestMessage = [...messages].sort(
		(leftMessage, rightMessage) => getTimestamp(rightMessage.updatedAt) - getTimestamp(leftMessage.updatedAt)
	)[0]

	return latestMessage ? formatNotesDateTimeLabel(latestMessage.updatedAt) : '--'
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

export function canManageNotesMessage(message: NotesMessage, actor: AppSessionUser | null) {
	return Boolean(message.id && actor?.id && String(message.authorId) === String(actor.id))
}

export function resolveNotesAuthor(message: NotesMessage, users: AppSessionUser[]) {
	const matchedUser = users.find(user => String(user.id) === String(message.authorId))
	if (matchedUser) {
		return {
			fullName: matchedUser.fullName,
			login: matchedUser.login,
		}
	}

	const authorId = String(message.authorId || '').trim()
	return {
		fullName: authorId ? `Konto ${authorId}` : 'Czlonek zespolu',
		login: authorId || 'konto',
	}
}

export function getFreshNotesViewerRecords(records: NotesViewerRecord[]) {
	const now = Date.now()

	return records
		.filter(record => now - getTimestamp(record.lastSeenAt) <= NOTES_PRESENCE_TTL_MS)
		.sort((leftRecord, rightRecord) => leftRecord.fullName.localeCompare(rightRecord.fullName, 'pl'))
}

export function dedupeNotesViewerRecords(records: NotesViewerRecord[]) {
	return Array.from(
		new Map(
			getFreshNotesViewerRecords(records).map(record => [record.userId, record] as const)
		).values()
	)
}
