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

	const runtimeConfig = window.DashboardRuntimeConfig || {}
	const THEME_FALLBACK_KEY = `${PREFERENCE_KEYS.THEME}-fallback`
	const THEME_GUEST_KEY = `${PREFERENCE_KEYS.THEME}::guest`
	const THEME_USER_KEY_PREFIX = `${PREFERENCE_KEYS.THEME}::user::`
	const THEME_FALLBACK_GUEST_KEY = `${THEME_FALLBACK_KEY}::guest`
	const THEME_FALLBACK_USER_KEY_PREFIX = `${THEME_FALLBACK_KEY}::user::`
	const DASHBOARD_MENU_ORDER_GUEST_KEY = `${PREFERENCE_KEYS.DASHBOARD_MENU_ORDER}::guest`
	const DASHBOARD_MENU_ORDER_USER_KEY_PREFIX = `${PREFERENCE_KEYS.DASHBOARD_MENU_ORDER}::user::`
	const REMOTE_SHARED_KEYS = new Set([
		STORAGE_KEYS.HIRES,
		STORAGE_KEYS.MONITOR,
		STORAGE_KEYS.EXCHANGES,
		STORAGE_KEYS.BOOKMARKS,
		STORAGE_KEYS.LUNCH,
		STORAGE_KEYS.NOTES,
		STORAGE_KEYS.ANNOUNCEMENTS,
		STORAGE_KEYS.TASKS,
		STORAGE_KEYS.TESTER_FEEDBACK,
	])
	const PROTECTED_WRITE_KEYS = new Set([
		...REMOTE_SHARED_KEYS,
		PREFERENCE_KEYS.WIDE_MODE,
		DASHBOARD_MENU_ORDER_GUEST_KEY,
		PREFERENCE_KEYS.DASHBOARD_MENU_ORDER,
		PREFERENCE_KEYS.DASHBOARD_TASKS,
		PREFERENCE_KEYS.DASHBOARD_TASK_REMINDERS,
		PREFERENCE_KEYS.DASHBOARD_TASK_AUTOCLEAR,
	])
	const PROTECTED_WRITE_KEY_PREFIXES = [DASHBOARD_MENU_ORDER_USER_KEY_PREFIX]

	let remoteEnabledCache = null
	let remoteHealthChecked = false

	const getConfiguredApiBase = () => {
		const configuredBase = String(runtimeConfig.apiBaseUrl || './api/').trim()
		if (!configuredBase) return './api/'
		return configuredBase.endsWith('/') ? configuredBase : `${configuredBase}/`
	}

	const resolveApiUrl = path => {
		const apiBaseUrl = new URL(getConfiguredApiBase(), document.baseURI)
		return new URL(path, apiBaseUrl).toString()
	}

	const sendRemoteRequest = ({ method = 'GET', path = '', body = null } = {}) => {
		const xhr = new XMLHttpRequest()
		const url = resolveApiUrl(path)

		try {
			xhr.open(method, url, false)
			xhr.setRequestHeader('Accept', 'application/json')
			if (body !== null) {
				xhr.setRequestHeader('Content-Type', 'application/json')
			}
			xhr.send(body === null ? null : JSON.stringify(body))
		} catch (error) {
			return {
				ok: false,
				status: 0,
				message: error?.message || 'Nie udalo sie nawiazac polaczenia z serwerem.',
				payload: null,
			}
		}

		let payload = null
		try {
			payload = JSON.parse(xhr.responseText || '{}')
		} catch (error) {
			payload = null
		}

		if (xhr.status >= 200 && xhr.status < 300 && payload && payload.ok !== false) {
			return {
				ok: true,
				status: xhr.status,
				message: '',
				payload,
			}
		}

		return {
			ok: false,
			status: xhr.status,
			message: payload?.message || `Serwer zwrocil blad HTTP ${xhr.status || 0}.`,
			payload,
		}
	}

	const remoteApi = {
		request({ method = 'GET', path = '', body = null } = {}) {
			const response = sendRemoteRequest({ method, path, body })
			if (!response.ok) {
				return {
					ok: false,
					status: response.status,
					message: response.message,
				}
			}

			return {
				ok: true,
				status: response.status,
				...response.payload,
			}
		},
		requestAuth({ method = 'GET', path = '', body = null } = {}) {
			return this.request({
				method,
				path: `auth/${String(path || '').replace(/^\/+/, '')}`,
				body,
			})
		},
		isRemoteEnabled() {
			if (remoteHealthChecked) return Boolean(remoteEnabledCache)
			remoteHealthChecked = true

			if (window.location.protocol === 'file:' || runtimeConfig.storageMode === 'local') {
				remoteEnabledCache = false
				return false
			}

			const response = sendRemoteRequest({ path: 'health.php' })
			remoteEnabledCache = Boolean(response.ok && response.payload?.mode === 'mysql')
			return Boolean(remoteEnabledCache)
		},
	}

	const isRemoteKey = key => remoteApi.isRemoteEnabled() && REMOTE_SHARED_KEYS.has(String(key || ''))
	const isProtectedWriteKey = key => {
		const normalizedKey = String(key || '')
		return (
			PROTECTED_WRITE_KEYS.has(normalizedKey) ||
			PROTECTED_WRITE_KEY_PREFIXES.some(prefix => normalizedKey.startsWith(prefix))
		)
	}
	const canWriteProtectedKey = key => !isProtectedWriteKey(key) || Boolean(window.AppUtils?.auth?.isAuthenticated?.())

	const notifyStorageError = message => {
		console.error(message)
		if (typeof window.AppUtils?.notify === 'function') {
			window.AppUtils.notify({
				type: 'error',
				title: 'Blad synchronizacji',
				message,
			})
		}
	}

	const storageService = {
		isRemoteEnabled() {
			return remoteApi.isRemoteEnabled()
		},
		getText(key, fallback = '') {
			try {
				const storedValue = localStorage.getItem(key)
				return storedValue === null ? fallback : storedValue
			} catch (error) {
				return fallback
			}
		},
		setText(key, value) {
			if (!canWriteProtectedKey(key)) return
			localStorage.setItem(key, String(value ?? ''))
		},
		readJson(key, fallback) {
			if (isRemoteKey(key)) {
				const response = remoteApi.request({
					path: `storage.php?key=${encodeURIComponent(String(key || ''))}`,
				})

				if (!response.ok) {
					notifyStorageError(response.message || 'Nie udalo sie pobrac danych z serwera.')
					return cloneValue(fallback)
				}

				return cloneValue(response.value ?? fallback)
			}

			try {
				const storedValue = localStorage.getItem(key)
				if (!storedValue) return cloneValue(fallback)
				return JSON.parse(storedValue)
			} catch (error) {
				return cloneValue(fallback)
			}
		},
		writeJson(key, value) {
			if (!canWriteProtectedKey(key)) return

			if (isRemoteKey(key)) {
				const response = remoteApi.request({
					method: 'POST',
					path: 'storage.php',
					body: {
						key,
						value,
					},
				})

				if (!response.ok) {
					notifyStorageError(response.message || 'Nie udalo sie zapisac danych na serwerze.')
				}
				return
			}

			localStorage.setItem(key, JSON.stringify(value))
		},
		remove(key) {
			if (!canWriteProtectedKey(key)) return

			if (isRemoteKey(key)) {
				const response = remoteApi.request({
					method: 'DELETE',
					path: `storage.php?key=${encodeURIComponent(String(key || ''))}`,
				})

				if (!response.ok) {
					notifyStorageError(response.message || 'Nie udalo sie usunac danych z serwera.')
				}
				return
			}

			localStorage.removeItem(key)
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
		// TODO: replace this localStorage implementation with fetch/API calls when backend endpoints are ready.
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
			if (remoteApi.isRemoteEnabled()) {
				const response = remoteApi.requestAuth({ path: 'users.php' })
				if (!response.ok) {
					notifyStorageError(response.message || 'Nie udalo sie pobrac listy uzytkownikow.')
					return []
				}

				return Array.isArray(response.users) ? cloneValue(response.users) : []
			}

			const storedUsers = storageService.readJson(this.storageKey, [])
			return Array.isArray(storedUsers) ? storedUsers : []
		},
		saveAll(users) {
			if (remoteApi.isRemoteEnabled()) {
				notifyStorageError('Bezposredni zapis listy uzytkownikow jest w trybie zdalnym zablokowany.')
				return
			}

			storageService.writeJson(this.storageKey, Array.isArray(users) ? users : [])
		},
	}

	const sessionService = {
		storageKey: STORAGE_KEYS.SESSION,
		getCurrent() {
			if (remoteApi.isRemoteEnabled()) {
				const response = remoteApi.requestAuth({ path: 'session.php' })
				if (!response.ok) {
					notifyStorageError(response.message || 'Nie udalo sie odczytac sesji z serwera.')
					return null
				}

				const session = response.session
				if (!session || typeof session !== 'object' || !session.userId) {
					return null
				}

				return {
					userId: String(session.userId),
					loginAt: session.loginAt || new Date().toISOString(),
				}
			}

			const storedSession = storageService.readJson(this.storageKey, null)
			if (!storedSession || typeof storedSession !== 'object' || !storedSession.userId) {
				return null
			}

			return {
				userId: String(storedSession.userId),
				loginAt: storedSession.loginAt || new Date().toISOString(),
			}
		},
		save(session) {
			if (remoteApi.isRemoteEnabled()) {
				notifyStorageError('Sesja serwerowa jest zarzadzana przez API logowania i nie moze byc zapisana lokalnie.')
				return
			}

			storageService.writeJson(this.storageKey, session)
		},
		clear() {
			if (remoteApi.isRemoteEnabled()) {
				const response = remoteApi.requestAuth({
					method: 'DELETE',
					path: 'session.php',
				})

				if (!response.ok) {
					notifyStorageError(response.message || 'Nie udalo sie wylogowac sesji serwerowej.')
				}
				return
			}

			storageService.remove(this.storageKey)
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
		getTheme() {
			const scopedKey = this.getThemeStorageKey()
			const scopedTheme = storageService.getText(scopedKey, '')
			if (['light', 'dark', 'rossmann'].includes(scopedTheme)) {
				return scopedTheme
			}

			const legacyTheme = storageService.getText(PREFERENCE_KEYS.THEME, 'light') || 'light'
			return ['light', 'dark', 'rossmann'].includes(legacyTheme) ? legacyTheme : 'light'
		},
		setTheme(theme) {
			const normalizedTheme = ['light', 'dark', 'rossmann'].includes(theme) ? theme : 'light'
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
		getWideMode() {
			return storageService.getBoolean(PREFERENCE_KEYS.WIDE_MODE, false)
		},
		setWideMode(isWide) {
			storageService.setBoolean(PREFERENCE_KEYS.WIDE_MODE, isWide)
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
		getDashboardTaskAutoclear() {
			return storageService.getBoolean(PREFERENCE_KEYS.DASHBOARD_TASK_AUTOCLEAR, false)
		},
		setDashboardTaskAutoclear(isEnabled) {
			storageService.setBoolean(PREFERENCE_KEYS.DASHBOARD_TASK_AUTOCLEAR, isEnabled)
		},
	}

	appServices.storageService = storageService
	appServices.remoteApi = remoteApi
	appServices.usersService = usersService
	appServices.sessionService = sessionService
	appServices.hiresService = createCollectionService(STORAGE_KEYS.HIRES)
	appServices.monitorService = createCollectionService(STORAGE_KEYS.MONITOR)
	appServices.exchangesService = createCollectionService(STORAGE_KEYS.EXCHANGES)
	appServices.bookmarksService = bookmarksService
	appServices.preferencesService = preferencesService
})()
