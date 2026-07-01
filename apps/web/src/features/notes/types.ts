import type { AppSessionUser } from '../session/types'

export type NotesMessage = {
	id: string
	content: string
	authorId: string
	createdAt: string
	updatedAt: string
	isPinned: boolean
	pinnedAt: string
	pinnedBy: string
}

export type NotesActor = AppSessionUser

export type NotesViewerRecord = {
	tabId: string
	userId: string
	login: string
	fullName: string
	lastSeenAt: string
}
