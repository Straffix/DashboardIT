/* === Shared Global UI: Start === */
const syncRootThemeState = () => {
	if (!document.body) return

	const root = document.documentElement
	root.classList.toggle('dashboard-page', document.body.classList.contains('dashboard-page'))
	root.classList.toggle('theme-dark', document.body.classList.contains('theme-dark'))
	root.classList.toggle('theme-rossmann', document.body.classList.contains('theme-rossmann'))
}

const applyTheme = theme => {
	const normalizedTheme = ['light', 'dark', 'rossmann'].includes(theme) ? theme : 'light'
	const isDark = normalizedTheme === 'dark'
	const isRossmann = normalizedTheme === 'rossmann'
	document.body.classList.toggle('theme-dark', isDark)
	document.body.classList.toggle('theme-rossmann', isRossmann)
	syncRootThemeState()
	document.documentElement.setAttribute('data-theme', normalizedTheme)
}

const THEME_STORAGE_KEY = APP_CONFIG.PREFERENCE_KEYS.THEME
const WIDE_MODE_STORAGE_KEY = APP_CONFIG.PREFERENCE_KEYS.WIDE_MODE
const SESSION_STORAGE_KEY = APP_CONFIG.STORAGE_KEYS.SESSION
const USERS_STORAGE_KEY = APP_CONFIG.STORAGE_KEYS.USERS
const ACTIVE_USERS_STORAGE_KEY = APP_CONFIG.STORAGE_KEYS.DASHBOARD_ACTIVE_USERS || 'dashboard_active_users'
const THEME_TOOLS_SLOT_CLASS = 'app-theme-tools-slot'
const ACTIVE_USER_TAB_ID_KEY = 'dashboard_active_user_tab_id'
const ACTIVE_USER_TTL_MS = 45000

const normalizeStoredTheme = theme => (['light', 'dark', 'rossmann'].includes(theme) ? theme : 'light')
const normalizeBaseTheme = theme => (theme === 'dark' ? 'dark' : 'light')

const getStoredTheme = () =>
	normalizeStoredTheme(preferencesService?.getTheme?.() || storageService?.getText(THEME_STORAGE_KEY, 'light') || 'light')

const getStoredBaseTheme = () =>
	normalizeBaseTheme(preferencesService?.getThemeFallback?.() || storageService?.getText?.(`${THEME_STORAGE_KEY}-fallback`, 'light') || 'light')

