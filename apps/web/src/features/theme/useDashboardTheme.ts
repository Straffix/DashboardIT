import { useEffect, useState } from 'react'

export type DashboardTheme = 'light' | 'dark' | 'blush'

const LEGACY_THEME_KEY = 'dashboard-theme'
const LEGACY_THEME_FALLBACK_KEY = `${LEGACY_THEME_KEY}-fallback`
const THEME_GUEST_KEY = `${LEGACY_THEME_KEY}::guest`
const THEME_USER_KEY_PREFIX = `${LEGACY_THEME_KEY}::user::`
const THEME_FALLBACK_GUEST_KEY = `${LEGACY_THEME_FALLBACK_KEY}::guest`
const THEME_FALLBACK_USER_KEY_PREFIX = `${LEGACY_THEME_FALLBACK_KEY}::user::`

function ensureWindow() {
	return typeof window !== 'undefined'
}

function normalizeTheme(value: unknown): DashboardTheme {
	const normalizedValue = String(value || '')
		.trim()
		.toLowerCase()

	if (normalizedValue === 'rossmann') return 'blush'
	return normalizedValue === 'dark' || normalizedValue === 'blush' ? normalizedValue : 'light'
}

function normalizeFallbackTheme(value: unknown): 'light' | 'dark' {
	return String(value || '').trim().toLowerCase() === 'dark' ? 'dark' : 'light'
}

function getThemeStorageKey(activeUserId: string) {
	return activeUserId ? `${THEME_USER_KEY_PREFIX}${activeUserId}` : THEME_GUEST_KEY
}

function getThemeFallbackStorageKey(activeUserId: string) {
	return activeUserId ? `${THEME_FALLBACK_USER_KEY_PREFIX}${activeUserId}` : THEME_FALLBACK_GUEST_KEY
}

function readRawStorageValue(key: string) {
	if (!ensureWindow()) return ''
	return String(window.localStorage.getItem(key) || '').trim()
}

function readStoredTheme(activeUserId: string) {
	const scopedTheme = readRawStorageValue(getThemeStorageKey(activeUserId))
	if (scopedTheme) {
		return normalizeTheme(scopedTheme)
	}

	const legacyTheme = readRawStorageValue(LEGACY_THEME_KEY)
	return normalizeTheme(legacyTheme || 'light')
}

function readStoredFallbackTheme(activeUserId: string, currentTheme: DashboardTheme) {
	const scopedFallbackTheme = readRawStorageValue(getThemeFallbackStorageKey(activeUserId))
	if (scopedFallbackTheme) {
		return normalizeFallbackTheme(scopedFallbackTheme)
	}

	return currentTheme === 'dark' ? 'dark' : 'light'
}

function writeThemePreference(activeUserId: string, theme: DashboardTheme, fallbackTheme: 'light' | 'dark') {
	if (!ensureWindow()) return

	window.localStorage.setItem(getThemeStorageKey(activeUserId), theme)
	window.localStorage.setItem(getThemeFallbackStorageKey(activeUserId), fallbackTheme)

	if (!activeUserId) {
		window.localStorage.setItem(LEGACY_THEME_KEY, theme)
		window.localStorage.setItem(LEGACY_THEME_FALLBACK_KEY, fallbackTheme)
	}
}

function applyThemeToDocument(theme: DashboardTheme) {
	if (!ensureWindow()) return

	const root = document.documentElement
	const body = document.body
	const isDarkTheme = theme === 'dark'
	const isBlushTheme = theme === 'blush'

	root.setAttribute('data-theme', theme)
	root.style.colorScheme = isDarkTheme ? 'dark' : 'light'
	root.classList.toggle('theme-dark', isDarkTheme)
	root.classList.toggle('theme-blush', isBlushTheme)

	if (!body) return

	body.classList.toggle('theme-dark', isDarkTheme)
	body.classList.toggle('theme-blush', isBlushTheme)
}

function isThemeStorageKey(key: string, activeUserId: string) {
	if (!key) return false

	return [
		LEGACY_THEME_KEY,
		LEGACY_THEME_FALLBACK_KEY,
		getThemeStorageKey(activeUserId),
		getThemeFallbackStorageKey(activeUserId),
	].includes(key)
}

export function useDashboardTheme(activeUserId: string) {
	const [theme, setThemeState] = useState<DashboardTheme>(() => readStoredTheme(activeUserId))

	useEffect(() => {
		setThemeState(readStoredTheme(activeUserId))
	}, [activeUserId])

	useEffect(() => {
		applyThemeToDocument(theme)
	}, [theme])

	useEffect(() => {
		if (!ensureWindow()) return

		const handleStorage = (event: StorageEvent) => {
			if (event.key === null || isThemeStorageKey(String(event.key || ''), activeUserId)) {
				setThemeState(readStoredTheme(activeUserId))
			}
		}

		window.addEventListener('storage', handleStorage)
		return () => {
			window.removeEventListener('storage', handleStorage)
		}
	}, [activeUserId])

	const setTheme = (nextTheme: DashboardTheme) => {
		const normalizedTheme = normalizeTheme(nextTheme)
		const currentTheme = readStoredTheme(activeUserId)
		const fallbackTheme =
			normalizedTheme === 'blush'
				? readStoredFallbackTheme(activeUserId, currentTheme)
				: normalizedTheme === 'dark'
					? 'dark'
					: 'light'

		setThemeState(normalizedTheme)
		writeThemePreference(activeUserId, normalizedTheme, fallbackTheme)
	}

	return {
		theme,
		setTheme,
	}
}
