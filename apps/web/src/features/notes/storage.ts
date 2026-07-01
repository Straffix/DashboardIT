import { getAppDataSourceMode } from '../../config/dataSource'

import * as apiNotesStorage from './storage.api'
import * as localNotesStorage from './storage.local'

type NotesStorageModule = Pick<
	typeof localNotesStorage,
	'createNotesMessage' | 'deleteNotesMessage' | 'readNotesMessages' | 'setNotesMessagePinned' | 'updateNotesMessage'
>

const notesStorage: NotesStorageModule = getAppDataSourceMode() === 'api' ? apiNotesStorage : localNotesStorage

export const readNotesMessages = () => notesStorage.readNotesMessages()

export const createNotesMessage = (input: Parameters<NotesStorageModule['createNotesMessage']>[0]) =>
	notesStorage.createNotesMessage(input)

export const updateNotesMessage = (input: Parameters<NotesStorageModule['updateNotesMessage']>[0]) =>
	notesStorage.updateNotesMessage(input)

export const deleteNotesMessage = (input: Parameters<NotesStorageModule['deleteNotesMessage']>[0]) =>
	notesStorage.deleteNotesMessage(input)

export const setNotesMessagePinned = (input: Parameters<NotesStorageModule['setNotesMessagePinned']>[0]) =>
	notesStorage.setNotesMessagePinned(input)
