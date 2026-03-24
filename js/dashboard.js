/* === Dashboard Init: Start === */
document.addEventListener('DOMContentLoaded', () => {
	const dashboardContainer = document.querySelector('.dashboard-container')
	if (!dashboardContainer) return

	dashboardContainer.classList.add('is-ready')

	const services = {
		storageService: window.AppServices?.storageService,
		preferencesService: window.AppServices?.preferencesService,
	}

	const elements = {
		clockHour: document.getElementById('clock-hour'),
		clockMinute: document.getElementById('clock-minute'),
		clockSecond: document.getElementById('clock-second'),
		clockDigital: document.getElementById('clock-digital'),
		clockDate: document.getElementById('clock-date'),
		clockWidgetTrigger: document.getElementById('clock-widget-trigger'),
		dashboardScrollCue: document.getElementById('dashboard-scroll-cue'),
		dashboardMenu: document.getElementById('dashboard-menu'),
		taskPreviewList: document.getElementById('task-preview-list'),
		weatherTemp: document.getElementById('weather-temp'),
		weatherLocation: document.getElementById('weather-location'),
		weatherDescription: document.getElementById('weather-description'),
		weatherWind: document.getElementById('weather-wind'),
		weatherIcon: document.getElementById('weather-icon'),
		weatherSearchForm: document.getElementById('weather-search-form'),
		weatherLocationInput: document.getElementById('weather-location-input'),
		weatherCurrentLocationBtn: document.getElementById('weather-current-location-btn'),
		weatherWidget: document.querySelector('.weather-widget'),
		taskModal: document.getElementById('task-modal'),
		taskForm: document.getElementById('task-form'),
		taskTitleInput: document.getElementById('task-title'),
		taskDateInput: document.getElementById('task-date'),
		taskTimeInput: document.getElementById('task-time'),
		taskHourInput: document.getElementById('task-hour'),
		taskMinuteInput: document.getElementById('task-minute'),
		taskPriorityInput: document.getElementById('task-priority'),
		taskDescriptionInput: document.getElementById('task-description'),
		taskCalendarMonth: document.getElementById('task-calendar-month'),
		taskCalendarGrid: document.getElementById('task-calendar-grid'),
		taskCalendarWeekdays: document.getElementById('task-calendar-weekdays'),
		taskAgendaTitle: document.getElementById('task-agenda-title'),
		taskAgendaCount: document.getElementById('task-agenda-count'),
		taskAgendaList: document.getElementById('task-agenda-list'),
		taskCalendarPrev: document.getElementById('task-calendar-prev'),
		taskCalendarNext: document.getElementById('task-calendar-next'),
		taskToastStack: document.getElementById('task-toast-stack'),
		taskAutoclearToggle: document.getElementById('task-autoclear-toggle'),
	}

	const plannerController = window.DashboardModules?.createTaskPlannerController?.({
		elements,
		services,
	})
	const clockController = window.DashboardModules?.createClockController?.({
		elements,
		onDayChange: () => plannerController?.refreshPreview?.(),
	})
	const weatherController = window.DashboardModules?.createWeatherController?.({
		elements,
		services,
	})

	plannerController?.init?.()
	clockController?.start?.()
	weatherController?.init?.()
	window.DashboardModules?.initDashboardTopbar?.({
		dashboardScrollCue: elements.dashboardScrollCue,
		dashboardMenu: elements.dashboardMenu,
	})

	window.addEventListener('storage', event => {
		plannerController?.handleStorageChange?.(event.key)
	})
})
/* === Dashboard Init: End === */