const storeBaseTheme = theme => {
	const normalizedTheme = normalizeBaseTheme(theme)
	if (preferencesService?.setThemeFallback) {
		preferencesService.setThemeFallback(normalizedTheme)
		return
	}

	storageService?.setText?.(`${THEME_STORAGE_KEY}-fallback`, normalizedTheme)
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

const getOrCreateThemeToolsSlot = () => {
	const existingSlot = document.querySelector(`.${THEME_TOOLS_SLOT_CLASS}`) || document.querySelector('.dashboard-theme-bookmark-slot')
	if (existingSlot) {
		existingSlot.classList.add(THEME_TOOLS_SLOT_CLASS)
		return existingSlot
	}

	if (!document.body) return null

	const slot = document.createElement('div')
	slot.className = THEME_TOOLS_SLOT_CLASS
	document.body.appendChild(slot)
	return slot
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

const requireAuthenticatedPreferenceAction = message => {
	if (window.AppUtils?.auth?.isAuthenticated?.()) return true

	window.AppUtils?.notify?.({
		type: 'warning',
		title: 'Tylko podglad',
		message,
	})
	window.AppUtils?.auth?.openAuthModal?.('login')
	return false
}

const createThemeToggle = () => {
	if (document.querySelector('.theme-toggle-btn, .theme-toggle-menu')) return null

	const themeSequence = ['dark', 'light', 'rossmann']
	const themeLabels = {
		light: 'Light Mode',
		dark: 'Dark Mode',
		rossmann: 'Ross Mode',
	}
	const themeIcons = {
		light: '<i class="app-icon sun-solid-full"></i>',
		dark: '<i class="app-icon moon-solid-full"></i>',
		rossmann: `
			<svg viewBox="0 0 24 24" class="theme-toggle-option-logo">
				<path d="M12 0C5.391 0 0 5.391 0 12s5.391 12 12 12 12-5.391 12-12S18.609 0 12 0m0 2.088a9.93 9.93 0 0 1 7.477 3.39H16l.348-.607c.347-.783-.958-1.392-1.393-.61l-.607 1.218H4.52C6.435 3.392 9.131 2.088 12 2.088m8.434 4.695A10.07 10.07 0 0 1 21.912 12c0 4.087-2.522 7.653-6.174 9.13l-3.912-3.911q-.13-.131 0-.262l1.39-2.783c.088-.087.174-.174.26-.174h2.436c.087 0 .088.087.088.174l-.697 1.478s0 .174.088.174l.869.61c.087.087.175-.001.261-.088l.956-2.26c.087-.087.174-.174.261-.174h.87s.087 0 .087.174L18 15.652s-.001.174.086.174l.957.61c.087.087.173-.001.26-.088 0-.087 1.045-2.26 1.045-2.434.26-.609.172-1.652-1.045-1.652h-1.39a.19.19 0 0 1-.175-.174v-4.61q0-.26.262-.26zm-16.782.088s9.13.434 9.217.434.26 0 .26.174c.087.173.87 2.174.957 2.261s.087.348-.348.348H4.87a1.15 1.15 0 0 0-1.13 1.13v3.305c0 .261.086.522.173.696.261.26.696.433.783.433.087.087.174.001.174-.086v-4.261c0-.087.087-.174.174-.174H6s.173 0 .086.088c-.348.435-.434.87-.434 1.652 0 1.217.87 1.999 1.217 2.26 0 0 .087.087 0 .174S6 17.044 6 17.13q-.13.131 0 .262l4.348 4.26c-4.696-.87-8.174-4.87-8.174-9.653 0-1.913.522-3.65 1.478-5.129M9.912 14h.957s.173 0 .086.174-1.39 2.696-1.39 2.783v.174l4.52 4.435c-.52.174-1.042.173-1.564.26l-4.435-4.433c-.087-.087 0-.175 0-.262s1.48-2.87 1.566-2.957c0-.087.086-.174.26-.174"/>
			</svg>
		`,
	}

	const button = document.createElement('div')
	button.className = 'theme-toggle-btn'
	button.setAttribute('role', 'group')
	button.setAttribute('aria-label', 'Zmien motyw')

	const setTheme = (theme, options = {}) => {
		const normalizedTheme = normalizeStoredTheme(theme)
		const fallbackTheme = normalizeBaseTheme(options.fallbackTheme || getStoredBaseTheme())

		if (normalizedTheme === 'rossmann') {
			storeBaseTheme(fallbackTheme)
		} else {
			storeBaseTheme(normalizedTheme)
		}

		applyTheme(normalizedTheme)
		if (preferencesService?.setTheme) {
			preferencesService.setTheme(normalizedTheme)
		} else {
			storageService?.setText?.(THEME_STORAGE_KEY, normalizedTheme)
		}
		updateToggle(normalizedTheme)
	}

	const syncThemeUiState = () => {
		const activeTheme = getStoredTheme()
		applyTheme(activeTheme)
		updateToggle(activeTheme)
	}

	const updateToggle = theme => {
		const normalizedTheme = normalizeStoredTheme(theme)
		const activeIndex = themeSequence.indexOf(normalizedTheme)
		const nextTheme = themeSequence[(activeIndex + 1) % themeSequence.length]
		button.dataset.themeOption = normalizedTheme
		button.dataset.nextTheme = nextTheme
		button.innerHTML = `
			<span class="theme-toggle-option-list">
				${themeSequence
					.map(
						themeOption => `
							<button
								type="button"
								class="theme-toggle-option-badge${themeOption === normalizedTheme ? ' is-active' : ''}"
								data-theme-icon="${themeOption}"
								aria-label="${themeLabels[themeOption]}"
								aria-pressed="${themeOption === normalizedTheme}"
							>
								${themeIcons[themeOption]}
							</button>
						`
					)
					.join('')}
			</span>
		`
	}

	button.addEventListener('click', event => {
		const themeButton = event.target.closest?.('[data-theme-icon]')
		if (!themeButton || !button.contains(themeButton)) return

		const activeTheme = normalizeStoredTheme(document.documentElement.getAttribute('data-theme') || getStoredTheme())
		const nextTheme = themeButton.dataset.themeIcon
		if (!themeSequence.includes(nextTheme)) return
		if (nextTheme === activeTheme) return

		setTheme(nextTheme, { fallbackTheme: activeTheme === 'rossmann' ? getStoredBaseTheme() : activeTheme })
	})

	window.addEventListener('storage', event => {
		if (isThemePreferenceStorageKey(event.key) || event.key === SESSION_STORAGE_KEY) {
			syncThemeUiState()
		}
	})

	document.addEventListener('app-auth-changed', syncThemeUiState)

	updateToggle(getStoredTheme())
	return button
}

document.addEventListener('DOMContentLoaded', () => {
	syncRootThemeState()
	applyTheme(getStoredTheme())
	ensureAuthUi()
	ensurePageStatusStrip()
	syncCurrentUserFromSession()
	syncActiveUserPresence()
	const activeUserPresenceTimerId = window.setInterval(() => {
		if (document.hidden) return
		syncActiveUserPresence()
	}, 10000)

	document.querySelectorAll('#current-year').forEach(element => {
		element.textContent = new Date().getFullYear()
	})

	const themeToggle = createThemeToggle()
	if (themeToggle) {
		const themeToolsSlot = getOrCreateThemeToolsSlot()
		const dashboardTopbar = document.querySelector('.dashboard-topbar')
		if (themeToolsSlot) {
			themeToolsSlot.appendChild(themeToggle)
		} else if (document.body.classList.contains('dashboard-page') && dashboardTopbar) {
			dashboardTopbar.prepend(themeToggle)
		} else {
			document.body.appendChild(themeToggle)
		}
	}

	const returnMenuLinks = document.querySelectorAll('.menu-btn[href="index.html"]')
	returnMenuLinks.forEach(link => {
		link.addEventListener('click', event => {
			if (window.opener && !window.opener.closed) {
				event.preventDefault()

				try {
					window.opener.focus()
				} catch (error) {
					// Browser may block focusing the opener tab.
				}

				window.close()
				return
			}

			window.location.href = link.href
		})
	})

	const fullscreenBtn = document.getElementById('fullscreen-btn')
	if (fullscreenBtn) {
		const updateWideMode = isWide => {
			document.body.classList.toggle('wide-mode', isWide)
			fullscreenBtn.innerHTML = isWide ? '<i class="app-icon compress-solid-full"></i>' : '<i class="app-icon expand-solid-full"></i>'
		}

		fullscreenBtn.addEventListener('click', () => {
			if (!requireAuthenticatedPreferenceAction('Musisz byc zalogowany, aby zmieniac uklad strony.')) return
			const isWide = !document.body.classList.contains('wide-mode')
			updateWideMode(isWide)
			preferencesService?.setWideMode?.(isWide) || storageService?.setBoolean?.(WIDE_MODE_STORAGE_KEY, isWide)
		})

		updateWideMode(preferencesService?.getWideMode?.() ?? storageService?.getBoolean?.(WIDE_MODE_STORAGE_KEY, false))
	}

	window.addEventListener('storage', event => {
		if (event.key === SESSION_STORAGE_KEY || event.key === USERS_STORAGE_KEY) {
			closeUserPopover()
			syncCurrentUserFromSession()
			applyTheme(getStoredTheme())
			syncActiveUserPresence()
		}

		if (isThemePreferenceStorageKey(event.key)) {
			applyTheme(getStoredTheme())
		}
	})

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
