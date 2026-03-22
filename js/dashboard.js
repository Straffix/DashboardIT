/* === Dashboard Init: Start === */
document.addEventListener('DOMContentLoaded', () => {
	const dashboardContainer = document.querySelector('.dashboard-container')
	if (dashboardContainer) {
		dashboardContainer.classList.add('is-ready')
	}

	const weatherConfig = {
		storageKey: 'dashboard-weather-location',
		fallbackName: 'Warszawa',
		fallbackLat: 52.2298,
		fallbackLon: 21.0118,
		geoapifyApiKeyMetaName: 'geoapify-api-key',
	}

	const weatherCodeMap = {
		0: { label: 'Bezchmurnie', icon: 'fa-sun' },
		1: { label: 'Głównie słonecznie', icon: 'fa-cloud-sun' },
		2: { label: 'Częściowe zachmurzenie', icon: 'fa-cloud-sun' },
		3: { label: 'Pochmurno', icon: 'fa-cloud' },
		45: { label: 'Mgła', icon: 'fa-smog' },
		48: { label: 'Osadzająca się mgła', icon: 'fa-smog' },
		51: { label: 'Lekka mżawka', icon: 'fa-cloud-rain' },
		53: { label: 'Mżawka', icon: 'fa-cloud-rain' },
		55: { label: 'Intensywna mżawka', icon: 'fa-cloud-rain' },
		61: { label: 'Lekki deszcz', icon: 'fa-cloud-rain' },
		63: { label: 'Deszcz', icon: 'fa-cloud-showers-heavy' },
		65: { label: 'Ulewa', icon: 'fa-cloud-showers-heavy' },
		71: { label: 'Lekki śnieg', icon: 'fa-snowflake' },
		73: { label: 'Śnieg', icon: 'fa-snowflake' },
		75: { label: 'Intensywny śnieg', icon: 'fa-snowflake' },
		80: { label: 'Przelotny deszcz', icon: 'fa-cloud-sun-rain' },
		81: { label: 'Przelotny deszcz', icon: 'fa-cloud-sun-rain' },
		82: { label: 'Silny przelotny deszcz', icon: 'fa-cloud-showers-heavy' },
		95: { label: 'Burza', icon: 'fa-cloud-bolt' },
		96: { label: 'Burza z gradem', icon: 'fa-cloud-bolt' },
		99: { label: 'Silna burza z gradem', icon: 'fa-cloud-bolt' },
	}

	const clockHour = document.getElementById('clock-hour')
	const clockMinute = document.getElementById('clock-minute')
	const clockSecond = document.getElementById('clock-second')
	const clockDigital = document.getElementById('clock-digital')
	const clockDate = document.getElementById('clock-date')
	const clockWidgetTrigger = document.getElementById('clock-widget-trigger')
	const dashboardScrollCue = document.getElementById('dashboard-scroll-cue')
	const dashboardMenu = document.getElementById('dashboard-menu')
	const taskPreviewList = document.getElementById('task-preview-list')
	const weatherSearchForm = document.getElementById('weather-search-form')
	const weatherLocationInput = document.getElementById('weather-location-input')
	const weatherCurrentLocationBtn = document.getElementById('weather-current-location-btn')
	const weatherWidget = document.querySelector('.weather-widget')
	const taskModal = document.getElementById('task-modal')
	const taskForm = document.getElementById('task-form')
	const taskTitleInput = document.getElementById('task-title')
	const taskDateInput = document.getElementById('task-date')
	const taskTimeInput = document.getElementById('task-time')
	const taskHourInput = document.getElementById('task-hour')
	const taskMinuteInput = document.getElementById('task-minute')
	const taskPriorityInput = document.getElementById('task-priority')
	const taskDescriptionInput = document.getElementById('task-description')
	const taskCalendarMonth = document.getElementById('task-calendar-month')
	const taskCalendarGrid = document.getElementById('task-calendar-grid')
	const taskCalendarWeekdays = document.getElementById('task-calendar-weekdays')
	const taskAgendaTitle = document.getElementById('task-agenda-title')
	const taskAgendaCount = document.getElementById('task-agenda-count')
	const taskAgendaList = document.getElementById('task-agenda-list')
	const taskCalendarPrev = document.getElementById('task-calendar-prev')
	const taskCalendarNext = document.getElementById('task-calendar-next')
	const taskToastStack = document.getElementById('task-toast-stack')
	const taskAutoclearToggle = document.getElementById('task-autoclear-toggle')

	const taskConfig = {
		storageKey: 'dashboard-tasks',
		reminderKey: 'dashboard-task-reminders',
		autoclearKey: 'dashboard-task-autoclear',
	}

	const priorityMap = {
		high: { label: 'Wysoki', className: 'is-high' },
		medium: { label: 'Sredni', className: 'is-medium' },
		low: { label: 'Niski', className: 'is-low' },
	}

	const weekdayLabels = ['Pn', 'Wt', 'Sr', 'Cz', 'Pt', 'Sb', 'Nd']

	const padNumber = value => String(value).padStart(2, '0')

	const normalizeSearchValue = value =>
		String(value || '')
			.normalize('NFD')
			.replace(/[\u0300-\u036f]/g, '')
			.toLocaleLowerCase('pl-PL')
			.trim()

	const normalizeLocationPart = value =>
		String(value || '')
			.replace(/^(gmina|gm\.|powiat|województwo)\s+/i, '')
			.replace(/\s+/g, ' ')
			.trim()

	const getUniqueLocationParts = parts => {
		const seen = new Set()

		return parts
			.map(normalizeLocationPart)
			.filter(part => {
				if (!part) return false

				const key = normalizeSearchValue(part)
				if (seen.has(key)) return false

				seen.add(key)
				return true
			})
	}

	const buildCurrentLocationDetails = address => {
		const primaryLabel =
			getUniqueLocationParts([
				address.hamlet,
				address.village,
				address.locality,
				address.neighbourhood,
				address.residential,
				address.suburb,
				address.quarter,
				address.town,
				address.city_district,
				address.city,
				address.municipality,
				address.county,
			])[0] ||
			getUniqueLocationParts([address.state, address.country])[0] ||
			'Aktualna lokalizacja'

		const contextLabel =
			getUniqueLocationParts([
				address.town,
				address.city_district,
				address.city,
				address.municipality,
				address.county,
				address.state,
				address.country,
			]).find(part => part !== primaryLabel) || ''

		return {
			displayLabel: getUniqueLocationParts([primaryLabel, contextLabel]).join(', ') || 'Aktualna lokalizacja',
			searchLabel: primaryLabel,
		}
	}

	const scoreGeocodingResult = (result, query) => {
		const normalizedQuery = normalizeSearchValue(query)
		const normalizedName = normalizeSearchValue(result?.name)
		const normalizedAdmin1 = normalizeSearchValue(result?.admin1)
		const normalizedAdmin2 = normalizeSearchValue(result?.admin2)
		const featureBonus = {
			PPLC: 8,
			PPLA: 7,
			PPLA2: 6,
			PPLA3: 5,
			PPLA4: 4,
			PPL: 4,
			PPLL: 3,
			PPLX: 2,
		}

		let score = 0

		if (normalizedName === normalizedQuery) score += 100
		else if (normalizedName.startsWith(normalizedQuery)) score += 60
		else if (normalizedName.includes(normalizedQuery)) score += 40

		if (normalizedAdmin2 === normalizedQuery) score += 20
		if (normalizedAdmin1 === normalizedQuery) score += 10
		if (result?.country_code === 'PL') score += 25

		score += featureBonus[result?.feature_code] || 0
		score += Math.min(Number(result?.population) || 0, 1000000) / 100000

		return score
	}

	const pickBestGeocodingResult = (results, query) =>
		[...(results || [])].sort((left, right) => scoreGeocodingResult(right, query) - scoreGeocodingResult(left, query))[0]

	const getGeoapifyApiKey = () => {
		const apiKey =
			document
				.querySelector(`meta[name="${weatherConfig.geoapifyApiKeyMetaName}"]`)
				?.getAttribute('content')
				?.trim() || ''

		if (!apiKey) return ''
		if (/your[_-\s]?geoapify[_-\s]?api[_-\s]?key/i.test(apiKey)) return ''
		if (/paste[_-\s]?geoapify[_-\s]?api[_-\s]?key/i.test(apiKey)) return ''

		return apiKey
	}

	const buildGeoapifyLocationDetails = properties => {
		const primaryLabel =
			getUniqueLocationParts([
				properties.city,
				properties.town,
				properties.village,
				properties.hamlet,
				properties.suburb,
				properties.district,
				properties.county,
			])[0] ||
			getUniqueLocationParts([properties.state, properties.country])[0] ||
			'Aktualna lokalizacja'

		const contextLabel =
			getUniqueLocationParts([
				properties.county,
				properties.state,
				properties.country,
			]).find(part => part !== primaryLabel) || ''

		return {
			displayLabel: getUniqueLocationParts([primaryLabel, contextLabel]).join(', ') || 'Aktualna lokalizacja',
			searchLabel: primaryLabel,
		}
	}

	const formatTaskDateKey = date =>
		`${date.getFullYear()}-${padNumber(date.getMonth() + 1)}-${padNumber(date.getDate())}`

	const getTaskDateTime = task => new Date(`${task.date}T${task.time || '00:00'}`)

	const compareTasks = (left, right) => getTaskDateTime(left) - getTaskDateTime(right)

	const loadTasks = () => {
		try {
			const storedTasks = JSON.parse(localStorage.getItem(taskConfig.storageKey) || '[]')
			return Array.isArray(storedTasks) ? storedTasks.sort(compareTasks) : []
		} catch (error) {
			return []
		}
	}

	let tasks = loadTasks()
	let selectedTaskDate = formatTaskDateKey(new Date())
	let calendarCursor = new Date()
	let reminderTimerId = null
	let autoClearEnabled = localStorage.getItem(taskConfig.autoclearKey) === 'true'
	let lastClockMinuteKey = ''
	let lastClockDateKey = ''

	const loadRemindedTasks = () => {
		try {
			const storedReminders = JSON.parse(localStorage.getItem(taskConfig.reminderKey) || '[]')
			return new Set(Array.isArray(storedReminders) ? storedReminders : [])
		} catch (error) {
			return new Set()
		}
	}

	let remindedTaskIds = loadRemindedTasks()

	const saveTasks = () => {
		localStorage.setItem(taskConfig.storageKey, JSON.stringify(tasks))
	}

	const saveRemindedTasks = () => {
		localStorage.setItem(taskConfig.reminderKey, JSON.stringify([...remindedTaskIds]))
	}

	const saveAutoclearPreference = () => {
		localStorage.setItem(taskConfig.autoclearKey, String(autoClearEnabled))
	}

	const createTaskId = () => `task-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`

	const createReminderId = task => `${task.id}-${task.date}-${task.time}`

	const getTasksForDate = dateKey => tasks.filter(task => task.date === dateKey).sort(compareTasks)

	const getUpcomingTasks = () => {
		const now = new Date()
		return tasks.filter(task => getTaskDateTime(task) >= now).sort(compareTasks)
	}

	const setDefaultTaskDate = dateKey => {
		if (taskDateInput) {
			taskDateInput.value = dateKey
		}
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
			const emptyState = document.createElement('div')
			emptyState.className = 'task-preview-empty'
			emptyState.textContent = 'Brak zadan na dzisiaj'
			taskPreviewList.appendChild(emptyState)
			return
		}

		todayTasks.forEach(task => {
			const priority = priorityMap[task.priority] || priorityMap.medium
			const item = document.createElement('div')
			item.className = 'task-preview-item'
			item.innerHTML = `
				<span class="task-preview-dot ${priority.className}"></span>
				<span class="task-preview-copy">${task.time} • ${task.title}</span>
			`
			taskPreviewList.appendChild(item)
		})
	}

	const renderTaskAgenda = () => {
		if (!taskAgendaList || !taskAgendaTitle || !taskAgendaCount) return

		const selectedDate = new Date(`${selectedTaskDate}T00:00`)
		const selectedTasks = getTasksForDate(selectedTaskDate)

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
			emptyState.textContent = 'Brak zadan na wybrany dzien.'
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
						<span class="task-agenda-time">${task.time}</span>
					</div>
					<h4>${task.title}</h4>
					<p>${task.description?.trim() || 'Bez dodatkowego opisu.'}</p>
				</div>
				<button type="button" class="task-delete-btn" data-task-delete="${task.id}" aria-label="Usun zadanie">
					<i class="fa-solid fa-trash"></i>
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

	const showTaskToast = task => {
		if (!taskToastStack) return

		const priority = priorityMap[task.priority] || priorityMap.medium
		const toast = document.createElement('article')
		toast.className = `task-toast ${priority.className}`
		toast.innerHTML = `
			<div class="task-toast-dot ${priority.className}"></div>
			<div class="task-toast-copy">
				<strong>Za 5 minut: ${task.title}</strong>
				<span>${task.time} • ${task.description?.trim() || 'Zaplanowane zadanie'}</span>
			</div>
			<button type="button" class="task-toast-close" aria-label="Zamknij przypomnienie">
				<i class="fa-solid fa-xmark"></i>
			</button>
		`

		taskToastStack.appendChild(toast)

		const removeToast = () => {
			toast.classList.add('is-leaving')
			window.setTimeout(() => toast.remove(), 220)
		}

		toast.querySelector('.task-toast-close')?.addEventListener('click', removeToast)
		window.setTimeout(removeToast, 9000)
	}

	const cleanupReminderCache = () => {
		const activeReminderIds = new Set(tasks.map(createReminderId))
		remindedTaskIds.forEach(reminderId => {
			if (!activeReminderIds.has(reminderId)) {
				remindedTaskIds.delete(reminderId)
			}
		})
		saveRemindedTasks()
	}

	const removeExpiredTasks = () => {
		if (!autoClearEnabled) return

		const now = new Date()
		const initialTaskCount = tasks.length
		tasks = tasks.filter(task => getTaskDateTime(task) >= now)
		if (tasks.length === initialTaskCount) return

		saveTasks()
		cleanupReminderCache()

		const selectedTasks = getTasksForDate(selectedTaskDate)
		if (selectedTasks.length === 0) {
			selectedTaskDate = formatTaskDateKey(now)
			setDefaultTaskDate(selectedTaskDate)
		}

		syncTaskUi()
	}

	const checkTaskReminders = () => {
		removeExpiredTasks()

		const now = new Date()

		tasks.forEach(task => {
			const reminderId = createReminderId(task)
			if (remindedTaskIds.has(reminderId)) return

			const minutesUntilTask = (getTaskDateTime(task) - now) / 60000
			if (minutesUntilTask > 5 || minutesUntilTask < 0) return

			remindedTaskIds.add(reminderId)
			saveRemindedTasks()
			showTaskToast(task)
		})
	}

	const initTaskReminders = () => {
		if (!taskToastStack) return

		cleanupReminderCache()
		checkTaskReminders()

		if (reminderTimerId) {
			window.clearInterval(reminderTimerId)
		}

		reminderTimerId = window.setInterval(checkTaskReminders, 30000)
	}

	const openTaskModal = () => {
		if (!taskModal) return
		taskModal.hidden = false
		taskModal.setAttribute('aria-hidden', 'false')
		document.body.classList.add('task-modal-open')
		setDefaultTaskDate(selectedTaskDate)
		syncTaskUi()
		taskTitleInput?.focus()
	}

	const closeTaskModal = () => {
		if (!taskModal) return
		taskModal.hidden = true
		taskModal.setAttribute('aria-hidden', 'true')
		document.body.classList.remove('task-modal-open')
	}

	const initTasks = () => {
		if (!clockWidgetTrigger || !taskModal || !taskForm) return

		populateTimeSelects()
		setDefaultTaskDate(selectedTaskDate)
		syncTaskUi()
		if (taskAutoclearToggle) {
			taskAutoclearToggle.checked = autoClearEnabled
		}

		clockWidgetTrigger.addEventListener('click', openTaskModal)
		clockWidgetTrigger.addEventListener('keydown', event => {
			if (event.key !== 'Enter' && event.key !== ' ') return
			event.preventDefault()
			openTaskModal()
		})

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

			selectedTaskDate = dayButton.dataset.date
			setDefaultTaskDate(selectedTaskDate)
			renderTaskCalendar()
			renderTaskAgenda()
		})

		taskDateInput?.addEventListener('change', () => {
			if (!taskDateInput.value) return
			selectedTaskDate = taskDateInput.value
			const [year, month] = selectedTaskDate.split('-').map(Number)
			calendarCursor = new Date(year, month - 1, 1)
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
			autoClearEnabled = Boolean(taskAutoclearToggle.checked)
			saveAutoclearPreference()
			removeExpiredTasks()
		})

		taskForm.addEventListener('submit', event => {
			event.preventDefault()

			if (!taskTitleInput || !taskDateInput || !taskTimeInput || !taskPriorityInput) return

			const title = taskTitleInput.value.trim()
			const date = taskDateInput.value
			const time = taskTimeInput.value
			const priority = taskPriorityInput.value
			const description = taskDescriptionInput?.value.trim() || ''

			if (!title || !date || !time || !priority) return

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

			selectedTaskDate = date
			const [year, month] = date.split('-').map(Number)
			calendarCursor = new Date(year, month - 1, 1)

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

			tasks = tasks.filter(task => task.id !== taskId)
			saveTasks()
			syncTaskUi()
			cleanupReminderCache()
		})
	}

	const initScrollCue = () => {
		if (!dashboardScrollCue || !dashboardMenu) return

		dashboardScrollCue.addEventListener('click', () => {
			dashboardMenu.scrollIntoView({
				behavior: 'smooth',
				block: 'start',
			})
		})
	}

	const updateClock = () => {
		if (!clockHour || !clockMinute || !clockSecond || !clockDigital || !clockDate) return

		const now = new Date()
		const hours = now.getHours()
		const minutes = now.getMinutes()
		const seconds = now.getSeconds()
		const minuteKey = `${padNumber(hours)}:${padNumber(minutes)}`
		const dateKey = formatTaskDateKey(now)

		const hourDegrees = (hours % 12) * 30 + minutes * 0.5
		const minuteDegrees = minutes * 6 + seconds * 0.1
		const secondDegrees = seconds * 6

		clockHour.style.transform = `translateX(-50%) rotate(${hourDegrees}deg)`
		clockMinute.style.transform = `translateX(-50%) rotate(${minuteDegrees}deg)`
		clockSecond.style.transform = `translateX(-50%) rotate(${secondDegrees}deg)`

		if (minuteKey !== lastClockMinuteKey) {
			lastClockMinuteKey = minuteKey
			clockDigital.textContent = minuteKey
		}

		if (dateKey !== lastClockDateKey) {
			lastClockDateKey = dateKey
			clockDate.textContent = now.toLocaleDateString('pl-PL', {
				weekday: 'long',
				day: '2-digit',
				month: 'long',
			})
			renderTaskPreview()
		}
	}

	const setWeatherState = ({ temperature, location, description, wind, icon }) => {
		const weatherTemp = document.getElementById('weather-temp')
		const weatherLocation = document.getElementById('weather-location')
		const weatherDescription = document.getElementById('weather-description')
		const weatherWind = document.getElementById('weather-wind')
		const weatherIcon = document.getElementById('weather-icon')

		if (weatherTemp) weatherTemp.textContent = temperature
		if (weatherLocation) {
			const compactLocation = window.innerWidth <= 640 ? location.split(',')[0].trim() : location
			weatherLocation.textContent = compactLocation
		}
		if (weatherDescription) weatherDescription.textContent = description
		if (weatherWind) weatherWind.textContent = wind
		if (weatherIcon) {
			weatherIcon.innerHTML = `<i class="fa-solid ${icon}"></i>`
		}
	}

	const fetchWeather = async (latitude, longitude, locationName) => {
		try {
			const response = await fetch(
				`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code,wind_speed_10m&timezone=auto`,
				{ cache: 'no-store' }
			)
			if (!response.ok) {
				throw new Error('Weather request failed')
			}

			const data = await response.json()
			const current = data.current || {}
			const weatherDetails = weatherCodeMap[current.weather_code] || {
				label: 'Warunki lokalne',
				icon: 'fa-cloud-sun',
			}

			setWeatherState({
				temperature: `${Math.round(current.temperature_2m ?? 0)}°C`,
				location: locationName,
				description: weatherDetails.label,
				wind: `Wiatr ${Math.round(current.wind_speed_10m ?? 0)} km/h`,
				icon: weatherDetails.icon,
			})
		} catch (error) {
			setWeatherState({
				temperature: '--°C',
				location: locationName,
				description: 'Brak danych pogodowych',
				wind: 'Sprawdź połączenie',
				icon: 'fa-cloud',
			})
		}
	}

	const fetchWeatherForLocation = async locationName => {
		const trimmedLocation = locationName.trim()
		if (!trimmedLocation) return

		setWeatherState({
			temperature: '--°C',
			location: trimmedLocation,
			description: 'Szukanie lokalizacji...',
			wind: 'Proszę czekać',
			icon: 'fa-cloud-sun',
		})

		try {
			const response = await fetch(
				`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(trimmedLocation)}&count=10&language=pl&format=json`,
				{ cache: 'no-store' }
			)
			if (!response.ok) {
				throw new Error('Geocoding request failed')
			}

			const data = await response.json()
			const result = pickBestGeocodingResult(data.results, trimmedLocation)
			if (!result) {
				throw new Error('Location not found')
			}

			const resolvedName = [result.name, result.country].filter(Boolean).join(', ')
			localStorage.setItem(weatherConfig.storageKey, trimmedLocation)
			fetchWeather(result.latitude, result.longitude, resolvedName)
		} catch (error) {
			setWeatherState({
				temperature: '--°C',
				location: trimmedLocation,
				description: 'Nie znaleziono lokalizacji',
				wind: 'Spróbuj innej nazwy',
				icon: 'fa-cloud',
			})
		}
	}

	const requestCurrentPosition = options =>
		new Promise((resolve, reject) => {
			navigator.geolocation.getCurrentPosition(resolve, reject, options)
		})

	const requestBestCurrentPosition = ({ timeout = 16000, desiredAccuracy = 2500 } = {}) =>
		new Promise((resolve, reject) => {
			let bestPosition = null
			let isSettled = false
			let watchId = null
			let timeoutId = null

			const finish = (callback, value) => {
				if (isSettled) return

				isSettled = true
				if (watchId !== null) {
					navigator.geolocation.clearWatch(watchId)
				}
				if (timeoutId !== null) {
					window.clearTimeout(timeoutId)
				}

				callback(value)
			}

			const rememberBestPosition = position => {
				if (!bestPosition) {
					bestPosition = position
					return
				}

				if ((position.coords.accuracy ?? Number.POSITIVE_INFINITY) < (bestPosition.coords.accuracy ?? Number.POSITIVE_INFINITY)) {
					bestPosition = position
				}
			}

			// `watchPosition` daje przeglądarce chwilę na doprecyzowanie współrzędnych.
			watchId = navigator.geolocation.watchPosition(
				position => {
					rememberBestPosition(position)

					if ((position.coords.accuracy ?? Number.POSITIVE_INFINITY) <= desiredAccuracy) {
						finish(resolve, bestPosition)
					}
				},
				error => {
					if (bestPosition) {
						finish(resolve, bestPosition)
						return
					}

					finish(reject, error)
				},
				{
					enableHighAccuracy: true,
					timeout,
					maximumAge: 0,
				}
			)

			timeoutId = window.setTimeout(() => {
				if (bestPosition) {
					finish(resolve, bestPosition)
					return
				}

				requestCurrentPosition({
					enableHighAccuracy: false,
					timeout: 10000,
					maximumAge: 300000,
				})
					.then(position => finish(resolve, position))
					.catch(error => finish(reject, error))
			}, timeout)
		})

	const resolveCurrentLocationName = async (latitude, longitude) => {
		const geoapifyApiKey = getGeoapifyApiKey()

		if (geoapifyApiKey) {
			try {
				const response = await fetch(
					`https://api.geoapify.com/v1/geocode/reverse?lat=${latitude}&lon=${longitude}&type=city&lang=pl&limit=1&apiKey=${encodeURIComponent(geoapifyApiKey)}`,
					{ cache: 'no-store' }
				)
				if (!response.ok) {
					throw new Error('Geoapify reverse geocoding request failed')
				}

				const data = await response.json()
				const properties = data?.features?.[0]?.properties
				if (properties) {
					return buildGeoapifyLocationDetails(properties)
				}
			} catch (error) {
				// Fallback zostaje na Nominatim, żeby przycisk działał nawet przy błędzie API lub limicie.
			}
		}

		try {
			const response = await fetch(
				`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&accept-language=pl&addressdetails=1&zoom=18`,
				{ cache: 'no-store' }
			)
			if (!response.ok) {
				throw new Error('Reverse geocoding request failed')
			}

			const data = await response.json()
			const address = data.address || {}
			return buildCurrentLocationDetails(address)
		} catch (error) {
			return {
				displayLabel: 'Aktualna lokalizacja',
				searchLabel: 'Aktualna lokalizacja',
			}
		}
	}

	const fetchWeatherForCurrentLocation = async () => {
		if (!navigator.geolocation) {
			setWeatherState({
				temperature: '--°C',
				location: 'Aktualna lokalizacja',
				description: 'Geolokalizacja niedostępna',
				wind: 'Twoja przeglądarka jej nie wspiera',
				icon: 'fa-location-crosshairs',
			})
			return
		}

		if (!window.isSecureContext) {
			setWeatherState({
				temperature: '--°C',
				location: 'Aktualna lokalizacja',
				description: 'Safari wymaga bezpiecznego adresu',
				wind: 'Uruchom przez HTTPS albo localhost',
				icon: 'fa-location-crosshairs',
			})
			return
		}

		setWeatherState({
			temperature: '--°C',
			location: 'Aktualna lokalizacja',
			description: 'Pobieram pozycję...',
			wind: 'Proszę czekać',
			icon: 'fa-location-crosshairs',
		})

		try {
			const position = await requestBestCurrentPosition()

			const latitude = position.coords.latitude
			const longitude = position.coords.longitude
			const locationDetails = await resolveCurrentLocationName(latitude, longitude)

			fetchWeather(latitude, longitude, locationDetails.displayLabel)
			if (weatherLocationInput) {
				weatherLocationInput.value = locationDetails.searchLabel
			}
			localStorage.setItem(weatherConfig.storageKey, locationDetails.searchLabel)
		} catch (error) {
			const geolocationErrors = {
				1: {
					description: 'Dostęp do lokalizacji zablokowany',
					wind: 'Sprawdź ustawienia Safari i macOS',
				},
				2: {
					description: 'Safari nie mogło ustalić pozycji',
					wind: 'Włącz Wi-Fi i spróbuj ponownie',
				},
				3: {
					description: 'Przekroczono czas pobierania',
					wind: 'Połączenie lub usługi lokalizacji odpowiadają zbyt długo',
				},
			}
			const fallbackMessage = {
				description: 'Nie udało się pobrać lokalizacji',
				wind: 'Sprawdź uprawnienia przeglądarki',
			}
			const message = geolocationErrors[error?.code] || fallbackMessage

			setWeatherState({
				temperature: '--°C',
				location: 'Aktualna lokalizacja',
				description: message.description,
				wind: message.wind,
				icon: 'fa-location-crosshairs',
			})
		}
	}

	const initWeather = () => {
		if (!document.getElementById('weather-temp')) return

		const closeWeatherEditor = () => {
			document.body.classList.remove('weather-editor-open')
		}

		const openWeatherEditor = () => {
			if (!weatherLocationInput) return

			document.body.classList.add('weather-editor-open')
			weatherLocationInput.value = localStorage.getItem(weatherConfig.storageKey) || weatherConfig.fallbackName
			window.setTimeout(() => {
				weatherLocationInput.focus()
				weatherLocationInput.select()
			}, 20)
		}

		const savedLocation = localStorage.getItem(weatherConfig.storageKey) || weatherConfig.fallbackName
		if (weatherLocationInput) {
			weatherLocationInput.value = savedLocation
		}

		fetchWeatherForLocation(savedLocation)

		if (weatherSearchForm && weatherLocationInput) {
			weatherSearchForm.addEventListener('submit', event => {
				event.preventDefault()
				fetchWeatherForLocation(weatherLocationInput.value)
				closeWeatherEditor()
			})
		}

		weatherCurrentLocationBtn?.addEventListener('click', () => {
			fetchWeatherForCurrentLocation()
			closeWeatherEditor()
		})

		if (weatherWidget && weatherLocationInput) {
			weatherWidget.addEventListener('click', event => {
				if (event.target.closest('.weather-search')) return
				openWeatherEditor()
			})

			weatherWidget.addEventListener('keydown', event => {
				if (event.key !== 'Enter' && event.key !== ' ') return
				if (document.body.classList.contains('weather-editor-open')) return

				event.preventDefault()
				openWeatherEditor()
			})

			document.addEventListener('click', event => {
				if (!document.body.classList.contains('weather-editor-open')) return
				if (weatherWidget.contains(event.target)) return
				closeWeatherEditor()
			})

			weatherLocationInput.addEventListener('keydown', event => {
				if (event.key !== 'Escape') return
				closeWeatherEditor()
			})
		}
	}

	updateClock()
	window.setInterval(updateClock, 1000)
	initWeather()
	initTasks()
	initTaskReminders()
	initScrollCue()

	document.querySelectorAll('.menu-item[target="_blank"]').forEach(link => {
		link.addEventListener('click', event => {
			event.preventDefault()
			window.open(link.href, '_blank')
		})
	})
})
/* === Dashboard Init: End === */
