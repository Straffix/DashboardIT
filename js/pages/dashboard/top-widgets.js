;(function initializeDashboardTopWidgetsModule() {
	const dashboardModules = (window.DashboardModules = window.DashboardModules || {})

	const DEFAULT_LAYOUT = {
		primary: 'weather',
		secondary: 'clock',
	}

	const WIDGET_OPTIONS = [
		{ id: 'weather', label: 'Pogoda', icon: 'cloud-sun-solid-full' },
		{ id: 'clock', label: 'Zegar', icon: 'clock-solid-full' },
		{ id: 'calendar', label: 'Kalendarz', icon: 'calendar-days-solid-full' },
		{ id: 'tasks', label: 'Zadania', icon: 'check-solid-full' },
		{ id: 'devices', label: 'Domena', icon: 'laptop-solid-full' },
		{ id: 'notes', label: 'Notatnik', icon: 'comment-solid-full' },
	]

	const SECONDARY_WIDGET_OPTIONS = [{ id: '', label: 'Brak', icon: 'xmark-solid-full' }, ...WIDGET_OPTIONS]
	const WIDGET_IDS = new Set(WIDGET_OPTIONS.map(option => option.id))
	const CALENDAR_WEEKDAY_LABELS = ['po', 'wt', 'sr', 'cz', 'pt', 'so', 'ni']

	const padNumber = value => String(value).padStart(2, '0')
	const formatDateKey = date => `${date.getFullYear()}-${padNumber(date.getMonth() + 1)}-${padNumber(date.getDate())}`
	const escapeHtml = value => window.AppUtils?.escapeHtml?.(String(value ?? '')) || String(value ?? '')
	const stripText = value =>
		String(value || '')
			.replace(/\s+/g, ' ')
			.trim()
	const truncateText = (value, maxLength = 48) => {
		const normalizedValue = stripText(value)
		if (normalizedValue.length <= maxLength) return normalizedValue
		return `${normalizedValue.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`
	}

	const createElementFromHtml = markup => {
		const template = document.createElement('template')
		template.innerHTML = String(markup || '').trim()
		return template.content.firstElementChild
	}

	const normalizeWidgetId = widgetId => {
		const normalizedWidgetId = String(widgetId || '').trim()
		return WIDGET_IDS.has(normalizedWidgetId) ? normalizedWidgetId : ''
	}

	const normalizeLayout = layout => {
		const primary = normalizeWidgetId(layout?.primary) || DEFAULT_LAYOUT.primary
		const secondaryCandidate = normalizeWidgetId(layout?.secondary)

		return {
			primary,
			secondary: secondaryCandidate && secondaryCandidate !== primary ? secondaryCandidate : '',
		}
	}

	const getCalendarMonthCells = referenceDate => {
		const year = referenceDate.getFullYear()
		const month = referenceDate.getMonth()
		const firstDayOfMonth = new Date(year, month, 1)
		const daysInMonth = new Date(year, month + 1, 0).getDate()
		const daysInPreviousMonth = new Date(year, month, 0).getDate()
		const startOffset = (firstDayOfMonth.getDay() + 6) % 7
		const totalCells = startOffset + daysInMonth <= 35 ? 35 : 42
		const todayKey = formatDateKey(referenceDate)

		return Array.from({ length: totalCells }, (_, index) => {
			const dayOffset = index - startOffset + 1
			let cellDate = null
			let value = dayOffset
			let isOutsideMonth = false

			if (dayOffset < 1) {
				value = daysInPreviousMonth + dayOffset
				cellDate = new Date(year, month - 1, value)
				isOutsideMonth = true
			} else if (dayOffset > daysInMonth) {
				value = dayOffset - daysInMonth
				cellDate = new Date(year, month + 1, value)
				isOutsideMonth = true
			} else {
				cellDate = new Date(year, month, value)
			}

			return {
				value,
				isOutsideMonth,
				isToday: formatDateKey(cellDate) === todayKey,
			}
		})
	}

	const getCalendarGridMarkup = referenceDate =>
		getCalendarMonthCells(referenceDate)
			.map(cell => {
				const classNames = ['dashboard-top-calendar-day']
				if (cell.isOutsideMonth) classNames.push('is-outside')
				if (cell.isToday) classNames.push('is-today')

				return `<span class="${classNames.join(' ')}">${escapeHtml(cell.value)}</span>`
			})
			.join('')

	dashboardModules.createTopWidgetsController = ({ elements, services, controllers } = {}) => {
		const {
			dashboardTopWidgetShell,
			dashboardTopWidgetLayout,
			dashboardTopWidgetEditBtn,
			dashboardTopWidgetPicker,
			dashboardTopWidgetPickerPrimary,
			dashboardTopWidgetPickerSecondary,
			dashboardTopWidgetPrimarySlot,
			dashboardTopWidgetSecondarySlot,
			dashboardTopWidgetDivider,
			dashboardTopWidgetStash,
			weatherWidget,
		} = elements || {}
		const { monitorService, preferencesService, storageService, usersService } = services || {}
		const { plannerController, weatherController } = controllers || {}

		if (
			!dashboardTopWidgetShell ||
			!dashboardTopWidgetLayout ||
			!dashboardTopWidgetEditBtn ||
			!dashboardTopWidgetPicker ||
			!dashboardTopWidgetPickerPrimary ||
			!dashboardTopWidgetPickerSecondary ||
			!dashboardTopWidgetPrimarySlot ||
			!dashboardTopWidgetSecondarySlot ||
			!dashboardTopWidgetDivider ||
			!dashboardTopWidgetStash ||
			!weatherWidget
		) {
			return null
		}

		const preferenceKeys = window.AppUtils?.config?.PREFERENCE_KEYS || {}
		const storageKeys = window.AppUtils?.config?.STORAGE_KEYS || {}
		const topWidgetsStorageKey = preferenceKeys.DASHBOARD_TOP_WIDGETS || 'dashboard-top-widgets'
		const topWidgetNoteStorageKey = `${topWidgetsStorageKey}::quick-note`
		const tasksStorageKey = preferenceKeys.DASHBOARD_TASKS || 'dashboard-tasks'
		const monitorStorageKey = storageKeys.MONITOR || 'monitor_laptopow_dane'
		const notesStorageKey = storageKeys.NOTES || 'dashboard_notes_entries'
		const widgetRoutes = {
			devices: 'dashboard.html#urzadzenia',
			notes: 'dashboard.html#chat',
		}

		const state = {
			isPickerOpen: false,
			layout: DEFAULT_LAYOUT,
			dayKey: formatDateKey(new Date()),
			tickId: null,
		}

		const dynamicRefs = {
			calendar: [],
			clock: [],
		}

		const getLayoutStorageKeys = () => {
			const scopedKey = preferencesService?.getDashboardTopWidgetsStorageKey?.()
			return new Set([topWidgetsStorageKey, scopedKey].filter(Boolean))
		}

		const getQuickNoteStorageKey = () => {
			const scopedKey = preferencesService?.getDashboardTopWidgetsStorageKey?.()
			return scopedKey ? `${scopedKey}::quick-note` : topWidgetNoteStorageKey
		}

		const loadLayout = () => {
			const savedLayout = preferencesService?.getDashboardTopWidgets?.()
			if (savedLayout && typeof savedLayout === 'object' && !Array.isArray(savedLayout)) {
				return normalizeLayout(savedLayout)
			}

			for (const storageKey of getLayoutStorageKeys()) {
				const storedLayout = storageService?.readJson?.(storageKey, null)
				if (storedLayout && typeof storedLayout === 'object' && !Array.isArray(storedLayout)) {
					return normalizeLayout(storedLayout)
				}
			}

			return normalizeLayout(DEFAULT_LAYOUT)
		}

		const saveLayout = (layout = state.layout) => {
			const normalizedLayout = normalizeLayout(layout)
			preferencesService?.saveDashboardTopWidgets?.(normalizedLayout) ||
				storageService?.writeJson?.(topWidgetsStorageKey, normalizedLayout)
		}

		const normalizeQuickNote = value =>
			String(value ?? '')
				.replace(/\r\n/g, '\n')
				.slice(0, 220)
		const loadQuickNote = () => normalizeQuickNote(storageService?.getText?.(getQuickNoteStorageKey(), '') || '')
		const saveQuickNote = value => storageService?.setText?.(getQuickNoteStorageKey(), normalizeQuickNote(value))

		const getUserDisplayName = authorId => {
			const matchedUser = (usersService?.getAll?.() || []).find(
				user => String(user?.id || '') === String(authorId || ''),
			)
			return String(matchedUser?.fullName || '').trim() || 'Zespol'
		}

		const loadTasks = () => {
			const rawTasks =
				preferencesService?.getDashboardTasks?.() || storageService?.readJson?.(tasksStorageKey, []) || []
			if (!Array.isArray(rawTasks)) return []

			return rawTasks
				.map(task => {
					const title = String(task?.title || '').trim()
					const date = String(task?.date || '').trim()
					const time = String(task?.time || '').trim()
					if (!title || !date || !time) return null

					return {
						id: String(task?.id || ''),
						title,
						date,
						time,
						description: String(task?.description || '').trim(),
						status: task?.status === 'done' ? 'done' : 'todo',
					}
				})
				.filter(Boolean)
				.sort((leftTask, rightTask) =>
					`${leftTask.date}T${leftTask.time}`.localeCompare(`${rightTask.date}T${rightTask.time}`, 'pl'),
				)
		}

		const isTaskCompleted = task => task?.status === 'done'
		const compareTasksForDisplay = (leftTask, rightTask) => {
			const statusDiff = Number(isTaskCompleted(leftTask)) - Number(isTaskCompleted(rightTask))
			if (statusDiff !== 0) return statusDiff
			return `${leftTask.date}T${leftTask.time}`.localeCompare(`${rightTask.date}T${rightTask.time}`, 'pl')
		}

		const getTaskDateTime = task => {
			const candidateDate = new Date(`${task.date}T${task.time}:00`)
			return Number.isNaN(candidateDate.getTime()) ? null : candidateDate
		}

		const formatTaskWidgetTimeLabel = (task, todayKey) => {
			if (task.date === todayKey) return task.time

			const taskDate = getTaskDateTime(task)
			if (!taskDate) return `${task.date} ${task.time}`

			return `${taskDate.toLocaleDateString('pl-PL', {
				day: '2-digit',
				month: '2-digit',
			})} ${task.time}`
		}

		const getTasksWidgetSnapshot = () => {
			const now = new Date()
			const todayKey = formatDateKey(now)
			const tasks = loadTasks()
			const todayTasks = tasks.filter(task => task.date === todayKey)
			const nextUpcomingTask =
				tasks.find(task => {
					const taskDate = getTaskDateTime(task)
					return taskDate && taskDate >= now
				}) || null

			if (todayTasks.length > 0) {
				const nearestTodayTask = todayTasks[0]
				return {
					label: 'Zadania',
					value: `${todayTasks.length} na dzisiaj`,
					meta: `${nearestTodayTask.time} • ${truncateText(nearestTodayTask.title, 34)}`,
				}
			}

			if (nextUpcomingTask) {
				return {
					label: 'Zadania',
					value: 'Brak na dzisiaj',
					meta: `${nextUpcomingTask.date} ${nextUpcomingTask.time} • ${truncateText(nextUpcomingTask.title, 28)}`,
				}
			}

			return {
				label: 'Zadania',
				value: 'Brak zaplanowanych',
				meta: 'Dodaj pierwsze zadanie w planerze.',
			}
		}

		const getTasksWidgetListSnapshot = () => {
			const now = new Date()
			const todayKey = formatDateKey(now)
			const tasks = loadTasks()
			const todayTasks = tasks.filter(task => task.date === todayKey)
			const upcomingTasks = tasks.filter(task => {
				const taskDate = getTaskDateTime(task)
				return taskDate && taskDate >= now
			})
			const visibleTasks = (todayTasks.length > 0 ? todayTasks : upcomingTasks).slice(0, 3)

			if (visibleTasks.length === 0) {
				return {
					ariaLabel: 'Zadania. Brak zaplanowanych zadan.',
					emptyLabel: 'Brak zaplanowanych zadan.',
				}
			}

			const items = visibleTasks.map(task => ({
				timeLabel: formatTaskWidgetTimeLabel(task, todayKey),
				title: truncateText(task.title, 42),
			}))

			return {
				ariaLabel: `Zadania. ${items.map(item => `${item.timeLabel} ${item.title}`).join(', ')}`,
				items,
			}
		}

		const getTasksWidgetListWithCompletionSnapshot = () => {
			const now = new Date()
			const todayKey = formatDateKey(now)
			const tasks = loadTasks()
			const todayTasks = tasks.filter(task => task.date === todayKey).sort(compareTasksForDisplay)
			const upcomingTasks = tasks
				.filter(task => {
					if (isTaskCompleted(task)) return false
					const taskDate = getTaskDateTime(task)
					return taskDate && taskDate >= now
				})
				.sort(compareTasksForDisplay)
			const visibleTasks = (todayTasks.length > 0 ? todayTasks : upcomingTasks).slice(0, 3)

			if (visibleTasks.length === 0) {
				return {
					ariaLabel: 'Zadania. Brak zaplanowanych zadan.',
					emptyLabel: 'Brak zaplanowanych zadan.',
				}
			}

			const items = visibleTasks.map(task => ({
				id: task.id,
				fullTitle: task.title,
				title: truncateText(task.title, 38),
				meta: task.description
					? `${formatTaskWidgetTimeLabel(task, todayKey)} | ${truncateText(task.description, 42)}`
					: formatTaskWidgetTimeLabel(task, todayKey),
				isCompleted: isTaskCompleted(task),
				toggleLabel: isTaskCompleted(task)
					? `Oznacz zadanie ${task.title} jako niezakończone`
					: `Oznacz zadanie ${task.title} jako zakończone`,
			}))

			return {
				ariaLabel: `Zadania. ${items.map(item => `${item.isCompleted ? 'zakonczone' : 'otwarte'} ${item.fullTitle}`).join(', ')}`,
				items,
			}
		}

		const getDevicesWidgetSnapshot = () => {
			const devices = monitorService?.getAll?.() || storageService?.readJson?.(monitorStorageKey, []) || []
			const today = new Date()
			today.setHours(0, 0, 0, 0)

			const stats = devices.reduce(
				(result, device) => {
					const expiryDate = window.AppUtils?.parseDate?.(device?.date || '')
					const diff = expiryDate ? Math.ceil((expiryDate - today) / 86400000) : Number.NaN

					if (!expiryDate) {
						result.warn += 1
						return result
					}
					if (diff < 0) {
						result.dead += 1
						return result
					}
					if (diff <= 14) {
						result.warn += 1
						return result
					}

					result.ok += 1
					return result
				},
				{ ok: 0, warn: 0, dead: 0 },
			)

			const attentionCount = stats.warn + stats.dead
			if (attentionCount === 0) {
				return {
					label: 'Domena',
					value: 'Wszystko aktualne',
					meta: `${stats.ok} urzadzen bez alertow`,
				}
			}

			return {
				label: 'Domena',
				value: `${attentionCount} do sprawdzenia`,
				meta: `${stats.dead} poza domena • ${stats.warn} wygasa wkrotce`,
			}
		}

		const getNotesWidgetSnapshot = () => {
			const notes = storageService?.readJson?.(notesStorageKey, []) || []
			const messages = Array.isArray(notes)
				? notes
						.filter(message => message?.id && stripText(message?.content))
						.sort(
							(leftMessage, rightMessage) =>
								(Date.parse(rightMessage.updatedAt || rightMessage.createdAt) || 0) -
								(Date.parse(leftMessage.updatedAt || leftMessage.createdAt) || 0),
						)
				: []

			if (messages.length === 0) {
				return {
					label: 'Notatnik',
					value: 'Brak wpisow',
					meta: 'Otworz modul i dodaj pierwsza wiadomosc.',
				}
			}

			const latestMessage = messages[0]
			return {
				label: 'Notatnik',
				value: truncateText(latestMessage.content, 40),
				meta: `${getUserDisplayName(latestMessage.authorId)} • ${latestMessage.isPinned ? 'przypiete' : 'ostatnia aktualizacja'}`,
			}
		}

		const createCustomWidgetMarkup = (widgetId, snapshot, { icon, action, hideLabel = false, route = '' } = {}) => {
			const tagName = action ? 'button' : 'article'
			const actionAttributes = action
				? ` data-top-widget-action="${escapeHtml(action)}"${route ? ` data-top-widget-route="${escapeHtml(route)}"` : ''}`
				: ''
			const accessibleLabel = snapshot.ariaLabel || snapshot.label || snapshot.value || 'Widget'
			const ariaLabel = action ? ` aria-label="${escapeHtml(accessibleLabel)}"` : ''
			const labelMarkup =
				hideLabel || !snapshot.label
					? ''
					: `<span class="dashboard-top-mini-widget-label">${escapeHtml(snapshot.label)}</span>`

			return `
				<${tagName}
					class="dashboard-top-mini-widget dashboard-top-mini-widget--${escapeHtml(widgetId)}"
					data-top-widget-id="${escapeHtml(widgetId)}"${actionAttributes}${ariaLabel}
					${tagName === 'button' ? 'type="button"' : ''}>
					<span class="dashboard-top-mini-widget-icon" aria-hidden="true">
						<i class="app-icon ${escapeHtml(icon)}"></i>
					</span>
					<span class="dashboard-top-mini-widget-copy">
						${labelMarkup}
						<strong class="dashboard-top-mini-widget-value">${escapeHtml(snapshot.value)}</strong>
						<span class="dashboard-top-mini-widget-meta">${escapeHtml(snapshot.meta)}</span>
					</span>
				</${tagName}>
			`
		}

		const createClockWidgetElement = () => {
			const element = createElementFromHtml(`
				<article
					class="dashboard-top-mini-widget dashboard-top-mini-widget--clock dashboard-top-clock-widget"
					data-top-widget-id="clock"
					aria-label="Zegar">
					<strong class="dashboard-top-mini-widget-value dashboard-top-clock-time">
						<span class="dashboard-top-clock-hours">--</span>
						<span class="dashboard-top-clock-colon" aria-hidden="true">:</span>
						<span class="dashboard-top-clock-minutes">--</span>
					</strong>
					<span class="dashboard-top-mini-widget-meta dashboard-top-clock-date">--</span>
				</article>
			`)

			const valueElement = element?.querySelector('.dashboard-top-mini-widget-value')
			const hoursElement = element?.querySelector('.dashboard-top-clock-hours')
			const minutesElement = element?.querySelector('.dashboard-top-clock-minutes')
			const colonElement = element?.querySelector('.dashboard-top-clock-colon')
			const metaElement = element?.querySelector('.dashboard-top-mini-widget-meta')
			if (valueElement && hoursElement && minutesElement && colonElement && metaElement) {
				dynamicRefs.clock.push({ valueElement, hoursElement, minutesElement, colonElement, metaElement })
			}

			return element
		}

		const createCalendarWidgetElement = () => {
			const element = createElementFromHtml(`
				<button
					type="button"
					class="dashboard-top-mini-widget dashboard-top-mini-widget--calendar dashboard-top-calendar-widget"
					data-top-widget-id="calendar"
					data-top-widget-action="planner"
					aria-label="Kalendarz">
					<span class="dashboard-top-calendar-panel" aria-hidden="true">
						<span class="dashboard-top-calendar-caption">--</span>
						<span class="dashboard-top-calendar-weekdays">${CALENDAR_WEEKDAY_LABELS.map(label => `<span>${escapeHtml(label)}</span>`).join('')}</span>
						<span class="dashboard-top-calendar-grid"></span>
					</span>
				</button>
			`)

			const captionElement = element?.querySelector('.dashboard-top-calendar-caption')
			const gridElement = element?.querySelector('.dashboard-top-calendar-grid')
			if (captionElement && gridElement) {
				dynamicRefs.calendar.push({ element, captionElement, gridElement })
			}

			return element
		}

		const createTasksWidgetElement = () => {
			const snapshot = getTasksWidgetListWithCompletionSnapshot()
			const hasItems = Array.isArray(snapshot.items) && snapshot.items.length > 0
			const listMarkup = hasItems
				? snapshot.items
						.map(
							item => `
								<span class="dashboard-top-tasks-item${item.isCompleted ? ' is-completed' : ''}">
									<label class="dashboard-top-tasks-check" title="${escapeHtml(item.toggleLabel)}">
										<input
											type="checkbox"
											class="dashboard-top-tasks-check-input"
											data-top-task-toggle="${escapeHtml(item.id)}"
											aria-label="${escapeHtml(item.toggleLabel)}"
											${item.isCompleted ? 'checked' : ''}>
										<span class="dashboard-top-tasks-check-box" aria-hidden="true">
											<i class="app-icon check-solid-full"></i>
										</span>
									</label>
									<button
										type="button"
										class="dashboard-top-tasks-card"
										data-top-widget-action="planner"
										aria-label="Otworz planer zadania ${escapeHtml(item.fullTitle)}">
										<span class="dashboard-top-tasks-title">${escapeHtml(item.title)}</span>
										<span class="dashboard-top-tasks-meta">${escapeHtml(item.meta)}</span>
									</button>
								</span>
							`,
						)
						.join('')
				: `
					<button
						type="button"
						class="dashboard-top-tasks-empty dashboard-top-tasks-empty--action"
						data-top-widget-action="planner"
						aria-label="Dodaj nowe zadanie">
						${escapeHtml(snapshot.emptyLabel || 'Brak zaplanowanych zadan.')}
					</button>
				`

			return createElementFromHtml(`
				<article
					class="dashboard-top-mini-widget dashboard-top-mini-widget--tasks dashboard-top-tasks-widget"
					data-top-widget-id="tasks"
					aria-label="${escapeHtml(snapshot.ariaLabel || 'Zadania')}">
					<span class="dashboard-top-tasks-list${hasItems ? '' : ' is-empty'}">${listMarkup}</span>
				</article>
			`)
		}

		const createDevicesWidgetElement = () =>
			createElementFromHtml(
				createCustomWidgetMarkup('devices', getDevicesWidgetSnapshot(), {
					action: 'route',
					hideLabel: true,
					icon: 'laptop-solid-full',
					route: widgetRoutes.devices,
				}),
			)

		const createNotesWidgetElement = () =>
			(() => {
				const noteValue = loadQuickNote()
				const element = createElementFromHtml(`
					<article
						class="dashboard-top-mini-widget dashboard-top-mini-widget--notes dashboard-top-notes-widget"
						data-top-widget-id="notes"
						aria-label="Szybka notatka">
						<div class="dashboard-top-notes-field">
							<textarea
								class="dashboard-top-notes-input"
								rows="4"
								maxlength="220"
								spellcheck="false"
								aria-label="Szybka notatka"
								placeholder="">${escapeHtml(noteValue)}</textarea>
						</div>
					</article>
				`)

				const inputElement = element?.querySelector('.dashboard-top-notes-input')
				if (inputElement) {
					inputElement.addEventListener('input', () => {
						saveQuickNote(inputElement.value)
					})
				}

				return element
			})()

		const refreshDynamicWidgets = () => {
			const now = new Date()
			const hoursLabel = padNumber(now.getHours())
			const minutesLabel = padNumber(now.getMinutes())
			const timeLabel = `${hoursLabel}:${minutesLabel}`
			const clockDateLabel = now.toLocaleDateString('pl-PL', {
				weekday: 'long',
				day: '2-digit',
				month: 'long',
			})
			const calendarCaptionLabel = now.toLocaleDateString('pl-PL', {
				year: 'numeric',
				month: 'long',
			})
			const calendarAriaLabel = now.toLocaleDateString('pl-PL', {
				weekday: 'long',
				day: 'numeric',
				month: 'long',
				year: 'numeric',
			})
			const calendarGridMarkup = getCalendarGridMarkup(now)

			dynamicRefs.clock.forEach(ref => {
				ref.valueElement.setAttribute('aria-label', timeLabel)
				ref.hoursElement.textContent = hoursLabel
				ref.minutesElement.textContent = minutesLabel
				ref.colonElement.style.opacity = now.getSeconds() % 2 === 0 ? '1' : '0'
				ref.metaElement.textContent = clockDateLabel
			})

			dynamicRefs.calendar.forEach(ref => {
				ref.element?.setAttribute('aria-label', `Kalendarz, ${calendarAriaLabel}`)
				ref.captionElement.textContent = calendarCaptionLabel
				ref.gridElement.innerHTML = calendarGridMarkup
			})

			const nextDayKey = formatDateKey(now)
			if (nextDayKey !== state.dayKey) {
				state.dayKey = nextDayKey
				renderLayout()
			}
		}

		const parkWeatherWidget = () => {
			if (weatherWidget.parentElement !== dashboardTopWidgetStash) {
				dashboardTopWidgetStash.appendChild(weatherWidget)
			}
		}

		const createCustomWidgetElement = widgetId => {
			switch (widgetId) {
				case 'clock':
					return createClockWidgetElement()
				case 'calendar':
					return createCalendarWidgetElement()
				case 'tasks':
					return createTasksWidgetElement()
				case 'devices':
					return createDevicesWidgetElement()
				case 'notes':
					return createNotesWidgetElement()
				default:
					return null
			}
		}

		const mountWidgetInSlot = (slotElement, widgetId) => {
			slotElement.innerHTML = ''
			slotElement.dataset.widgetId = widgetId || ''

			if (widgetId === 'weather') {
				slotElement.appendChild(weatherWidget)
				return
			}

			const widgetElement = createCustomWidgetElement(widgetId)
			if (widgetElement) {
				slotElement.appendChild(widgetElement)
			}
		}

		function renderLayout() {
			dynamicRefs.calendar = []
			dynamicRefs.clock = []

			const { primary, secondary } = state.layout
			const hasSecondary = Boolean(secondary)
			const usesWeather = primary === 'weather' || secondary === 'weather'

			if (!usesWeather) {
				weatherController?.closeEditor?.()
			}

			dashboardTopWidgetLayout.classList.toggle('has-secondary', hasSecondary)
			dashboardTopWidgetLayout.classList.toggle('is-single-clock', !hasSecondary && primary === 'clock')
			dashboardTopWidgetSecondarySlot.hidden = !hasSecondary
			dashboardTopWidgetDivider.hidden = !hasSecondary
			dashboardTopWidgetShell.classList.toggle('has-secondary', hasSecondary)
			dashboardTopWidgetShell.classList.toggle('is-single-clock', !hasSecondary && primary === 'clock')

			mountWidgetInSlot(dashboardTopWidgetPrimarySlot, primary)

			if (hasSecondary) {
				mountWidgetInSlot(dashboardTopWidgetSecondarySlot, secondary)
			} else {
				dashboardTopWidgetSecondarySlot.innerHTML = ''
				dashboardTopWidgetSecondarySlot.dataset.widgetId = ''
			}

			if (!usesWeather) {
				parkWeatherWidget()
			}

			renderPickerOptions()
			refreshDynamicWidgets()
		}

		const renderPickerOptions = () => {
			const renderOptionsMarkup = (slotName, options) =>
				options
					.map(option => {
						const optionId = option.id
						const isActive = state.layout[slotName] === optionId
						const isTakenByOtherSlot =
							Boolean(optionId) &&
							((slotName === 'primary' && state.layout.secondary === optionId) ||
								(slotName === 'secondary' && state.layout.primary === optionId))

						return `
							<button
								type="button"
								class="dashboard-top-widget-option${isActive ? ' is-active' : ''}"
								data-widget-choice="1"
								data-widget-slot="${escapeHtml(slotName)}"
								data-widget-id="${escapeHtml(optionId)}"
								${isTakenByOtherSlot ? 'disabled' : ''}>
								<i class="app-icon ${escapeHtml(option.icon)}" aria-hidden="true"></i>
								<span>${escapeHtml(option.label)}</span>
							</button>
						`
					})
					.join('')

			dashboardTopWidgetPickerPrimary.innerHTML = renderOptionsMarkup('primary', WIDGET_OPTIONS)
			dashboardTopWidgetPickerSecondary.innerHTML = renderOptionsMarkup('secondary', SECONDARY_WIDGET_OPTIONS)
		}

		const syncPickerState = () => {
			dashboardTopWidgetPicker.hidden = !state.isPickerOpen
			dashboardTopWidgetEditBtn.setAttribute('aria-expanded', state.isPickerOpen ? 'true' : 'false')
			dashboardTopWidgetShell.classList.toggle('is-picker-open', state.isPickerOpen)
		}

		const closePicker = () => {
			if (!state.isPickerOpen) return
			state.isPickerOpen = false
			syncPickerState()
		}

		const openPicker = () => {
			weatherController?.closeEditor?.()
			renderPickerOptions()
			state.isPickerOpen = true
			syncPickerState()
		}

		const togglePicker = () => {
			if (state.isPickerOpen) {
				closePicker()
				return
			}

			openPicker()
		}

		const updateLayout = (slotName, widgetId) => {
			const nextLayout = { ...state.layout }

			if (slotName === 'primary') {
				nextLayout.primary = normalizeWidgetId(widgetId) || DEFAULT_LAYOUT.primary
				if (nextLayout.secondary === nextLayout.primary) {
					nextLayout.secondary = ''
				}
			}

			if (slotName === 'secondary') {
				nextLayout.secondary = normalizeWidgetId(widgetId)
				if (nextLayout.secondary === nextLayout.primary) {
					nextLayout.secondary = ''
				}
			}

			state.layout = normalizeLayout(nextLayout)
			saveLayout(state.layout)
			renderLayout()
		}

		const handleWidgetAction = event => {
			const actionTarget = event.target instanceof Element ? event.target : null
			const actionTrigger = actionTarget?.closest('[data-top-widget-action]')
			if (!actionTrigger) return

			const action = actionTrigger.getAttribute('data-top-widget-action')
			if (action === 'planner') {
				plannerController?.open?.()
				return
			}

			if (action === 'route') {
				const route = actionTrigger.getAttribute('data-top-widget-route')
				if (route) {
					window.location.href = route
				}
			}
		}

		const handleTaskToggle = event => {
			const actionTarget = event.target instanceof Element ? event.target : null
			const toggleInput = actionTarget?.closest('[data-top-task-toggle]')
			const taskId = toggleInput?.getAttribute('data-top-task-toggle')
			if (!(toggleInput instanceof HTMLInputElement) || !taskId) return

			const updated = plannerController?.toggleTaskCompletion?.(taskId, toggleInput.checked)
			if (!updated) {
				renderLayout()
			}
		}

		const handleStorageChange = changedKey => {
			if (!changedKey) {
				state.layout = loadLayout()
				renderLayout()
				return
			}

			const layoutKeys = getLayoutStorageKeys()
			if (
				layoutKeys.has(changedKey) ||
				changedKey === tasksStorageKey ||
				changedKey === monitorStorageKey ||
				changedKey === notesStorageKey ||
				changedKey === getQuickNoteStorageKey()
			) {
				if (layoutKeys.has(changedKey)) {
					state.layout = loadLayout()
				}
				renderLayout()
			}
		}

		const startClockLoop = () => {
			if (state.tickId) {
				window.clearInterval(state.tickId)
			}

			refreshDynamicWidgets()
			state.tickId = window.setInterval(refreshDynamicWidgets, 1000)
		}

		const init = () => {
			state.layout = loadLayout()
			state.dayKey = formatDateKey(new Date())
			renderLayout()
			syncPickerState()
			startClockLoop()

			dashboardTopWidgetEditBtn.addEventListener('click', event => {
				event.preventDefault()
				event.stopPropagation()
				togglePicker()
			})

			dashboardTopWidgetPicker.addEventListener('click', event => {
				event.stopPropagation()
				const actionTarget = event.target instanceof Element ? event.target : null
				const optionButton = actionTarget?.closest('[data-widget-choice]')
				if (!optionButton || optionButton.disabled) return

				updateLayout(
					optionButton.getAttribute('data-widget-slot') || '',
					optionButton.getAttribute('data-widget-id') || '',
				)
			})

			dashboardTopWidgetLayout.addEventListener('change', handleTaskToggle)
			dashboardTopWidgetLayout.addEventListener('click', event => {
				const actionTarget = event.target instanceof Element ? event.target : null
				if (actionTarget?.closest('[data-top-task-toggle]')) return
				handleWidgetAction(event)
			})

			document.addEventListener('click', event => {
				if (!state.isPickerOpen) return
				const eventPath = typeof event.composedPath === 'function' ? event.composedPath() : []
				if (eventPath.includes(dashboardTopWidgetPicker) || eventPath.includes(dashboardTopWidgetEditBtn)) return
				closePicker()
			})

			document.addEventListener('keydown', event => {
				if (event.key === 'Escape') {
					closePicker()
				}
			})

			document.addEventListener('visibilitychange', () => {
				if (document.visibilityState === 'visible') {
					renderLayout()
				}
			})

			window.addEventListener('focus', () => {
				renderLayout()
			})

			window.addEventListener('dashboard:tasks-updated', () => {
				renderLayout()
			})

			document.addEventListener('app-auth-changed', () => {
				state.layout = loadLayout()
				renderLayout()
			})

			return true
		}

		return {
			handleStorageChange,
			init,
			refresh: renderLayout,
		}
	}
})()
