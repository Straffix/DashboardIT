import { apiRequest } from '../../lib/http'

import type { NotesActor } from './types'
import { NOTES_LEGACY_STORAGE_KEY, normalizeNotesMessage, sortNotesMessages } from './utils'

type RemoteStorageResponse<T> = {
	ok: boolean
	value: T
}

type RemoteChatMessageResponse = {
	ok: boolean
	chatMessage: unknown
}

export async function readNotesMessages() {
	const response = await apiRequest<RemoteStorageResponse<unknown[]>>('/storage.php', {
		searchParams: { key: NOTES_LEGACY_STORAGE_KEY },
	})

	if (!response.ok) {
		throw new Error('Nie udalo sie pobrac wiadomosci czatu.')
	}

	const rawMessages = Array.isArray(response.value) ? response.value : []
	return sortNotesMessages(rawMessages.map(record => normalizeNotesMessage(record)))
}

export async function createNotesMessage({ content }: { content: string; actor: NotesActor }) {
	const response = await apiRequest<RemoteChatMessageResponse>('/chat-messages.php', {
		body: { content },
		method: 'POST',
	})

	if (!response.ok) {
		throw new Error('Nie udalo sie zapisac wiadomosci na serwerze.')
	}

	return normalizeNotesMessage(response.chatMessage)
}

export async function updateNotesMessage({
	messageId,
	content,
}: {
	messageId: string
	content: string
	actor: NotesActor
}) {
	const response = await apiRequest<RemoteChatMessageResponse>('/chat-messages.php', {
		body: { messageId, content },
		method: 'PATCH',
	})

	if (!response.ok) {
		throw new Error('Nie udalo sie zaktualizowac wiadomosci.')
	}

	return normalizeNotesMessage(response.chatMessage)
}

export async function deleteNotesMessage({ messageId }: { messageId: string; actor: NotesActor }) {
	const response = await apiRequest<RemoteChatMessageResponse>('/chat-messages.php', {
		method: 'DELETE',
		searchParams: { messageId },
	})

	if (!response.ok) {
		throw new Error('Nie udalo sie usunac wiadomosci.')
	}

	return normalizeNotesMessage(response.chatMessage)
}

export async function setNotesMessagePinned({
	messageId,
	isPinned,
}: {
	messageId: string
	isPinned: boolean
	actor: NotesActor
}) {
	const response = await apiRequest<RemoteChatMessageResponse>('/chat-messages.php', {
		body: { messageId, isPinned },
		method: 'PATCH',
	})

	if (!response.ok) {
		throw new Error('Nie udalo sie zmienic przypiecia wiadomosci.')
	}

	return normalizeNotesMessage(response.chatMessage)
}
