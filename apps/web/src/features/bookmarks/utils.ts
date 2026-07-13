import { BOOKMARK_DEFAULT_COLOR, BOOKMARK_ICON_OPTIONS } from './constants'
import type { BookmarkDraft, BookmarkRecord } from './types'

const BOOKMARK_ICON_IDS = new Set(BOOKMARK_ICON_OPTIONS.map(option => option.id).filter(Boolean))

export function normalizeBookmarkColor(value: string | undefined, fallback = BOOKMARK_DEFAULT_COLOR) {
	const normalizedValue = String(value || '')
		.trim()
		.toLowerCase()

	return /^#[0-9a-f]{6}$/.test(normalizedValue) ? normalizedValue : fallback
}

export function normalizeOptionalBookmarkColor(value: string | undefined) {
	const normalizedValue = String(value || '')
		.trim()
		.toLowerCase()

	return /^#[0-9a-f]{6}$/.test(normalizedValue) ? normalizedValue : ''
}

export function normalizeBookmarkIconName(value: string | undefined) {
	const normalizedValue = String(value || '')
		.trim()
		.toLowerCase()

	return BOOKMARK_ICON_IDS.has(normalizedValue) ? normalizedValue : ''
}

export function normalizeBookmarkRecord(record: unknown): BookmarkRecord {
	const source = record && typeof record === 'object' ? (record as Partial<BookmarkRecord>) : {}

	return {
		id: String(source.id || '').trim(),
		userId: String(source.userId || '').trim(),
		label: String(source.label || '').trim(),
		url: String(source.url || '').trim(),
		description: String(source.description || '').trim(),
		colorHex: normalizeOptionalBookmarkColor(source.colorHex),
		iconName: normalizeBookmarkIconName(source.iconName),
		createdAt: String(source.createdAt || new Date().toISOString()),
		updatedAt: String(source.updatedAt || source.createdAt || new Date().toISOString()),
	}
}

export function dedupeBookmarks(records: BookmarkRecord[]) {
	return Array.from(
		new Map(
			records
				.filter(record => record.id && record.userId && record.label && record.url)
				.map(record => [record.id, record] as const)
		).values()
	)
}

export function sortBookmarks(records: BookmarkRecord[]) {
	return [...records].sort((leftRecord, rightRecord) => {
		const leftTime = Date.parse(leftRecord.updatedAt || leftRecord.createdAt || '') || 0
		const rightTime = Date.parse(rightRecord.updatedAt || rightRecord.createdAt || '') || 0
		if (leftTime !== rightTime) return rightTime - leftTime

		return leftRecord.label.localeCompare(rightRecord.label, 'pl')
	})
}

export function createBookmarkId() {
	return `bookmark-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`
}

export function normalizeLinkTarget(value: string | undefined) {
	const trimmedValue = String(value || '').trim()
	if (!trimmedValue) return ''

	if (/^(https?:|mailto:|tel:|file:|ftp:|ms-excel:|ms-word:|ms-powerpoint:)/i.test(trimmedValue)) {
		return trimmedValue
	}

	if (/^\\\\/.test(trimmedValue)) {
		return `file://${trimmedValue.split('\\').join('/')}`
	}

	if (/^[a-zA-Z]:\\/.test(trimmedValue)) {
		return `file:///${trimmedValue.split('\\').join('/')}`
	}

	return `https://${trimmedValue.replace(/^\/+/, '')}`
}

export function getBookmarkMetaLabel(bookmark: Pick<BookmarkRecord, 'url'>) {
	const normalizedTarget = normalizeLinkTarget(bookmark.url)

	try {
		const parsedUrl = new URL(normalizedTarget)
		if (parsedUrl.protocol === 'file:') {
			return bookmark.url
		}

		return parsedUrl.hostname.replace(/^www\./i, '')
	} catch {
		return bookmark.url
	}
}

export function getBookmarkFaviconSources(bookmark: Pick<BookmarkRecord, 'url'>) {
	const normalizedTarget = normalizeLinkTarget(bookmark.url)

	try {
		const parsedUrl = new URL(normalizedTarget)
		if (!/^https?:$/i.test(parsedUrl.protocol)) {
			return []
		}

		return [
			`https://www.google.com/s2/favicons?domain=${encodeURIComponent(parsedUrl.hostname)}&sz=64`,
			`https://www.google.com/s2/favicons?domain_url=${encodeURIComponent(parsedUrl.origin)}&sz=64`,
			`https://icons.duckduckgo.com/ip3/${parsedUrl.hostname}.ico`,
			`https://icon.horse/icon/${parsedUrl.hostname}`,
			`${parsedUrl.origin}/favicon.ico`,
		]
	} catch {
		return []
	}
}

export function getBookmarkIconOption(iconName: string | undefined) {
	const normalizedIconName = normalizeBookmarkIconName(iconName)
	return BOOKMARK_ICON_OPTIONS.find(option => option.id === normalizedIconName) || BOOKMARK_ICON_OPTIONS[0]
}

export function getBookmarkAccentRgb(colorHex: string) {
	const normalizedColor = normalizeBookmarkColor(colorHex)
	const red = Number.parseInt(normalizedColor.slice(1, 3), 16)
	const green = Number.parseInt(normalizedColor.slice(3, 5), 16)
	const blue = Number.parseInt(normalizedColor.slice(5, 7), 16)
	return `${red}, ${green}, ${blue}`
}

export function applyBookmarkAccentTheme(element: HTMLElement | null, colorHex: string) {
	if (!element) return
	const normalizedColor = normalizeBookmarkColor(colorHex)
	element.style.setProperty('--bookmark-accent', normalizedColor)
	element.style.setProperty('--bookmark-accent-rgb', getBookmarkAccentRgb(normalizedColor))
}

export function getBookmarkDraftDefaults(defaultColor: string): BookmarkDraft {
	return {
		label: '',
		url: '',
		description: '',
		colorHex: normalizeBookmarkColor(defaultColor),
		iconName: '',
	}
}

export function createBookmarkRecord(userId: string, draft: BookmarkDraft, existingBookmark?: BookmarkRecord): BookmarkRecord {
	const now = new Date().toISOString()

	return {
		id: existingBookmark?.id || createBookmarkId(),
		userId: String(userId || '').trim(),
		label: String(draft.label || '').trim(),
		url: String(draft.url || '').trim(),
		description: String(draft.description || '').trim(),
		colorHex: normalizeBookmarkColor(draft.colorHex),
		iconName: normalizeBookmarkIconName(draft.iconName),
		createdAt: existingBookmark?.createdAt || now,
		updatedAt: now,
	}
}

export function validateBookmarkDraft(draft: BookmarkDraft) {
	if (!String(draft.label || '').trim() || !String(draft.url || '').trim()) {
		return 'Wpisz nazwe zakladki i adres lub sciezke.'
	}

	if (!normalizeLinkTarget(draft.url)) {
		return 'Wpisz poprawny adres lub sciezke.'
	}

	return ''
}
