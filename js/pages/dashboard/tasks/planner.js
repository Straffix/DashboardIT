(function initializeDashboardTaskPlannerModule() {
	const dashboardModules = (window.DashboardModules = window.DashboardModules || {})
	const escapeHtml =
		window.AppUtils?.escapeHtml ||
		(value =>
			String(value || '')
				.replaceAll('&', '&amp;')
				.replaceAll('<', '&lt;')
				.replaceAll('>', '&gt;')
				.replaceAll('"', '&quot;')
				.replaceAll("'", '&#39;'))

	const priorityMap = {
		high: { label: 'Wysoki', className: 'is-high' },
		medium: { label: 'Sredni', className: 'is-medium' },
		low: { label: 'Niski', className: 'is-low' },
	}
	const preferenceKeys = window.AppUtils.config.PREFERENCE_KEYS

	const weekdayLabels = ['Pn', 'Wt', 'Sr', 'Cz', 'Pt', 'Sb', 'Nd']
	const taskConfig = {
		storageKey: preferenceKeys.DASHBOARD_TASKS,
		reminderKey: preferenceKeys.DASHBOARD_TASK_REMINDERS,
		autoclearKey: preferenceKeys.DASHBOARD_TASK_AUTOCLEAR,
		reminderLeadMinutes: 5,
		reminderGraceMinutes: 10,
	}

	const padNumber = value => String(value).padStart(2, '0')
	const formatTaskDateKey = date =>
		`${date.getFullYear()}-${padNumber(date.getMonth() + 1)}-${padNumber(date.getDate())}`
	const getTaskDateTime = task => new Date(`${task.date}T${task.time || '00:00'}`)
	const compareTasks = (left, right) => getTaskDateTime(left) - getTaskDateTime(right)

	const normalizeStoredTask = task => {
		const title = String(task?.title || '').trim()
		const date = String(task?.date || '').trim()
		const time = String(task?.time || '').trim()

		if (!title || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) {
			return null
		}

		return {
			id: String(task?.id || `task-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`),
			title,
			date,
			time,
			priority: priorityMap[task?.priority] ? task.priority : 'medium',
			description: String(task?.description || '').trim(),
		}
	}

	dashboardModules.createTaskPlannerController = ({ elements, services } = {}) => {
		const {
			clockWidgetTrigger,
			taskPreviewList,
			taskModal,
			taskForm,
			taskTitleInput,
			taskDateInput,
			taskTimeInput,
			taskHourInput,
			taskMinuteInput,
			taskPriorityInput,
			taskDescriptionInput,
			taskCalendarMonth,
			taskCalendarGrid,
			taskCalendarWeekdays,
			taskAgendaTitle,
			taskAgendaCount,
			taskAgendaList,
			taskCalendarPrev,
			taskCalendarNext,
			taskToastStack,
			taskAutoclearToggle,
		} = elements || {}
		const { storageService, preferencesService } = services || {}

		const reminderController = dashboardModules.createTaskReminderController?.({
			taskToastStack,
			onTaskSelected: task => {
				selectTaskDate(task.date, { syncCursor: true })
				openTaskModal()
			},
		})

		let tasks = []
		let selectedTaskDate = formatTaskDateKey(new Date())
		let calendarCursor = new Date()
		let remindedTaskIds = new Set()
		let autoClearEnabled = false
		let reminderTimerId = null
		const isAuthenticated = () => Boolean(window.AppUtils?.auth?.isAuthenticated?.())
		const requireAuthenticatedAction = (message = 'Musisz byc zalogowany, aby zarzadzac zadaniami dashboardu.') => {
			if (isAuthenticated()) return true

			window.AppUtils?.notify?.({
				type: 'warning',
				title: 'Tylko podglad',
				message,
			})
			window.AppUtils?.auth?.openAuthModal?.('login')
			return false
		}

		const loadTasks = () => {
			const storedTasks = preferencesService?.getDashboardTasks?.() || storageService?.readJson?.(taskConfig.storageKey, []) || []
			if (!Array.isArray(storedTasks)) return []

			return storedTasks.map(normalizeStoredTask).filter(Boolean).sort(compareTasks)
		}

		const loadAutoclearPreference = () =>
			(preferencesService?.getDashboardTaskAutoclear?.() ?? storageService?.getBoolean?.(taskConfig.autoclearKey, false)) || false

		const loadRemindedTasks = () => {
			const storedReminders = preferencesService?.getDashboardTaskReminders?.() || storageService?.readJson?.(taskConfig.reminderKey, []) || []
			return new Set(Array.isArray(storedReminders) ? storedReminders : [])
		}

		const saveTasks = () => {
			preferencesService?.saveDashboardTasks?.(tasks) || storageService?.writeJson?.(taskConfig.storageKey, tasks)
		}

		const saveRemindedTasks = () => {
			preferencesService?.saveDashboardTaskReminders?.([...remindedTaskIds]) || storageService?.writeJson?.(taskConfig.reminderKey, [...remindedTaskIds])
		}

		const saveAutoclearPreference = () => {
			preferencesService?.setDashboardTaskAutoclear?.(autoClearEnabled) || storageService?.setBoolean?.(taskConfig.autoclearKey, autoClearEnabled)
		}

		const createTaskId = () => `task-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`

		const getTasksForDate = dateKey => tasks.filter(task => task.date === dateKey).sort(compareTasks)

		const setDefaultTaskDate = dateKey => {
			if (taskDateInput) {
				taskDateInput.value = dateKey
			}
		}

		const selectTaskDate = (dateKey, { syncCursor = false } = {}) => {
			if (!dateKey) return

			selectedTaskDate = dateKey
			setDefaultTaskDate(dateKey)

			if (!syncCursor) return

			const [year, month] = dateKey.split('-').map(Number)
			if (!year || !month) return

			calendarCursor = new Date(year, month - 1, 1)
		}

		const syncTaskTimeValue = () => {
			if (!taskTimeInput || !taskHourInput || !taskMinuteInput) return

			const hour = taskHourInput.value
			const minute = taskMinuteInput.value
			taskTimeInput.value = hour && minute ? `${hour}:${minute}` : ''
		}

		const populateTimeSelects = () => {
			if (!taskHourInput || !taskMinuteInput) return

			const hourOptions = Array.from({ length: 24 }, (_, hour) => {
				const value = padNumber(hour)
				return `<option value="${value}">${value}</option>`
			}).join('')

			const minuteOptions = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55']
				.map(value => `<option value="${value}">${value}</option>`)
				.join('')

			taskHourInput.innerHTML = `<option value="">Godz.</option>${hourOptions}`
			taskMinuteInput.innerHTML = `<option value="">Min.</option>${minuteOptions}`
		}

		const resetTaskTimePicker = () => {
			if (taskHourInput) taskHourInput.value = ''
			if (taskMinuteInput) taskMinuteInput.value = ''
			if (taskTimeInput) taskTimeInput.value = ''
		}

		const renderTaskPreview = () => {
			if (!taskPreviewList) return

			const todayKey = formatTaskDateKey(new Date())
			const todayTasks = getTasksForDate(todayKey).slice(0, 3)
			taskPreviewList.innerHTML = ''

			if (todayTasks.length === 0) {
				const emptyState = document.createElement('span')
				emptyState.className = 'task-preview-empty'
				emptyState.textContent = 'Brak zadań na dzisiaj'
				taskPreviewList.appendChild(emptyState)
				return
			}

			todayTasks.forEach(task => {
				const priority = priorityMap[task.priority] || priorityMap.medium
				const item = document.createElement('span')
				item.className = 'task-preview-item'
				item.innerHTML = `
					<span class="task-preview-dot ${priority.className}"></span>
					<span class="task-preview-copy">${escapeHtml(task.time)} • ${escapeHtml(task.title)}</span>
				`
				taskPreviewList.appendChild(item)
			})
		}

		const renderTaskAgenda = () => {
			if (!taskAgendaList || !taskAgendaTitle || !taskAgendaCount) return

			const selectedDate = new Date(`${selectedTaskDate}T00:00`)
			const selectedTasks = getTasksForDate(selectedTaskDate)
			const guestMode = !isAuthenticated()

			taskAgendaTitle.textContent = selectedDate.toLocaleDateString('pl-PL', {
				weekday: 'long',
				day: '2-digit',
				month: 'long',
			})
			taskAgendaCount.textContent = String(selectedTasks.length)
			taskAgendaList.innerHTML = ''

			if (selectedTasks.length === 0) {
				const emptyState = document.createElement('div')
				emptyState.className = 'task-agenda-empty'
				emptyState.textContent = 'Brak zadań na wybrany dzień.'
				taskAgendaList.appendChild(emptyState)
				return
			}

			selectedTasks.forEach(task => {
				const priority = priorityMap[task.priority] || priorityMap.medium
				const item = document.createElement('article')
				item.className = `task-agenda-item ${priority.className}`
				item.innerHTML = `
					<div class="task-agenda-main">
						<div class="task-agenda-topline">
							<span class="task-priority-pill ${priority.className}">${priority.label}</span>
							<span class="task-agenda-time">${escapeHtml(task.time)}</span>
						</div>
						<h4>${escapeHtml(task.title)}</h4>
						<p>${escapeHtml(task.description || 'Bez dodatkowego opisu.')}</p>
					</div>
					<button
						type="button"
						class="task-delete-btn"
						data-task-delete="${escapeHtml(task.id)}"
						aria-label="Usuń zadanie"
						title="${guestMode ? 'Zaloguj sie, aby usuwac zadania' : 'Usun zadanie'}"
						${guestMode ? 'disabled' : ''}>
						<i class="app-icon trash-solid-full"></i>
					</button>
				`
				taskAgendaList.appendChild(item)
			})
		}

		const renderTaskCalendar = () => {
			if (!taskCalendarGrid || !taskCalendarMonth || !taskCalendarWeekdays) return

			taskCalendarMonth.textContent = calendarCursor.toLocaleDateString('pl-PL', {
				month: 'long',
				year: 'numeric',
			})

			taskCalendarWeekdays.innerHTML = weekdayLabels.map(day => `<span>${day}</span>`).join('')
			taskCalendarGrid.innerHTML = ''

			const year = calendarCursor.getFullYear()
			const month = calendarCursor.getMonth()
			const firstDay = new Date(year, month, 1)
			const daysInMonth = new Date(year, month + 1, 0).getDate()
			const startOffset = (firstDay.getDay() + 6) % 7
			const totalCells = Math.ceil((startOffset + daysInMonth) / 7) * 7
			const todayKey = formatTaskDateKey(new Date())

			for (let index = 0; index < totalCells; index += 1) {
				const dayNumber = index - startOffset + 1
				const cellDate = new Date(year, month, dayNumber)
				const cellKey = formatTaskDateKey(cellDate)
				const isCurrentMonth = cellDate.getMonth() === month
				const tasksForDay = getTasksForDate(cellKey)

				const button = document.createElement('button')
				button.type = 'button'
				button.className = 'task-calendar-day'
				button.dataset.date = cellKey
				button.disabled = !isCurrentMonth
				if (isCurrentMonth) {
					button.classList.add('is-current-month')
				}
				if (cellKey === selectedTaskDate) {
					button.classList.add('is-selected')
				}
				if (cellKey === todayKey) {
					button.classList.add('is-today')
				}

				const dotsMarkup = tasksForDay
					.slice(0, 3)
					.map(task => {
						const priority = priorityMap[task.priority] || priorityMap.medium
						return `<span class="task-calendar-dot ${priority.className}"></span>`
					})
					.join('')

				button.innerHTML = `
					<span class="task-calendar-day-number">${cellDate.getDate()}</span>
					<span class="task-calendar-dots">${dotsMarkup}</span>
				`

				taskCalendarGrid.appendChild(button)
			}
		}

		const syncTaskUi = () => {
			renderTaskCalendar()
			renderTaskAgenda()
			renderTaskPreview()
		}

		const cleanupReminderCache = () => {
			const activeReminderIds = new Set(tasks.map(task => reminderController?.getReminderId(task) || `${task.id}-${task.date}-${task.time}`))
			let hasChanges = false

			remindedTaskIds.forEach(reminderId => {
				if (!activeReminderIds.has(reminderId)) {
					remindedTaskIds.delete(reminderId)
					hasChanges = true
				}
			})

			if (hasChanges) {
				saveRemindedTasks()
			}
		}

		const removeExpiredTasks = () => {
			if (!autoClearEnabled) return

			const now = new Date()
			const initialTaskCount = tasks.length
			tasks = tasks.filter(task => getTaskDateTime(task) >= now)
			if (tasks.length === initialTaskCount) return

			saveTasks()
			cleanupReminderCache()

			if (getTasksForDate(selectedTaskDate).length === 0) {
				selectTaskDate(formatTaskDateKey(now), { syncCursor: true })
			}

			syncTaskUi()
		}

		const checkTaskReminders = () => {
			removeExpiredTasks()

			const now = new Date()

			tasks.forEach(task => {
				const reminderId = reminderController?.getReminderId(task) || `${task.id}-${task.date}-${task.time}`
				if (remindedTaskIds.has(reminderId)) return

				const minutesUntilTask = (getTaskDateTime(task) - now) / 60000
				if (minutesUntilTask > taskConfig.reminderLeadMinutes || minutesUntilTask < -taskConfig.reminderGraceMinutes) return

				remindedTaskIds.add(reminderId)
				saveRemindedTasks()
				reminderController?.notify(task, {
					reminderState: minutesUntilTask <= 0 ? 'overdue' : 'upcoming',
				})
			})
		}

		const startReminderLoop = () => {
			cleanupReminderCache()
			checkTaskReminders()

			document.addEventListener('visibilitychange', () => {
				if (document.visibilityState !== 'visible') return
				reminderController?.closeActiveSystemNotifications()
				checkTaskReminders()
			})

			window.addEventListener('focus', () => {
				reminderController?.closeActiveSystemNotifications()
				checkTaskReminders()
			})

			if (reminderTimerId) {
				window.clearInterval(reminderTimerId)
			}

			reminderTimerId = window.setInterval(checkTaskReminders, 30000)
		}

		const syncTaskStateFromStorage = changedKey => {
			if (
				changedKey &&
				changedKey !== taskConfig.storageKey &&
				changedKey !== taskConfig.reminderKey &&
				changedKey !== taskConfig.autoclearKey
			) {
				return
			}

			tasks = loadTasks()
			remindedTaskIds = loadRemindedTasks()
			autoClearEnabled = loadAutoclearPreference()

			if (taskAutoclearToggle) {
				taskAutoclearToggle.checked = autoClearEnabled
				taskAutoclearToggle.disabled = !isAuthenticated()
				taskAutoclearToggle.title = isAuthenticated()
					? 'Automatycznie usuwaj przeterminowane zadania'
					: 'Zaloguj sie, aby zmieniac ustawienia planera'
			}

			cleanupReminderCache()

			if (tasks.length === 0) {
				selectTaskDate(formatTaskDateKey(new Date()), { syncCursor: true })
			}

			setDefaultTaskDate(selectedTaskDate)
			syncTaskUi()
		}

		const openTaskModal = () => {
			if (!requireAuthenticatedAction()) return
			if (!taskModal) return
			taskModal.hidden = false
			taskModal.setAttribute('aria-hidden', 'false')
			document.body.classList.add('task-modal-open')
			setDefaultTaskDate(selectedTaskDate)
			syncTaskUi()
			window.setTimeout(() => taskTitleInput?.focus(), 20)
		}

		const closeTaskModal = () => {
			if (!taskModal) return
			taskModal.hidden = true
			taskModal.setAttribute('aria-hidden', 'true')
			document.body.classList.remove('task-modal-open')
		}

		const handleTaskPlannerOpen = () => {
			openTaskModal()
			reminderController?.prepareForPlannerInteraction()
		}

		const init = () => {
			if (!clockWidgetTrigger || !taskModal || !taskForm) return false

			tasks = loadTasks()
			remindedTaskIds = loadRemindedTasks()
			autoClearEnabled = loadAutoclearPreference()

			populateTimeSelects()
			setDefaultTaskDate(selectedTaskDate)
			syncTaskUi()
			if (taskAutoclearToggle) {
				taskAutoclearToggle.checked = autoClearEnabled
				taskAutoclearToggle.disabled = !isAuthenticated()
				taskAutoclearToggle.title = isAuthenticated()
					? 'Automatycznie usuwaj przeterminowane zadania'
					: 'Zaloguj sie, aby zmieniac ustawienia planera'
			}

			clockWidgetTrigger.addEventListener('click', handleTaskPlannerOpen)

			taskModal.addEventListener('click', event => {
				if (event.target.closest('[data-task-close]')) {
					closeTaskModal()
				}
			})

			document.addEventListener('keydown', event => {
				if (event.key === 'Escape' && !taskModal.hidden) {
					closeTaskModal()
				}
			})

			taskCalendarPrev?.addEventListener('click', () => {
				calendarCursor = new Date(calendarCursor.getFullYear(), calendarCursor.getMonth() - 1, 1)
				renderTaskCalendar()
			})

			taskCalendarNext?.addEventListener('click', () => {
				calendarCursor = new Date(calendarCursor.getFullYear(), calendarCursor.getMonth() + 1, 1)
				renderTaskCalendar()
			})

			taskCalendarGrid?.addEventListener('click', event => {
				const dayButton = event.target.closest('.task-calendar-day.is-current-month')
				if (!dayButton?.dataset.date) return

				selectTaskDate(dayButton.dataset.date)
				renderTaskCalendar()
				renderTaskAgenda()
			})

			taskDateInput?.addEventListener('change', () => {
				if (!taskDateInput.value) return
				selectTaskDate(taskDateInput.value, { syncCursor: true })
				renderTaskCalendar()
				renderTaskAgenda()
			})

			taskHourInput?.addEventListener('change', () => {
				syncTaskTimeValue()
				taskMinuteInput?.focus()
			})

			taskMinuteInput?.addEventListener('change', () => {
				syncTaskTimeValue()
				taskMinuteInput.blur()
			})

			taskAutoclearToggle?.addEventListener('change', () => {
				if (!requireAuthenticatedAction()) {
					taskAutoclearToggle.checked = autoClearEnabled
					return
				}

				autoClearEnabled = Boolean(taskAutoclearToggle.checked)
				saveAutoclearPreference()
				removeExpiredTasks()
			})

			taskForm.addEventListener('submit', event => {
				event.preventDefault()
				if (!requireAuthenticatedAction()) return

				if (!taskTitleInput || !taskDateInput || !taskTimeInput || !taskPriorityInput) return

				const title = taskTitleInput.value.trim()
				const date = taskDateInput.value
				const time = taskTimeInput.value
				const priority = taskPriorityInput.value
				const description = taskDescriptionInput?.value.trim() || ''

				if (!title || !date || !time || !priorityMap[priority]) return

				tasks.push({
					id: createTaskId(),
					title,
					date,
					time,
					priority,
					description,
				})
				tasks.sort(compareTasks)
				saveTasks()
				reminderController?.prepareForPlannerInteraction()
				void reminderController?.requestNotificationPermission?.()

				selectTaskDate(date, { syncCursor: true })
				taskForm.reset()
				taskPriorityInput.value = 'high'
				resetTaskTimePicker()
				setDefaultTaskDate(selectedTaskDate)
				syncTaskUi()
				cleanupReminderCache()
				checkTaskReminders()
			})

			taskAgendaList?.addEventListener('click', event => {
				const deleteButton = event.target.closest('[data-task-delete]')
				const taskId = deleteButton?.getAttribute('data-task-delete')
				if (!taskId) return
				if (!requireAuthenticatedAction()) return

				tasks = tasks.filter(task => task.id !== taskId)
				saveTasks()
				syncTaskUi()
				cleanupReminderCache()
			})

			startReminderLoop()
			document.addEventListener('app-auth-changed', () => {
				if (taskAutoclearToggle) {
					taskAutoclearToggle.disabled = !isAuthenticated()
					taskAutoclearToggle.title = isAuthenticated()
						? 'Automatycznie usuwaj przeterminowane zadania'
						: 'Zaloguj sie, aby zmieniac ustawienia planera'
				}
				syncTaskUi()
				if (taskModal && !isAuthenticated() && !taskModal.hidden) {
					closeTaskModal()
				}
			})
			return true
		}

		const destroy = () => {
			if (reminderTimerId) {
				window.clearInterval(reminderTimerId)
				reminderTimerId = null
			}

			reminderController?.destroy?.()
		}

		return {
			close: closeTaskModal,
			destroy,
			handleStorageChange: syncTaskStateFromStorage,
			init,
			open: openTaskModal,
			refreshPreview: renderTaskPreview,
		}
	}
})()
