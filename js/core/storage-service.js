(function initializeAppStorageServices() {
	const appServices = (window.AppServices = window.AppServices || {})

	if (appServices.storageService) {
		return
	}

	const { STORAGE_KEYS, PREFERENCE_KEYS } = APP_CONFIG

	const cloneValue = value => {
		if (value === undefined) return undefined
		return JSON.parse(JSON.stringify(value))
	}

	const THEME_FALLBACK_KEY = `${PREFERENCE_KEYS.THEME}-fallback`
	const THEME_GUEST_KEY = `${PREFERENCE_KEYS.THEME}::guest`
	const THEME_USER_KEY_PREFIX = `${PREFERENCE_KEYS.THEME}::user::`
	const THEME_FALLBACK_GUEST_KEY = `${THEME_FALLBACK_KEY}::guest`
	const THEME_FALLBACK_USER_KEY_PREFIX = `${THEME_FALLBACK_KEY}::user::`
	const DASHBOARD_MENU_ORDER_GUEST_KEY = `${PREFERENCE_KEYS.DASHBOARD_MENU_ORDER}::guest`
	const DASHBOARD_MENU_ORDER_USER_KEY_PREFIX = `${PREFERENCE_KEYS.DASHBOARD_MENU_ORDER}::user::`
	const DASHBOARD_TOP_WIDGETS_GUEST_KEY = `${PREFERENCE_KEYS.DASHBOARD_TOP_WIDGETS}::guest`
	const DASHBOARD_TOP_WIDGETS_USER_KEY_PREFIX = `${PREFERENCE_KEYS.DASHBOARD_TOP_WIDGETS}::user::`
	const COLLECTION_KEYS = new Set([
		STORAGE_KEYS.HIRES,
		STORAGE_KEYS.MONITOR,
		STORAGE_KEYS.EXCHANGES,
		STORAGE_KEYS.BOOKMARKS,
		STORAGE_KEYS.DASHBOARD_ACTIVE_USERS,
		STORAGE_KEYS.LUNCH,
		STORAGE_KEYS.NOTES,
		STORAGE_KEYS.NOTES_ACTIVE_VIEWERS,
		STORAGE_KEYS.ANNOUNCEMENTS,
		STORAGE_KEYS.TASKS,
		STORAGE_KEYS.TESTER_FEEDBACK,
	])
	const PROTECTED_WRITE_KEYS = new Set([
		...COLLECTION_KEYS,
		DASHBOARD_MENU_ORDER_GUEST_KEY,
		DASHBOARD_TOP_WIDGETS_GUEST_KEY,
		PREFERENCE_KEYS.DASHBOARD_MENU_ORDER,
		PREFERENCE_KEYS.DASHBOARD_TOP_WIDGETS,
		PREFERENCE_KEYS.DASHBOARD_TASKS,
		PREFERENCE_KEYS.DASHBOARD_TASK_REMINDERS,
	])
	const PROTECTED_WRITE_KEY_PREFIXES = [DASHBOARD_MENU_ORDER_USER_KEY_PREFIX, DASHBOARD_TOP_WIDGETS_USER_KEY_PREFIX]
	const PUBLIC_WRITE_KEYS = new Set([
		STORAGE_KEYS.DASHBOARD_ACTIVE_USERS,
		STORAGE_KEYS.NOTES_ACTIVE_VIEWERS,
	])

	const readBrowserJsonValue = (key, fallback) => {
		try {
			const storedValue = localStorage.getItem(key)
			if (!storedValue) return cloneValue(fallback)
			return JSON.parse(storedValue)
		} catch (error) {
			return cloneValue(fallback)
		}
	}

	const writeBrowserJsonValue = (key, value) => {
		try {
			localStorage.setItem(key, JSON.stringify(value))
		} catch (error) {
			// Ignore browser preference storage failures and keep the app responsive.
		}
	}

	const readBrowserTextValue = (key, fallback = '') => {
		try {
			const storedValue = localStorage.getItem(key)
			return storedValue === null ? fallback : storedValue
		} catch (error) {
			return fallback
		}
	}

	const writeBrowserTextValue = (key, value) => {
		try {
			localStorage.setItem(key, String(value ?? ''))
		} catch (error) {
			// Ignore browser preference storage failures and keep the app responsive.
		}
	}

	const removeBrowserValue = key => {
		try {
			localStorage.removeItem(key)
		} catch (error) {
			// Ignore browser storage cleanup failures.
		}
	}

	const isProtectedWriteKey = key => {
		const normalizedKey = String(key || '')
		if (PUBLIC_WRITE_KEYS.has(normalizedKey)) return false

		return (
			PROTECTED_WRITE_KEYS.has(normalizedKey) ||
			PROTECTED_WRITE_KEY_PREFIXES.some(prefix => normalizedKey.startsWith(prefix))
		)
	}
	const canWriteProtectedKey = key => !isProtectedWriteKey(key) || Boolean(window.AppUtils?.auth?.isAuthenticated?.())

	const storageService = {
		getText(key, fallback = '') {
			return readBrowserTextValue(key, fallback)
		},
		setText(key, value) {
			if (!canWriteProtectedKey(key)) return
			writeBrowserTextValue(key, value)
		},
		readJson(key, fallback) {
			return readBrowserJsonValue(key, fallback)
		},
		writeJson(key, value) {
			if (!canWriteProtectedKey(key)) return
			writeBrowserJsonValue(key, value)
		},
		remove(key) {
			if (!canWriteProtectedKey(key)) return
			removeBrowserValue(key)
		},
		getBoolean(key, fallback = false) {
			const storedValue = this.getText(key, '')
			if (storedValue === '') return fallback
			return storedValue === 'true'
		},
		setBoolean(key, value) {
			this.setText(key, String(Boolean(value)))
		},
	}

	const createCollectionService = storageKey => ({
		storageKey,
		getAll() {
			const records = storageService.readJson(storageKey, [])
			return Array.isArray(records) ? records : []
		},
		saveAll(records) {
			storageService.writeJson(storageKey, Array.isArray(records) ? records : [])
		},
	})

	const usersService = {
		storageKey: STORAGE_KEYS.USERS,
		getAll() {
			const users = readBrowserJsonValue(this.storageKey, [])
			const storedUsers = Array.isArray(users) ? cloneValue(users) : []
			const testAccount = window.DashboardTestAccount
			if (!testAccount) return storedUsers

			const storedTestUser = storedUsers.find(user => user?.id === testAccount.id)
			const testUser = {
				fullName: testAccount.fullName,
				avatarId: testAccount.avatarId,
				profileTitle: testAccount.profileTitle,
				bookmarkDefaultColor: testAccount.bookmarkDefaultColor,
				profileAccentColor: testAccount.profileAccentColor,
				createdAt: testAccount.createdAt,
				...storedTestUser,
				id: testAccount.id,
				login: testAccount.login,
				role: testAccount.role,
				passwordHash: btoa(unescape(encodeURIComponent(testAccount.password))),
			}
			return [...storedUsers.filter(user => user?.id !== testAccount.id), testUser]
		},
		saveAll(users) {
			writeBrowserJsonValue(this.storageKey, Array.isArray(users) ? users : [])
		},
	}

	const sessionService = {
		storageKey: STORAGE_KEYS.SESSION,
		getCurrent() {
			const session = readBrowserJsonValue(this.storageKey, null)
			if (!session || typeof session !== 'object' || !session.userId) return null
			return {
				userId: String(session.userId),
				loginAt: session.loginAt || new Date().toISOString(),
			}
		},
		save(session) {
			if (!session || typeof session !== 'object' || !session.userId) {
				this.clear()
				return
			}
			writeBrowserJsonValue(this.storageKey, session)
		},
		clear() {
			removeBrowserValue(this.storageKey)
		},
	}

	const bookmarksService = {
		...createCollectionService(STORAGE_KEYS.BOOKMARKS),
		getByUserId(userId) {
			const normalizedUserId = String(userId || '')
			return this.getAll().filter(bookmark => String(bookmark?.userId || '') === normalizedUserId)
		},
	}

	const preferencesService = {
		getCurrentUserPreferenceScope() {
			return String(sessionService?.getCurrent?.()?.userId || '').trim()
		},
		getScopedPreferenceKey(guestKey, userKeyPrefix) {
			const currentUserId = this.getCurrentUserPreferenceScope()
			return currentUserId ? `${userKeyPrefix}${currentUserId}` : guestKey
		},
		getThemeStorageKey() {
			return this.getScopedPreferenceKey(THEME_GUEST_KEY, THEME_USER_KEY_PREFIX)
		},
		getThemeFallbackStorageKey() {
			return this.getScopedPreferenceKey(THEME_FALLBACK_GUEST_KEY, THEME_FALLBACK_USER_KEY_PREFIX)
		},
		getDashboardMenuOrderStorageKey() {
			return this.getScopedPreferenceKey(DASHBOARD_MENU_ORDER_GUEST_KEY, DASHBOARD_MENU_ORDER_USER_KEY_PREFIX)
		},
		getDashboardTopWidgetsStorageKey() {
			return this.getScopedPreferenceKey(DASHBOARD_TOP_WIDGETS_GUEST_KEY, DASHBOARD_TOP_WIDGETS_USER_KEY_PREFIX)
		},
		getTheme() {
			const scopedKey = this.getThemeStorageKey()
			const scopedTheme = storageService.getText(scopedKey, '')
			if (scopedTheme === 'rossmann') {
				return 'blush'
			}
			if (['light', 'dark', 'blush'].includes(scopedTheme)) {
				return scopedTheme
			}

			const legacyTheme = storageService.getText(PREFERENCE_KEYS.THEME, 'light') || 'light'
			if (legacyTheme === 'rossmann') {
				return 'blush'
			}
			return ['light', 'dark', 'blush'].includes(legacyTheme) ? legacyTheme : 'light'
		},
		setTheme(theme) {
			const normalizedTheme = theme === 'rossmann' ? 'blush' : ['light', 'dark', 'blush'].includes(theme) ? theme : 'light'
			storageService.setText(this.getThemeStorageKey(), normalizedTheme)
		},
		getThemeFallback() {
			const scopedFallbackTheme = storageService.getText(this.getThemeFallbackStorageKey(), '')
			if (scopedFallbackTheme === 'dark' || scopedFallbackTheme === 'light') {
				return scopedFallbackTheme
			}

			return this.getTheme() === 'dark' ? 'dark' : 'light'
		},
		setThemeFallback(theme) {
			storageService.setText(this.getThemeFallbackStorageKey(), theme === 'dark' ? 'dark' : 'light')
		},
		getWeatherLocation(fallback = 'Warszawa') {
			return storageService.getText(PREFERENCE_KEYS.WEATHER_LOCATION, fallback) || fallback
		},
		setWeatherLocation(location) {
			storageService.setText(PREFERENCE_KEYS.WEATHER_LOCATION, location)
		},
		getDashboardMenuOrder() {
			const scopedKey = this.getDashboardMenuOrderStorageKey()
			const scopedOrder = storageService.readJson(scopedKey, null)
			if (Array.isArray(scopedOrder)) {
				return scopedOrder
			}

			if (scopedKey === DASHBOARD_MENU_ORDER_GUEST_KEY) {
				const legacyOrder = storageService.readJson(PREFERENCE_KEYS.DASHBOARD_MENU_ORDER, [])
				return Array.isArray(legacyOrder) ? legacyOrder : []
			}

			return []
		},
		saveDashboardMenuOrder(menuOrder) {
			storageService.writeJson(this.getDashboardMenuOrderStorageKey(), Array.isArray(menuOrder) ? menuOrder : [])
		},
		getDashboardTopWidgets() {
			const scopedKey = this.getDashboardTopWidgetsStorageKey()
			const scopedWidgets = storageService.readJson(scopedKey, null)
			if (scopedWidgets && typeof scopedWidgets === 'object' && !Array.isArray(scopedWidgets)) {
				return scopedWidgets
			}

			if (scopedKey === DASHBOARD_TOP_WIDGETS_GUEST_KEY) {
				const legacyWidgets = storageService.readJson(PREFERENCE_KEYS.DASHBOARD_TOP_WIDGETS, null)
				return legacyWidgets && typeof legacyWidgets === 'object' && !Array.isArray(legacyWidgets) ? legacyWidgets : null
			}

			return null
		},
		saveDashboardTopWidgets(layout) {
			const normalizedLayout = layout && typeof layout === 'object' && !Array.isArray(layout) ? layout : {}
			storageService.writeJson(this.getDashboardTopWidgetsStorageKey(), normalizedLayout)
		},
		getDashboardTasks() {
			const tasks = storageService.readJson(PREFERENCE_KEYS.DASHBOARD_TASKS, [])
			return Array.isArray(tasks) ? tasks : []
		},
		saveDashboardTasks(tasks) {
			storageService.writeJson(PREFERENCE_KEYS.DASHBOARD_TASKS, Array.isArray(tasks) ? tasks : [])
		},
		getDashboardTaskReminders() {
			const reminders = storageService.readJson(PREFERENCE_KEYS.DASHBOARD_TASK_REMINDERS, [])
			return Array.isArray(reminders) ? reminders : []
		},
		saveDashboardTaskReminders(reminders) {
			storageService.writeJson(PREFERENCE_KEYS.DASHBOARD_TASK_REMINDERS, Array.isArray(reminders) ? reminders : [])
		},
	}

	appServices.storageService = storageService
	appServices.usersService = usersService
	appServices.sessionService = sessionService
	appServices.hiresService = createCollectionService(STORAGE_KEYS.HIRES)
	appServices.monitorService = createCollectionService(STORAGE_KEYS.MONITOR)
	appServices.exchangesService = createCollectionService(STORAGE_KEYS.EXCHANGES)
	appServices.bookmarksService = bookmarksService
	appServices.preferencesService = preferencesService
})()
