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

	const ensureDemoButton = () => {
		const existingButton = document.getElementById('dashboard-demo-toggle-btn')
		if (existingButton) {
			return existingButton
		}

		if (!document.body) {
			return null
		}

		const button = document.createElement('button')
		button.type = 'button'
		button.className = 'dashboard-demo-toggle-btn'
		button.id = 'dashboard-demo-toggle-btn'
		button.setAttribute('aria-live', 'polite')
		button.innerHTML = '<span>Wgraj przykladowe dane</span>'

		const dashboardBookmarkSlot = document.querySelector('.dashboard-theme-bookmark-slot')
		const dashboardTopbar = document.querySelector('.dashboard-topbar')
		const themeToggle = document.querySelector('.theme-toggle-btn')

		if (dashboardBookmarkSlot) {
			dashboardBookmarkSlot.appendChild(button)
		} else if (themeToggle) {
			themeToggle.insertAdjacentElement('afterend', button)
		} else if (dashboardTopbar) {
			dashboardTopbar.prepend(button)
		} else {
			document.body.appendChild(button)
		}

		return button
	}

	onReady(() => {
		const demoButton = ensureDemoButton()

		if (!demoButton) {
			return
		}

		const refreshButtonState = () => {
			const isSeeded = Boolean(localStorage.getItem(DEMO_MARKER_KEY))
			demoButton.dataset.state = isSeeded ? 'seeded' : 'empty'
			demoButton.setAttribute('aria-pressed', String(isSeeded))
			demoButton.title = isSeeded ? 'Usun przykladowe dane' : 'Wgraj przykladowe dane'
			demoButton.querySelector('span')?.replaceChildren(
				document.createTextNode(isSeeded ? 'Usun przykladowe dane' : 'Wgraj przykladowe dane'),
			)
		}

		const setBusyState = isBusy => {
			demoButton.disabled = isBusy
			demoButton.setAttribute('aria-busy', String(isBusy))
			if (isBusy) {
				demoButton.querySelector('span')?.replaceChildren(document.createTextNode('Przetwarzanie...'))
			} else {
				refreshButtonState()
			}
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

		demoButton.addEventListener('click', async () => {
			const isSeeded = Boolean(localStorage.getItem(DEMO_MARKER_KEY))

			if (!isSeeded) {
				const shouldSeed = await confirmAction({
					title: 'Wgrac przykladowe dane?',
					message: 'To nadpisze lokalne dane testowe w tabelach, notatkach, obiadach, zakladkach i koncie uzytkownika.',
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
			if (event.key === DEMO_MARKER_KEY) {
				refreshButtonState()
			}
		})

		refreshButtonState()
	})
})()
