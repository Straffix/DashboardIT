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
	// LIVE_SERVER_FALLBACK_START
	const liveServerBrowserFallbackConfig = runtimeConfig.liveServerBrowserFallback || {}
	// LIVE_SERVER_FALLBACK_END
	const DEFAULT_API_BASE = './api/'
	const URL_SCHEME_PATTERN = /^[a-z][a-z0-9+.-]*:/i
	const THEME_FALLBACK_KEY = `${PREFERENCE_KEYS.THEME}-fallback`
	const THEME_GUEST_KEY = `${PREFERENCE_KEYS.THEME}::guest`
	const THEME_USER_KEY_PREFIX = `${PREFERENCE_KEYS.THEME}::user::`
	const THEME_FALLBACK_GUEST_KEY = `${THEME_FALLBACK_KEY}::guest`
	const THEME_FALLBACK_USER_KEY_PREFIX = `${THEME_FALLBACK_KEY}::user::`
	const DASHBOARD_MENU_ORDER_GUEST_KEY = `${PREFERENCE_KEYS.DASHBOARD_MENU_ORDER}::guest`
	const DASHBOARD_MENU_ORDER_USER_KEY_PREFIX = `${PREFERENCE_KEYS.DASHBOARD_MENU_ORDER}::user::`
	// LIVE_SERVER_FALLBACK_START
	const LIVE_SERVER_BROWSER_RESET_MARKER_PREFIX = 'dashboard_live_server_fallback_reset::'
	const LIVE_SERVER_BROWSER_RESET_KEY_PREFIXES = [
		THEME_USER_KEY_PREFIX,
		THEME_FALLBACK_USER_KEY_PREFIX,
		DASHBOARD_MENU_ORDER_USER_KEY_PREFIX,
		'dashboard_app_remote_reset::',
	]
	// LIVE_SERVER_FALLBACK_END
	const REMOTE_SHARED_KEYS = new Set([
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
		...REMOTE_SHARED_KEYS,
		DASHBOARD_MENU_ORDER_GUEST_KEY,
		PREFERENCE_KEYS.DASHBOARD_MENU_ORDER,
		PREFERENCE_KEYS.DASHBOARD_TASKS,
		PREFERENCE_KEYS.DASHBOARD_TASK_REMINDERS,
	])
	const PROTECTED_WRITE_KEY_PREFIXES = [DASHBOARD_MENU_ORDER_USER_KEY_PREFIX]
	const PUBLIC_WRITE_KEYS = new Set([
		STORAGE_KEYS.DASHBOARD_ACTIVE_USERS,
		STORAGE_KEYS.NOTES_ACTIVE_VIEWERS,
	])

	let remoteEnabledCache = null
	let remoteHealthChecked = false
	let lastStorageErrorMessage = ''
	let lastStorageErrorAt = 0

	// LIVE_SERVER_FALLBACK_START
	const isLiveServerBrowserFallbackAllowed = () => {
		if (liveServerBrowserFallbackConfig?.enabled === false) return false
		if (window.location.protocol === 'file:') return true

		const allowedHosts = Array.isArray(liveServerBrowserFallbackConfig?.allowedHosts) && liveServerBrowserFallbackConfig.allowedHosts.length > 0
			? liveServerBrowserFallbackConfig.allowedHosts
			: ['127.0.0.1', 'localhost']
		const currentHost = String(window.location.hostname || '').trim().toLowerCase()
		return allowedHosts.map(host => String(host || '').trim().toLowerCase()).includes(currentHost)
	}
	// LIVE_SERVER_FALLBACK_END

	const getConfiguredApiBase = () => {
		const documentUrl = new URL(document.baseURI)
		const configuredBase = String(runtimeConfig.apiBaseUrl || DEFAULT_API_BASE).trim()
		const candidateBase = configuredBase || DEFAULT_API_BASE
		const normalizedBase = candidateBase.endsWith('/') ? candidateBase : `${candidateBase}/`

		try {
			const resolvedBase = new URL(normalizedBase, documentUrl)
			const isSafeProtocol = ['http:', 'https:', 'file:'].includes(resolvedBase.protocol)
			const isSameOrigin = documentUrl.protocol === 'file:'
				? resolvedBase.protocol === 'file:'
				: resolvedBase.origin === documentUrl.origin

			if (isSafeProtocol && isSameOrigin) {
				return resolvedBase
			}
		} catch (error) {
			// Ignore invalid runtime config values and fall back to the bundled API path.
		}

		return new URL(DEFAULT_API_BASE, documentUrl)
	}

	const resolveApiUrl = path => {
		const apiBaseUrl = getConfiguredApiBase()
		const rawPath = String(path || '').trim()
		if (!rawPath) return ''

		const normalizedPath = rawPath.replace(/^\/+/, '')
		const pathWithoutSearch = normalizedPath.split(/[?#]/, 1)[0]
		const pathSegments = pathWithoutSearch.split('/').filter(Boolean)
		const hasUnsafeTraversal = pathSegments.includes('..')
		const hasUnsafeCharacters = /[\r\n\\]/.test(normalizedPath)
		const hasExplicitScheme = URL_SCHEME_PATTERN.test(normalizedPath)
		const isProtocolRelative = normalizedPath.startsWith('//')

		if (hasUnsafeTraversal || hasUnsafeCharacters || hasExplicitScheme || isProtocolRelative) {
			return ''
		}

		const resolvedUrl = new URL(normalizedPath, apiBaseUrl)
		const isSameOrigin = apiBaseUrl.protocol === 'file:'
			? resolvedUrl.protocol === 'file:'
			: resolvedUrl.origin === apiBaseUrl.origin

		if (!isSameOrigin || !resolvedUrl.pathname.startsWith(apiBaseUrl.pathname)) {
			return ''
		}

		return resolvedUrl.toString()
	}

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

	const pulseBrowserStorageKey = key => {
		try {
			localStorage.setItem(
				String(key || ''),
				JSON.stringify({
					syncedAt: new Date().toISOString(),
				})
			)
		} catch (error) {
			// Ignore sync pulse failures. They are best-effort only.
		}
	}

	// LIVE_SERVER_FALLBACK_START
	const clearBrowserFallbackStorageOnce = () => {
		const resetVersion = String(liveServerBrowserFallbackConfig?.resetVersion || '').trim()
		if (!resetVersion) return
		if (remoteApi.isRemoteEnabled() || !isLiveServerBrowserFallbackAllowed()) return

		const resetMarkerKey = `${LIVE_SERVER_BROWSER_RESET_MARKER_PREFIX}${resetVersion}`

		try {
			if (localStorage.getItem(resetMarkerKey)) {
				return
			}

			const keysToRemove = new Set([
				...Object.values(STORAGE_KEYS || {}),
				...Object.values(PREFERENCE_KEYS || {}),
				THEME_FALLBACK_KEY,
				THEME_GUEST_KEY,
				THEME_FALLBACK_GUEST_KEY,
				DASHBOARD_MENU_ORDER_GUEST_KEY,
			])
			const dynamicKeys = []

			for (let index = 0; index < localStorage.length; index += 1) {
				const storageKey = localStorage.key(index)
				if (!storageKey || storageKey === resetMarkerKey) continue
				if (
					LIVE_SERVER_BROWSER_RESET_KEY_PREFIXES.some(prefix => storageKey.startsWith(prefix)) ||
					storageKey.startsWith(LIVE_SERVER_BROWSER_RESET_MARKER_PREFIX)
				) {
					dynamicKeys.push(storageKey)
				}
			}

			dynamicKeys.forEach(storageKey => keysToRemove.add(storageKey))
			keysToRemove.forEach(storageKey => localStorage.removeItem(storageKey))
			localStorage.setItem(resetMarkerKey, new Date().toISOString())
		} catch (error) {
			// Ignore browser reset failures and keep the fallback mode available.
		}
	}
	// LIVE_SERVER_FALLBACK_END

	const sendRemoteRequest = ({ method = 'GET', path = '', body = null } = {}) => {
		const xhr = new XMLHttpRequest()
		const url = resolveApiUrl(path)
		if (!url) {
			return {
				ok: false,
				status: 0,
				message: 'Konfiguracja adresu API jest nieprawidlowa.',
				payload: null,
			}
		}

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

			if (window.location.protocol === 'file:') {
				remoteEnabledCache = false
				return false
			}

			const response = sendRemoteRequest({ path: 'health.php' })
			remoteEnabledCache = Boolean(response.ok)
			return Boolean(remoteEnabledCache)
		},
	}

	const isRemoteKey = key => REMOTE_SHARED_KEYS.has(String(key || ''))
	const isProtectedWriteKey = key => {
		const normalizedKey = String(key || '')
		if (PUBLIC_WRITE_KEYS.has(normalizedKey)) return false

		return (
			PROTECTED_WRITE_KEYS.has(normalizedKey) ||
			PROTECTED_WRITE_KEY_PREFIXES.some(prefix => normalizedKey.startsWith(prefix))
		)
	}
	const canWriteProtectedKey = key => !isProtectedWriteKey(key) || Boolean(window.AppUtils?.auth?.isAuthenticated?.())

	const notifyStorageError = message => {
		const normalizedMessage = String(message || '').trim()
		if (!normalizedMessage) return

		console.error('Storage synchronization error.')

		const now = Date.now()
		if (normalizedMessage === lastStorageErrorMessage && now - lastStorageErrorAt < 2500) {
			return
		}

		lastStorageErrorMessage = normalizedMessage
		lastStorageErrorAt = now

		if (typeof window.AppUtils?.notify === 'function') {
			window.AppUtils.notify({
				type: 'error',
				title: 'Blad synchronizacji',
				message: normalizedMessage,
			})
		}
	}

	const storageService = {
		isRemoteEnabled() {
			return remoteApi.isRemoteEnabled()
		},
		// LIVE_SERVER_FALLBACK_START
		isBrowserFallbackMode() {
			return !remoteApi.isRemoteEnabled() && isLiveServerBrowserFallbackAllowed()
		},
		// LIVE_SERVER_FALLBACK_END
		touch(key) {
			pulseBrowserStorageKey(key)
		},
		getText(key, fallback = '') {
			return readBrowserTextValue(key, fallback)
		},
		setText(key, value) {
			if (!canWriteProtectedKey(key)) return
			writeBrowserTextValue(key, value)
		},
		readJson(key, fallback) {
			if (isRemoteKey(key)) {
				// LIVE_SERVER_FALLBACK_START
				if (!remoteApi.isRemoteEnabled() && this.isBrowserFallbackMode()) {
					return readBrowserJsonValue(key, fallback)
				}
				// LIVE_SERVER_FALLBACK_END

				const response = remoteApi.request({
					path: `storage.php?key=${encodeURIComponent(String(key || ''))}`,
				})

				if (!response.ok) {
					notifyStorageError(response.message || 'Nie udalo sie pobrac danych z serwera.')
					return cloneValue(fallback)
				}

				return cloneValue(response.value ?? fallback)
			}

			return readBrowserJsonValue(key, fallback)
		},
		writeJson(key, value) {
			if (!canWriteProtectedKey(key)) return

			if (isRemoteKey(key)) {
				// LIVE_SERVER_FALLBACK_START
				if (!remoteApi.isRemoteEnabled() && this.isBrowserFallbackMode()) {
					writeBrowserJsonValue(key, value)
					return
				}
				// LIVE_SERVER_FALLBACK_END

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
					return
				}

				pulseBrowserStorageKey(key)
				return
			}

			writeBrowserJsonValue(key, value)
		},
		remove(key) {
			if (!canWriteProtectedKey(key)) return

			if (isRemoteKey(key)) {
				// LIVE_SERVER_FALLBACK_START
				if (!remoteApi.isRemoteEnabled() && this.isBrowserFallbackMode()) {
					removeBrowserValue(key)
					return
				}
				// LIVE_SERVER_FALLBACK_END

				const response = remoteApi.request({
					method: 'DELETE',
					path: `storage.php?key=${encodeURIComponent(String(key || ''))}`,
				})

				if (!response.ok) {
					notifyStorageError(response.message || 'Nie udalo sie usunac danych z serwera.')
					return
				}

				pulseBrowserStorageKey(key)
				removeBrowserValue(key)
				return
			}

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
		// Shared collections are synchronized through the generic storage endpoint.
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
			// LIVE_SERVER_FALLBACK_START
			if (!remoteApi.isRemoteEnabled() && storageService.isBrowserFallbackMode()) {
				const users = readBrowserJsonValue(this.storageKey, [])
				return Array.isArray(users) ? cloneValue(users) : []
			}
			// LIVE_SERVER_FALLBACK_END

			const response = remoteApi.requestAuth({ path: 'users.php' })
			if (!response.ok) {
				notifyStorageError(response.message || 'Nie udalo sie pobrac listy uzytkownikow.')
				return []
			}

			const users = Array.isArray(response.users) ? response.users : []
			return cloneValue(users)
		},
		saveAll(users) {
			// LIVE_SERVER_FALLBACK_START
			if (!remoteApi.isRemoteEnabled() && storageService.isBrowserFallbackMode()) {
				writeBrowserJsonValue(this.storageKey, Array.isArray(users) ? users : [])
				return
			}
			// LIVE_SERVER_FALLBACK_END

			notifyStorageError('Bezposredni zapis listy uzytkownikow jest w trybie serwerowym zablokowany.')
		},
		touch() {
			storageService.touch(this.storageKey)
		},
	}

	const sessionService = {
		storageKey: STORAGE_KEYS.SESSION,
		getCurrent() {
			// LIVE_SERVER_FALLBACK_START
			if (!remoteApi.isRemoteEnabled() && storageService.isBrowserFallbackMode()) {
				const session = readBrowserJsonValue(this.storageKey, null)
				if (!session || typeof session !== 'object' || !session.userId) {
					return null
				}

				return {
					userId: String(session.userId),
					loginAt: session.loginAt || new Date().toISOString(),
				}
			}
			// LIVE_SERVER_FALLBACK_END

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
		},
		save(session) {
			// LIVE_SERVER_FALLBACK_START
			if (!remoteApi.isRemoteEnabled() && storageService.isBrowserFallbackMode()) {
				if (!session || typeof session !== 'object' || !session.userId) {
					this.clear()
					return
				}

				writeBrowserJsonValue(this.storageKey, session)
				return
			}
			// LIVE_SERVER_FALLBACK_END

			if (!session || typeof session !== 'object' || !session.userId) {
				this.clear()
				return
			}

			storageService.touch(this.storageKey)
		},
		clear() {
			// LIVE_SERVER_FALLBACK_START
			if (!remoteApi.isRemoteEnabled() && storageService.isBrowserFallbackMode()) {
				removeBrowserValue(this.storageKey)
				return
			}
			// LIVE_SERVER_FALLBACK_END

			const response = remoteApi.requestAuth({
				method: 'DELETE',
				path: 'session.php',
			})

			if (!response.ok) {
				notifyStorageError(response.message || 'Nie udalo sie wylogowac sesji serwerowej.')
				return
			}

			pulseBrowserStorageKey(this.storageKey)
			removeBrowserValue(this.storageKey)
		},
		touch() {
			storageService.touch(this.storageKey)
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

	// LIVE_SERVER_FALLBACK_START
	clearBrowserFallbackStorageOnce()
	// LIVE_SERVER_FALLBACK_END

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
