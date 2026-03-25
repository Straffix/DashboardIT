(function initializeDashboardDemoControls() {
	const DEMO_MARKER_KEY = 'dashboard_demo_seed_marker'
	const PLANNER_STORAGE_KEYS = {
		TASKS: 'dashboard-tasks',
		REMINDERS: 'dashboard-task-reminders',
		AUTOCLEAR: 'dashboard-task-autoclear',
	}

	const fallbackStorageKeys = {
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

	const onReady = callback => {
		if (document.readyState === 'loading') {
			document.addEventListener('DOMContentLoaded', callback, { once: true })
			return
		}

		callback()
	}

	const getStorageService = () => window.AppServices?.storageService
	const getStorageKeys = () => window.AppUtils?.config?.STORAGE_KEYS || fallbackStorageKeys

	const setJson = (key, value) => {
		const storageService = getStorageService()
		if (storageService?.writeJson) {
			storageService.writeJson(key, value)
			return
		}

		localStorage.setItem(key, JSON.stringify(value))
	}

	const setText = (key, value) => {
		const storageService = getStorageService()
		if (storageService?.setText) {
			storageService.setText(key, value)
			return
		}

		localStorage.setItem(key, String(value ?? ''))
	}

	const removeKey = key => {
		const storageService = getStorageService()
		if (storageService?.remove) {
			storageService.remove(key)
			return
		}

		localStorage.removeItem(key)
	}

	const confirmAction = options => {
		if (typeof window.AppUtils?.confirmDialog === 'function') {
			return window.AppUtils.confirmDialog(options)
		}

		return Promise.resolve(window.confirm(options?.message || 'Czy na pewno chcesz kontynuowac?'))
	}

	const ensureDemoPanel = () => {
		const existingPanel = document.getElementById('dashboard-demo-panel')
		if (existingPanel) {
			return existingPanel
		}

		if (!document.body) {
			return null
		}

		const panel = document.createElement('section')
		panel.className = 'dashboard-demo-panel'
		panel.id = 'dashboard-demo-panel'
		panel.setAttribute('aria-label', 'Panel danych testowych')
		panel.innerHTML = `
			<p class="dashboard-demo-status" id="dashboard-demo-status">tryb pusty</p>
			<div class="dashboard-demo-actions">
				<button type="button" class="dashboard-demo-btn" id="dashboard-demo-seed-btn" title="Wgraj dane demo">
					Demo
				</button>
				<button type="button" class="dashboard-demo-btn is-danger" id="dashboard-demo-clear-btn" title="Usun dane demo">
					Reset
				</button>
			</div>
		`

		document.body.appendChild(panel)
		return panel
	}

	onReady(() => {
		const panel = ensureDemoPanel()
		const statusLabel = document.getElementById('dashboard-demo-status')
		const seedButton = document.getElementById('dashboard-demo-seed-btn')
		const clearButton = document.getElementById('dashboard-demo-clear-btn')

		if (!panel || !statusLabel || !seedButton || !clearButton) {
			return
		}

		const refreshPanelState = () => {
			const isSeeded = Boolean(localStorage.getItem(DEMO_MARKER_KEY))
			statusLabel.textContent = isSeeded ? 'demo.admin / admin123' : 'tryb pusty'
			clearButton.disabled = !isSeeded
			panel.dataset.state = isSeeded ? 'seeded' : 'empty'
		}

		const setBusyState = isBusy => {
			seedButton.disabled = isBusy
			clearButton.disabled = isBusy || !localStorage.getItem(DEMO_MARKER_KEY)
			panel.setAttribute('aria-busy', String(isBusy))
		}

		const reloadDashboard = () => {
			window.setTimeout(() => {
				window.location.reload()
			}, 180)
		}

		const writeSeedData = payload => {
			const storageKeys = getStorageKeys()

			setJson(storageKeys.USERS, payload.users || [])
			setJson(storageKeys.SESSION, payload.session || null)
			setJson(storageKeys.HIRES, payload.hires || [])
			setJson(storageKeys.MONITOR, payload.monitor || [])
			setJson(storageKeys.EXCHANGES, payload.exchanges || [])
			setJson(storageKeys.BOOKMARKS, payload.bookmarks || [])
			setJson(storageKeys.LUNCH, payload.lunchReservations || [])
			setJson(storageKeys.NOTES, payload.notes || [])
			setJson(storageKeys.ANNOUNCEMENTS, payload.announcements || [])
			setJson(storageKeys.TASKS, payload.noteTasks || [])
			setJson(PLANNER_STORAGE_KEYS.TASKS, payload.plannerTasks || [])
			setJson(PLANNER_STORAGE_KEYS.REMINDERS, payload.plannerReminders || [])
			setText(PLANNER_STORAGE_KEYS.AUTOCLEAR, String(Boolean(payload.plannerAutoclear)))
			setText(DEMO_MARKER_KEY, new Date().toISOString())
		}

		const clearSeedData = () => {
			const storageKeys = getStorageKeys()
			;[
				storageKeys.USERS,
				storageKeys.SESSION,
				storageKeys.HIRES,
				storageKeys.MONITOR,
				storageKeys.EXCHANGES,
				storageKeys.BOOKMARKS,
				storageKeys.LUNCH,
				storageKeys.NOTES,
				storageKeys.ANNOUNCEMENTS,
				storageKeys.TASKS,
				PLANNER_STORAGE_KEYS.TASKS,
				PLANNER_STORAGE_KEYS.REMINDERS,
				PLANNER_STORAGE_KEYS.AUTOCLEAR,
				DEMO_MARKER_KEY,
			].forEach(removeKey)
		}

		seedButton.addEventListener('click', async () => {
			const shouldSeed = await confirmAction({
				title: 'Wgrac dane demo?',
				message: 'To nadpisze lokalne dane testowe w tabelach, notatkach, obiadach, zakladkach i koncie uzytkownika.',
				confirmLabel: 'Wgraj demo',
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
				statusLabel.textContent = 'odswiezanie...'
				reloadDashboard()
			} catch (error) {
				setBusyState(false)
				refreshPanelState()
				window.AppUtils?.notify?.({
					type: 'error',
					title: 'Blad danych demo',
					message: error?.message || 'Nie udalo sie zapisac danych demo.',
				})
			}
		})

		clearButton.addEventListener('click', async () => {
			const shouldClear = await confirmAction({
				title: 'Usunac dane demo?',
				message: 'To wyczysci lokalne dane testowe ze wszystkich modulow oraz konto demo zapisane w tej przegladarce.',
				confirmLabel: 'Usun dane',
				cancelLabel: 'Anuluj',
			})

			if (!shouldClear) {
				return
			}

			try {
				setBusyState(true)
				clearSeedData()
				statusLabel.textContent = 'czyszczenie...'
				reloadDashboard()
			} catch (error) {
				setBusyState(false)
				refreshPanelState()
				window.AppUtils?.notify?.({
					type: 'error',
					title: 'Blad czyszczenia',
					message: error?.message || 'Nie udalo sie usunac danych demo.',
				})
			}
		})

		refreshPanelState()
	})
})()
