/* === Shared Global UI: Start === */
const syncRootThemeState = () => {
	if (!document.body) return

	const root = document.documentElement
	root.classList.toggle('dashboard-page', document.body.classList.contains('dashboard-page'))
	root.classList.toggle('theme-dark', document.body.classList.contains('theme-dark'))
	root.classList.toggle('theme-blush', document.body.classList.contains('theme-blush'))
}

const normalizeStoredTheme = theme => {
	const normalizedTheme = String(theme || '').trim().toLowerCase()
	if (normalizedTheme === 'rossmann') return 'blush'
	return ['light', 'dark', 'blush'].includes(normalizedTheme) ? normalizedTheme : 'light'
}

const applyTheme = theme => {
	const normalizedTheme = normalizeStoredTheme(theme)
	const isDark = normalizedTheme === 'dark'
	const isBlush = normalizedTheme === 'blush'
	document.body.classList.toggle('theme-dark', isDark)
	document.body.classList.toggle('theme-blush', isBlush)
	syncRootThemeState()
	document.documentElement.setAttribute('data-theme', normalizedTheme)
}

const THEME_STORAGE_KEY = APP_CONFIG.PREFERENCE_KEYS.THEME
const SESSION_STORAGE_KEY = APP_CONFIG.STORAGE_KEYS.SESSION
const USERS_STORAGE_KEY = APP_CONFIG.STORAGE_KEYS.USERS
const ACTIVE_USERS_STORAGE_KEY = APP_CONFIG.STORAGE_KEYS.DASHBOARD_ACTIVE_USERS || 'dashboard_active_users'
const ACTIVE_USER_TAB_ID_KEY = 'dashboard_active_user_tab_id'
const ACTIVE_USER_TTL_MS = 45000

const getStoredTheme = () =>
	normalizeStoredTheme(preferencesService?.getTheme?.() || storageService?.getText(THEME_STORAGE_KEY, 'light') || 'light')

const syncThemeUiState = () => {
	applyTheme(getStoredTheme())
}

const isThemePreferenceStorageKey = key => {
	const normalizedKey = String(key || '').trim()
	if (!normalizedKey) return false

	return [
		THEME_STORAGE_KEY,
		`${THEME_STORAGE_KEY}-fallback`,
		preferencesService?.getThemeStorageKey?.(),
		preferencesService?.getThemeFallbackStorageKey?.(),
	].includes(normalizedKey)
}

const getActiveUserTabId = () => {
	try {
		const existingId = sessionStorage.getItem(ACTIVE_USER_TAB_ID_KEY)
		if (existingId) return existingId

		const nextId =
			typeof window.crypto?.randomUUID === 'function'
				? window.crypto.randomUUID()
				: `dashboard-tab-${Date.now()}-${Math.random().toString(36).slice(2)}`
		sessionStorage.setItem(ACTIVE_USER_TAB_ID_KEY, nextId)
		return nextId
	} catch (error) {
		return `dashboard-tab-${Date.now()}`
	}
}

const activeUserTabId = getActiveUserTabId()

const getActiveUserRecords = () => {
	const records = storageService?.readJson?.(ACTIVE_USERS_STORAGE_KEY, []) || []
	return Array.isArray(records) ? records.filter(record => record && typeof record === 'object') : []
}

const getFreshActiveUserRecords = () => {
	const now = Date.now()
	return getActiveUserRecords().filter(
		record => record.userId && record.tabId && now - (Date.parse(record.lastSeenAt) || 0) <= ACTIVE_USER_TTL_MS
	)
}

const saveActiveUserRecords = records => {
	storageService?.writeJson?.(ACTIVE_USERS_STORAGE_KEY, Array.isArray(records) ? records : [])
}

const syncActiveUserPresence = () => {
	const records = getFreshActiveUserRecords().filter(record => record.tabId !== activeUserTabId)
	const currentUser = window.AppUtils?.auth?.getCurrentUser?.()

	if (currentUser && !document.hidden) {
		records.push({
			tabId: activeUserTabId,
			userId: String(currentUser.id || ''),
			login: currentUser.login || '',
			fullName: currentUser.fullName || '',
			role: currentUser.role || 'user',
			avatarId: currentUser.avatarId || 'blue',
			avatarImage: currentUser.avatarImage || '',
			profileAccentColor: currentUser.profileAccentColor || '',
			profileCoverImage: currentUser.profileCoverImage || '',
			lastSeenAt: new Date().toISOString(),
		})
	}

	saveActiveUserRecords(records)
}

const clearActiveUserPresence = () => {
	saveActiveUserRecords(getActiveUserRecords().filter(record => record.tabId !== activeUserTabId))
}

const syncHeaderUserPanelSlot = () => {
	const authHub = document.querySelector('.app-user-hub')
	const panelSlot = document.querySelector('.app-user-panel-slot')

	if (!authHub || !panelSlot) return

	if (authHub.parentElement !== panelSlot) {
		panelSlot.replaceChildren(authHub)
	}
}

const syncWorkspaceActionButtonTitles = () => {
	document.querySelectorAll('.workspace-actions .workspace-action-btn, .workspace-actions .workspace-primary-btn').forEach(button => {
		const label = String(
			button.querySelector('span')?.textContent || button.getAttribute('aria-label') || button.textContent || ''
		)
			.replace(/\s+/g, ' ')
			.trim()

		if (!label) return

		button.setAttribute('aria-label', label)
		button.setAttribute('title', label)
	})
}

