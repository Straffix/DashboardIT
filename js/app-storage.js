(function initializeAppStorageServices() {
	const appServices = (window.AppServices = window.AppServices || {})

	if (appServices.storageService) {
		return
	}

	const STORAGE_KEYS = {
		HIRES: 'nowe_zatrudnienia_dane',
		MONITOR: 'monitor_laptopow_dane',
		EXCHANGES: 'wymiana_sprzetu_dane',
		USERS: 'dashboard_users',
		SESSION: 'dashboard_user_session',
		BOOKMARKS: 'dashboard_user_bookmarks',
		LUNCH: 'dashboard_lunch_reservations',
		NOTES: 'dashboard_notes_entries',
		ANNOUNCEMENTS: 'dashboard_notes_announcements',
		TASKS: 'dashboard_notes_tasks',
	}

	const PREFERENCE_KEYS = {
		THEME: 'dashboard-theme',
		WIDE_MODE: 'dashboard-wide-mode',
		WEATHER_LOCATION: 'dashboard-weather-location',
		DASHBOARD_MENU_ORDER: 'dashboard-menu-order',
		DASHBOARD_TASKS: 'dashboard-tasks',
		DASHBOARD_TASK_REMINDERS: 'dashboard-task-reminders',
		DASHBOARD_TASK_AUTOCLEAR: 'dashboard-task-autoclear',
	}

	const cloneValue = value => JSON.parse(JSON.stringify(value))

	const storageService = {
		getText(key, fallback = '') {
			try {
				const storedValue = localStorage.getItem(key)
				return storedValue === null ? fallback : storedValue
			} catch (error) {
				return fallback
			}
		},
		setText(key, value) {
			localStorage.setItem(key, String(value ?? ''))
		},
		readJson(key, fallback) {
			try {
				const storedValue = localStorage.getItem(key)
				if (!storedValue) return cloneValue(fallback)
				return JSON.parse(storedValue)
			} catch (error) {
				return cloneValue(fallback)
			}
		},
		writeJson(key, value) {
			localStorage.setItem(key, JSON.stringify(value))
		},
		remove(key) {
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

	const createCollectionService = ({ storageKey, entityName }) => ({
		storageKey,
		entityName,
		// TODO: replace this localStorage implementation with fetch/API calls when backend endpoints are ready.
		getAll() {
			const records = storageService.readJson(storageKey, [])
			return Array.isArray(records) ? records : []
		},
		saveAll(records) {
			storageService.writeJson(storageKey, Array.isArray(records) ? records : [])
		},
		clear() {
			storageService.remove(storageKey)
		},
	})

	const usersService = {
		storageKey: STORAGE_KEYS.USERS,
		// TODO: replace this localStorage implementation with fetch/API calls once backend users endpoints are ready.
		getAll() {
			const storedUsers = storageService.readJson(this.storageKey, [])
			return Array.isArray(storedUsers) ? storedUsers : []
		},
		saveAll(users) {
			storageService.writeJson(this.storageKey, Array.isArray(users) ? users : [])
		},
		getById(userId) {
			return this.getAll().find(user => String(user?.id || '') === String(userId || '')) || null
		},
		getByLogin(login) {
			const normalizedLogin = String(login || '').trim().toLowerCase()
			return this.getAll().find(user => String(user?.login || '').trim().toLowerCase() === normalizedLogin) || null
		},
	}

	const sessionService = {
		storageKey: STORAGE_KEYS.SESSION,
		// TODO: replace this localStorage implementation with backend session handling once auth API is ready.
		getCurrent() {
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
			storageService.writeJson(this.storageKey, session)
		},
		clear() {
			storageService.remove(this.storageKey)
		},
	}

	const bookmarksService = {
		...createCollectionService({
			storageKey: STORAGE_KEYS.BOOKMARKS,
			entityName: 'bookmarks',
		}),
		getByUserId(userId) {
			const normalizedUserId = String(userId || '')
			return this.getAll().filter(bookmark => String(bookmark?.userId || '') === normalizedUserId)
		},
	}

	const preferencesService = {
		getTheme() {
			return storageService.getText(PREFERENCE_KEYS.THEME, 'light') || 'light'
		},
		setTheme(theme) {
			storageService.setText(PREFERENCE_KEYS.THEME, theme)
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
			const menuOrder = storageService.readJson(PREFERENCE_KEYS.DASHBOARD_MENU_ORDER, [])
			return Array.isArray(menuOrder) ? menuOrder : []
		},
		saveDashboardMenuOrder(menuOrder) {
			storageService.writeJson(PREFERENCE_KEYS.DASHBOARD_MENU_ORDER, Array.isArray(menuOrder) ? menuOrder : [])
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
	appServices.usersService = usersService
	appServices.sessionService = sessionService
	appServices.hiresService = createCollectionService({
		storageKey: STORAGE_KEYS.HIRES,
		entityName: 'hires',
	})
	appServices.monitorService = createCollectionService({
		storageKey: STORAGE_KEYS.MONITOR,
		entityName: 'monitor devices',
	})
	appServices.exchangesService = createCollectionService({
		storageKey: STORAGE_KEYS.EXCHANGES,
		entityName: 'exchanges',
	})
	appServices.bookmarksService = bookmarksService
	appServices.preferencesService = preferencesService
})()
