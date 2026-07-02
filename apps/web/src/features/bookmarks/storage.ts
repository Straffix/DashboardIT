import { BOOKMARKS_LEGACY_STORAGE_KEY, BOOKMARKS_REACT_STORAGE_KEY } from './constants'
import type { BookmarkDraft, BookmarkRecord } from './types'
import { createBookmarkRecord, dedupeBookmarks, normalizeBookmarkRecord, sortBookmarks } from './utils'

function ensureWindow() {
	return typeof window !== 'undefined'
}

function readRawBookmarks(storageKey: string) {
	if (!ensureWindow()) return null

	const rawValue = window.localStorage.getItem(storageKey)
	if (!rawValue) return null

	try {
		const parsedValue = JSON.parse(rawValue) as unknown
		return Array.isArray(parsedValue) ? parsedValue : null
	} catch {
		return null
	}
}

function writeBookmarks(records: BookmarkRecord[]) {
	if (!ensureWindow()) return

	window.localStorage.setItem(BOOKMARKS_REACT_STORAGE_KEY, JSON.stringify(records))
}

function readAllBookmarks() {
	if (!ensureWindow()) return []

	const reactBookmarks = readRawBookmarks(BOOKMARKS_REACT_STORAGE_KEY)
	if (reactBookmarks) {
		return sortBookmarks(dedupeBookmarks(reactBookmarks.map(record => normalizeBookmarkRecord(record))))
	}

	const legacyBookmarks = readRawBookmarks(BOOKMARKS_LEGACY_STORAGE_KEY)
	if (legacyBookmarks) {
		const normalizedBookmarks = sortBookmarks(dedupeBookmarks(legacyBookmarks.map(record => normalizeBookmarkRecord(record))))
		writeBookmarks(normalizedBookmarks)
		return normalizedBookmarks
	}

	writeBookmarks([])
	return []
}

export async function readBookmarksForUser(userId: string) {
	const normalizedUserId = String(userId || '').trim()
	if (!normalizedUserId) return []

	return readAllBookmarks().filter(bookmark => bookmark.userId === normalizedUserId)
}

export async function createBookmark(userId: string, draft: BookmarkDraft) {
	const normalizedUserId = String(userId || '').trim()
	if (!normalizedUserId) {
		throw new Error('Wybierz osobe robocza, aby dodawac zakladki.')
	}

	const bookmarks = readAllBookmarks()
	const nextBookmark = createBookmarkRecord(normalizedUserId, draft)
	const nextBookmarks = sortBookmarks([nextBookmark, ...bookmarks])
	writeBookmarks(nextBookmarks)
	return nextBookmark
}

export async function updateBookmark(bookmarkId: string, draft: BookmarkDraft) {
	const bookmarks = readAllBookmarks()
	const existingBookmark = bookmarks.find(bookmark => bookmark.id === bookmarkId)
	if (!existingBookmark) {
		throw new Error('Nie znaleziono zakladki do aktualizacji.')
	}

	const nextBookmark = createBookmarkRecord(existingBookmark.userId, draft, existingBookmark)
	const nextBookmarks = sortBookmarks(bookmarks.map(bookmark => (bookmark.id === bookmarkId ? nextBookmark : bookmark)))
	writeBookmarks(nextBookmarks)
	return nextBookmark
}

export async function deleteBookmark(bookmarkId: string) {
	const bookmarks = readAllBookmarks()
	const nextBookmarks = bookmarks.filter(bookmark => bookmark.id !== bookmarkId)
	writeBookmarks(nextBookmarks)

	return {
		id: bookmarkId,
		success: true,
	}
}