const getModuleNavDocks = () => Array.from(document.querySelectorAll('.module-nav-dock'))
let moduleNavDocksGlobalListenersReady = false

const initializeModuleNavDocks = () => {
	const docks = getModuleNavDocks()
	if (!docks.length) return

	const clearDockState = dock => {
		dock.classList.remove('is-manual-open', 'is-manual-closed')
		const toggle = dock.querySelector('.module-nav-toggle')
		if (toggle) toggle.setAttribute('aria-expanded', 'false')
	}

	const syncDockState = dock => {
		const toggle = dock.querySelector('.module-nav-toggle')
		if (!toggle) return

		const isVisible =
			dock.classList.contains('is-manual-open') ||
			(!dock.classList.contains('is-manual-closed') && (dock.matches(':hover') || dock.matches(':focus-within')))

		toggle.setAttribute('aria-expanded', isVisible ? 'true' : 'false')
	}

	docks.forEach(dock => {
		if (dock.dataset.navDockReady === 'true') return
		dock.dataset.navDockReady = 'true'

		const toggle = dock.querySelector('.module-nav-toggle')
		if (!toggle) return

		toggle.setAttribute('aria-expanded', 'false')

		toggle.addEventListener('click', event => {
			event.preventDefault()
			event.stopPropagation()

			const isVisible =
				dock.classList.contains('is-manual-open') ||
				(!dock.classList.contains('is-manual-closed') && (dock.matches(':hover') || dock.matches(':focus-within')))

			if (dock.classList.contains('is-manual-open')) {
				dock.classList.remove('is-manual-open')
				if (dock.matches(':hover') || dock.matches(':focus-within')) {
					dock.classList.add('is-manual-closed')
				}
			} else if (isVisible) {
				dock.classList.remove('is-manual-open')
				dock.classList.add('is-manual-closed')
			} else {
				dock.classList.remove('is-manual-closed')
				dock.classList.add('is-manual-open')
			}

			syncDockState(dock)
		})

		dock.addEventListener('mouseenter', () => syncDockState(dock))
		dock.addEventListener('mouseleave', () => {
			if (!dock.classList.contains('is-manual-open')) {
				dock.classList.remove('is-manual-closed')
			}
			syncDockState(dock)
		})

		dock.addEventListener('focusin', () => syncDockState(dock))
		dock.addEventListener('focusout', () => {
			window.setTimeout(() => {
				if (!dock.contains(document.activeElement) && !dock.matches(':hover') && !dock.classList.contains('is-manual-open')) {
					dock.classList.remove('is-manual-closed')
				}
				syncDockState(dock)
			}, 0)
		})
	})

	if (moduleNavDocksGlobalListenersReady) return

	moduleNavDocksGlobalListenersReady = true

	document.addEventListener('click', event => {
		getModuleNavDocks().forEach(dock => {
			if (dock.contains(event.target)) return
			clearDockState(dock)
		})
	})

	document.addEventListener('keydown', event => {
		if (event.key !== 'Escape') return
		getModuleNavDocks().forEach(clearDockState)
	})
}

const refreshModuleShellUi = () => {
	syncRootThemeState()
	syncHeaderUserPanelSlot()
	initializeModuleNavDocks()
	syncWorkspaceActionButtonTitles()
}

window.AppUi = Object.assign(window.AppUi || {}, {
	refreshModuleShellUi,
	syncHeaderUserPanelSlot,
	syncWorkspaceActionButtonTitles,
})

document.addEventListener('DOMContentLoaded', () => {
	syncRootThemeState()
	syncThemeUiState()
	ensureAuthUi()
	syncHeaderUserPanelSlot()
	initializeModuleNavDocks()
	ensurePageStatusStrip()
	syncCurrentUserFromSession()
	syncActiveUserPresence()
	window.setTimeout(syncWorkspaceActionButtonTitles, 0)
	const activeUserPresenceTimerId = window.setInterval(() => {
		if (document.hidden) return
		syncActiveUserPresence()
	}, 10000)

	document.querySelectorAll('#current-year').forEach(element => {
		element.textContent = new Date().getFullYear()
	})

	window.addEventListener('storage', event => {
		if (event.key === SESSION_STORAGE_KEY || event.key === USERS_STORAGE_KEY) {
			closeUserPopover()
			syncCurrentUserFromSession()
			syncThemeUiState()
			syncActiveUserPresence()
		}

		if (isThemePreferenceStorageKey(event.key)) {
			syncThemeUiState()
		}
	})

	document.addEventListener('app-auth-changed', syncThemeUiState)
	document.addEventListener('app-auth-changed', syncHeaderUserPanelSlot)
	document.addEventListener('app-auth-changed', () => window.setTimeout(syncWorkspaceActionButtonTitles, 0))
	document.addEventListener('app-auth-changed', syncActiveUserPresence)

	document.addEventListener('visibilitychange', () => {
		if (document.hidden) {
			clearActiveUserPresence()
			return
		}

		syncActiveUserPresence()
	})

	window.addEventListener('beforeunload', () => {
		clearActiveUserPresence()
		window.clearInterval(activeUserPresenceTimerId)
	})
})
/* === Shared Global UI: End === */
