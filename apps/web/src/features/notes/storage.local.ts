import type { NotesActor, NotesMessage } from './types'
import {
	dedupeNotesMessages,
	NOTES_LEGACY_STORAGE_KEY,
	NOTES_REACT_STORAGE_KEY,
	normalizeNotesMessage,
	sortNotesMessages,
} from './utils'

const demoMessages: NotesMessage[] = sortNotesMessages([
	{
		id: 'note-message-1',
		content: 'Dzis po 12:00 odswiezam zapas laptopow po ostatnich onboardingach.',
		authorId: 'lunch-user-1',
		createdAt: '2026-06-29T07:40:00.000Z',
		updatedAt: '2026-06-29T07:40:00.000Z',
		isPinned: true,
		pinnedAt: '2026-06-29T07:42:00.000Z',
		pinnedBy: 'lunch-user-1',
	},
	{
		id: 'note-message-2',
		content: 'Jutro o 9:30 test drukarki w salce 4A. Dajcie znac, jesli cos jeszcze trzeba dorzucic.',
		authorId: 'lunch-user-2',
		createdAt: '2026-06-29T08:12:00.000Z',
		updatedAt: '2026-06-29T08:12:00.000Z',
		isPinned: false,
		pinnedAt: '',
		pinnedBy: '',
	},
	{
		id: 'note-message-3',
		content: 'Wymiana dla OPS321 potwierdzona. Sprzet gotowy do wydania w czwartek.',
		authorId: 'lunch-user-3',
		createdAt: '2026-06-29T10:04:00.000Z',
		updatedAt: '2026-06-29T10:04:00.000Z',
		isPinned: true,
		pinnedAt: '2026-06-29T10:08:00.000Z',
		pinnedBy: 'lunch-user-4',
	},
])

function ensureWindow() {
	return typeof window !== 'undefined'
}

function parseStoredMessages(rawValue: string | null) {
	if (!rawValue) return null

	try {
		const parsedValue = JSON.parse(rawValue) as unknown
		if (!Array.isArray(parsedValue)) return null
		return sortNotesMessages(dedupeNotesMessages(parsedValue.map(record => normalizeNotesMessage(record))))
	} catch {
		return null
	}
}

function readMessagesFromStorageKey(storageKey: string) {
	if (!ensureWindow()) return null
	return parseStoredMessages(window.localStorage.getItem(storageKey))
}

function writeNotesMessages(messages: NotesMessage[]) {
	if (!ensureWindow()) return
	window.localStorage.setItem(NOTES_REACT_STORAGE_KEY, JSON.stringify(sortNotesMessages(dedupeNotesMessages(messages))))
}

export async function readNotesMessages() {
	if (!ensureWindow()) return demoMessages

	const reactMessages = readMessagesFromStorageKey(NOTES_REACT_STORAGE_KEY)
	if (reactMessages) {
		return reactMessages
	}

	const legacyMessages = readMessagesFromStorageKey(NOTES_LEGACY_STORAGE_KEY)
	if (legacyMessages) {
		writeNotesMessages(legacyMessages)
		return legacyMessages
	}

	writeNotesMessages(demoMessages)
	return demoMessages
}

export async function createNotesMessage({ content, actor }: { content: string; actor: NotesActor }) {
	const normalizedContent = String(content || '').trim()
	if (!actor?.id) {
		throw new Error('Wybierz osobe robocza, aby wyslac wiadomosc.')
	}

	if (!normalizedContent) {
		throw new Error('Wpisz tresc wiadomosci przed wyslaniem.')
	}

	const messages = await readNotesMessages()
	const now = new Date().toISOString()
	const nextMessage: NotesMessage = {
		id: `note-message-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
		content: normalizedContent,
		authorId: actor.id,
		createdAt: now,
		updatedAt: now,
		isPinned: false,
		pinnedAt: '',
		pinnedBy: '',
	}

	const nextMessages = sortNotesMessages([...messages, nextMessage])
	writeNotesMessages(nextMessages)
	return nextMessage
}

export async function updateNotesMessage({
	messageId,
	content,
	actor,
}: {
	messageId: string
	content: string
	actor: NotesActor
}) {
	const normalizedMessageId = String(messageId || '').trim()
	const normalizedContent = String(content || '').trim()

	if (!normalizedContent) {
		throw new Error('Wiadomosc nie moze byc pusta.')
	}

	const messages = await readNotesMessages()
	const targetMessage = messages.find(message => message.id === normalizedMessageId)
	if (!targetMessage) {
		throw new Error('Nie znaleziono wiadomosci do edycji.')
	}

	if (String(targetMessage.authorId) !== String(actor?.id || '')) {
		throw new Error('Mozesz edytowac tylko swoje wiadomosci.')
	}

	const nextMessage: NotesMessage = {
		...targetMessage,
		content: normalizedContent,
		updatedAt: new Date().toISOString(),
	}

	const nextMessages = sortNotesMessages(
		messages.map(message => (message.id === normalizedMessageId ? nextMessage : message))
	)
	writeNotesMessages(nextMessages)
	return nextMessage
}

export async function deleteNotesMessage({ messageId, actor }: { messageId: string; actor: NotesActor }) {
	const normalizedMessageId = String(messageId || '').trim()
	const messages = await readNotesMessages()
	const targetMessage = messages.find(message => message.id === normalizedMessageId)

	if (!targetMessage) {
		throw new Error('Nie znaleziono wiadomosci do usuniecia.')
	}

	if (String(targetMessage.authorId) !== String(actor?.id || '')) {
		throw new Error('Mozesz usuwac tylko swoje wiadomosci.')
	}

	writeNotesMessages(messages.filter(message => message.id !== normalizedMessageId))
	return targetMessage
}

export async function setNotesMessagePinned({
	messageId,
	isPinned,
	actor,
}: {
	messageId: string
	isPinned: boolean
	actor: NotesActor
}) {
	const normalizedMessageId = String(messageId || '').trim()
	if (!actor?.id) {
		throw new Error('Wybierz osobe robocza, aby przypinac wiadomosci.')
	}

	const messages = await readNotesMessages()
	const targetMessage = messages.find(message => message.id === normalizedMessageId)

	if (!targetMessage) {
		throw new Error('Nie znaleziono wiadomosci do przypiecia.')
	}

	const now = new Date().toISOString()
	const nextMessage: NotesMessage = {
		...targetMessage,
		isPinned: Boolean(isPinned),
		pinnedAt: isPinned ? now : '',
		pinnedBy: isPinned ? actor.id : '',
		updatedAt: now,
	}

	const nextMessages = sortNotesMessages(
		messages.map(message => (message.id === normalizedMessageId ? nextMessage : message))
	)
	writeNotesMessages(nextMessages)
	return nextMessage
}
