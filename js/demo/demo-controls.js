(function initializeDashboardDemoControls() {
	const DEMO_MARKER_KEY = 'dashboard_demo_seed_marker'

	const onReady = callback => {
		if (document.readyState === 'loading') {
			document.addEventListener('DOMContentLoaded', callback, { once: true })
			return
		}

		callback()
	}

	const getStorageService = () => window.AppServices?.storageService
	const getRemoteApi = () => window.AppServices?.remoteApi
	const getStorageKeys = () => window.AppUtils.config.STORAGE_KEYS
	const getPreferenceKeys = () => window.AppUtils.config.PREFERENCE_KEYS
	const isRemoteMode = () => Boolean(getStorageService()?.isRemoteEnabled?.())

	const getJson = (key, fallback) => {
		const storageService = getStorageService()
		if (storageService?.readJson) {
			return storageService.readJson(key, fallback)
		}

		try {
			const storedValue = localStorage.getItem(key)
			return storedValue ? JSON.parse(storedValue) : fallback
		} catch (error) {
			return fallback
		}
	}

	const setJson = (key, value) => {
		localStorage.setItem(key, JSON.stringify(value))
	}

	const setText = (key, value) => {
		localStorage.setItem(key, String(value ?? ''))
	}

	const removeKey = key => {
		localStorage.removeItem(key)
	}

	const confirmAction = options => {
		if (typeof window.AppUtils?.confirmDialog === 'function') {
			return window.AppUtils.confirmDialog(options)
		}

		return Promise.resolve(window.confirm(options?.message || 'Czy na pewno chcesz kontynuowac?'))
	}

	const requestRemoteDemo = ({ method = 'GET', payload = null } = {}) => {
		const response = getRemoteApi()?.request?.({
			method,
			path: 'demo.php',
			body: payload,
		})

		if (!response?.ok) {
			throw new Error(response?.message || 'Nie udalo sie obsluzyc danych demo na serwerze.')
		}

		return response
	}

	const markLocalDemoRecords = records =>
		Array.isArray(records)
			? records
					.filter(record => record && typeof record === 'object')
					.map(record => ({
						...record,
						isDemo: true,
					}))
			: []

	const mergeLocalDemoRecords = (existingRecords, demoRecords) => {
		const safeExistingRecords = Array.isArray(existingRecords)
			? existingRecords.filter(record => record && typeof record === 'object')
			: []
		const cleanExistingRecords = safeExistingRecords.filter(record => !record.isDemo)
		return [...cleanExistingRecords, ...markLocalDemoRecords(demoRecords)]
	}

	const isSessionBoundToDemoUser = (session, users) => {
		if (!session || typeof session !== 'object') {
			return false
		}

		const matchedUser = Array.isArray(users)
			? users.find(user => String(user?.id || '') === String(session.userId || ''))
			: null

		return Boolean(matchedUser?.isDemo)
	}

	const getDemoButtonHost = () =>
		document.querySelector('.theme-toggle-submenu') ||
		document.querySelector('.dashboard-theme-bookmark-slot') ||
		document.querySelector('.dashboard-topbar') ||
		document.body

	const ensureDemoButton = () => {
		if (!document.body?.classList.contains('dashboard-page')) {
			document.getElementById('dashboard-demo-toggle-btn')?.remove()
			return null
		}

		const existingButton = document.getElementById('dashboard-demo-toggle-btn')
		const host = getDemoButtonHost()

		if (existingButton) {
			if (host && existingButton.parentElement !== host) {
				host.appendChild(existingButton)
			}
			return existingButton
		}

		if (!document.body || !host) {
			return null
		}

		const button = document.createElement('button')
		button.type = 'button'
		button.className = 'dashboard-demo-toggle-btn theme-toggle-option'
		button.id = 'dashboard-demo-toggle-btn'
		button.setAttribute('aria-live', 'polite')
		button.innerHTML = `
			<span class="theme-toggle-option-badge dashboard-demo-toggle-badge" aria-hidden="true">
				<i class="fa-solid fa-database"></i>
			</span>
			<span>Demo Mode</span>
		`

		host.appendChild(button)

		return button
	}

	onReady(() => {
		const demoButton = ensureDemoButton()

		if (!demoButton) {
			return
		}

		const refreshButtonState = () => {
			let isSeeded = false

			if (isRemoteMode()) {
				try {
					isSeeded = Boolean(requestRemoteDemo().seeded)
				} catch (error) {
					isSeeded = false
				}
			} else {
				isSeeded = Boolean(localStorage.getItem(DEMO_MARKER_KEY))
			}

			demoButton.dataset.state = isSeeded ? 'seeded' : 'empty'
			demoButton.setAttribute('aria-pressed', String(isSeeded))
			demoButton.classList.toggle('is-active', isSeeded)
			demoButton.setAttribute('aria-label', isSeeded ? 'Usun przykladowe dane demo' : 'Wgraj przykladowe dane demo')
			demoButton.innerHTML = `
				<span class="theme-toggle-option-badge dashboard-demo-toggle-badge" aria-hidden="true">
					<i class="fa-solid fa-database"></i>
				</span>
				<span>Demo Mode</span>
			`
			demoButton.removeAttribute('title')
		}

		const setBusyState = isBusy => {
			demoButton.disabled = isBusy
			demoButton.setAttribute('aria-busy', String(isBusy))
			demoButton.classList.toggle('is-busy', isBusy)
			if (!isBusy) refreshButtonState()
		}

		const reloadDashboard = () => {
			window.setTimeout(() => {
				window.location.reload()
			}, 180)
		}

		const applyLocalDemoPreferences = payload => {
			const preferenceKeys = getPreferenceKeys()
			setJson(preferenceKeys.DASHBOARD_TASKS, payload.plannerTasks || [])
			setJson(preferenceKeys.DASHBOARD_TASK_REMINDERS, payload.plannerReminders || [])
			setText(preferenceKeys.DASHBOARD_TASK_AUTOCLEAR, String(Boolean(payload.plannerAutoclear)))
		}

		const clearLocalDemoPreferences = () => {
			const preferenceKeys = getPreferenceKeys()
			;[
				preferenceKeys.DASHBOARD_TASKS,
				preferenceKeys.DASHBOARD_TASK_REMINDERS,
				preferenceKeys.DASHBOARD_TASK_AUTOCLEAR,
			].forEach(removeKey)
		}

		const writeSeedData = payload => {
			if (isRemoteMode()) {
				applyLocalDemoPreferences(payload)
				requestRemoteDemo({
					method: 'POST',
					payload,
				})
				return
			}

			const storageKeys = getStorageKeys()
			const existingUsers = getJson(storageKeys.USERS, [])
			const existingSession = getJson(storageKeys.SESSION, null)
			const nextUsers = mergeLocalDemoRecords(existingUsers, payload.users || [])
			const shouldReplaceSession = !existingSession || isSessionBoundToDemoUser(existingSession, existingUsers)

			setJson(storageKeys.USERS, nextUsers)
			if (shouldReplaceSession) {
				setJson(storageKeys.SESSION, payload.session || null)
			}
			setJson(storageKeys.HIRES, mergeLocalDemoRecords(getJson(storageKeys.HIRES, []), payload.hires || []))
			setJson(storageKeys.MONITOR, mergeLocalDemoRecords(getJson(storageKeys.MONITOR, []), payload.monitor || []))
			setJson(storageKeys.EXCHANGES, mergeLocalDemoRecords(getJson(storageKeys.EXCHANGES, []), payload.exchanges || []))
			setJson(storageKeys.BOOKMARKS, mergeLocalDemoRecords(getJson(storageKeys.BOOKMARKS, []), payload.bookmarks || []))
			setJson(storageKeys.LUNCH, mergeLocalDemoRecords(getJson(storageKeys.LUNCH, []), payload.lunchReservations || []))
			setJson(storageKeys.NOTES, mergeLocalDemoRecords(getJson(storageKeys.NOTES, []), payload.notes || []))
			setJson(
				storageKeys.ANNOUNCEMENTS,
				mergeLocalDemoRecords(getJson(storageKeys.ANNOUNCEMENTS, []), payload.announcements || [])
			)
			setJson(storageKeys.TASKS, mergeLocalDemoRecords(getJson(storageKeys.TASKS, []), payload.noteTasks || []))
			applyLocalDemoPreferences(payload)
			setText(DEMO_MARKER_KEY, new Date().toISOString())
		}

		const clearSeedData = () => {
			if (isRemoteMode()) {
				clearLocalDemoPreferences()
				requestRemoteDemo({
					method: 'DELETE',
				})
				return
			}

			const storageKeys = getStorageKeys()
			const existingUsers = getJson(storageKeys.USERS, [])
			const existingSession = getJson(storageKeys.SESSION, null)
			const nextUsers = mergeLocalDemoRecords(existingUsers, [])
			clearLocalDemoPreferences()
			setJson(storageKeys.USERS, nextUsers)
			setJson(storageKeys.HIRES, mergeLocalDemoRecords(getJson(storageKeys.HIRES, []), []))
			setJson(storageKeys.MONITOR, mergeLocalDemoRecords(getJson(storageKeys.MONITOR, []), []))
			setJson(storageKeys.EXCHANGES, mergeLocalDemoRecords(getJson(storageKeys.EXCHANGES, []), []))
			setJson(storageKeys.BOOKMARKS, mergeLocalDemoRecords(getJson(storageKeys.BOOKMARKS, []), []))
			setJson(storageKeys.LUNCH, mergeLocalDemoRecords(getJson(storageKeys.LUNCH, []), []))
			setJson(storageKeys.NOTES, mergeLocalDemoRecords(getJson(storageKeys.NOTES, []), []))
			setJson(storageKeys.ANNOUNCEMENTS, mergeLocalDemoRecords(getJson(storageKeys.ANNOUNCEMENTS, []), []))
			setJson(storageKeys.TASKS, mergeLocalDemoRecords(getJson(storageKeys.TASKS, []), []))

			if (isSessionBoundToDemoUser(existingSession, existingUsers)) {
				removeKey(storageKeys.SESSION)
			}

			removeKey(DEMO_MARKER_KEY)
		}

		demoButton.addEventListener('click', async () => {
			let isSeeded = false

			if (isRemoteMode()) {
				try {
					isSeeded = Boolean(requestRemoteDemo().seeded)
				} catch (error) {
					window.AppUtils?.notify?.({
						type: 'error',
						title: 'Brak polaczenia z demo',
						message: error?.message || 'Nie udalo sie sprawdzic statusu danych demo na serwerze.',
					})
					return
				}
			} else {
				isSeeded = Boolean(localStorage.getItem(DEMO_MARKER_KEY))
			}

			if (!isSeeded) {
				const shouldSeed = await confirmAction({
					title: 'Wgrac przykladowe dane?',
					message: isRemoteMode()
						? 'To doda lub odswiezy tylko rekordy oznaczone jako demo. Prawdziwe konta i normalne wpisy pozostana bez zmian.'
						: 'To nadpisze lokalne dane testowe w tabelach, notatkach, obiadach, zakladkach i koncie uzytkownika.',
					confirmLabel: 'Wgraj dane',
					cancelLabel: 'Anuluj',
				})

				if (!shouldSeed) {
					return
				}

				const payload = window.DashboardDemoSeedData?.buildSeedPayload?.()
				if (!payload) {
					window.AppUtils?.notify?.({
						type: 'error',
						title: 'Brak danych demo',
						message: 'Nie znaleziono pliku z danymi testowymi w folderze trash.',
					})
					return
				}

				try {
					setBusyState(true)
					writeSeedData(payload)
					reloadDashboard()
				} catch (error) {
					setBusyState(false)
					window.AppUtils?.notify?.({
						type: 'error',
						title: 'Blad danych demo',
						message: error?.message || 'Nie udalo sie zapisac danych demo.',
					})
				}

				return
			}

			const shouldClear = await confirmAction({
				title: 'Usunac przykladowe dane?',
				message: isRemoteMode()
					? 'To usunie tylko rekordy i konta oznaczone jako demo. Prawdziwi uzytkownicy oraz normalne wpisy zostana nienaruszone.'
					: 'To wyczysci lokalne dane testowe ze wszystkich modulow oraz konto demo zapisane w tej przegladarce.',
				confirmLabel: 'Usun dane',
				cancelLabel: 'Anuluj',
			})

			if (!shouldClear) {
				return
			}

			try {
				setBusyState(true)
				clearSeedData()
				reloadDashboard()
			} catch (error) {
				setBusyState(false)
				window.AppUtils?.notify?.({
					type: 'error',
					title: 'Blad czyszczenia',
					message: error?.message || 'Nie udalo sie usunac danych demo.',
				})
			}
		})

		window.addEventListener('storage', event => {
			if (!isRemoteMode() && event.key === DEMO_MARKER_KEY) {
				refreshButtonState()
			}
		})

		window.addEventListener('focus', refreshButtonState)
		document.addEventListener('app-auth-changed', refreshButtonState)
		refreshButtonState()
	})
})()
