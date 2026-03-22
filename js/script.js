/* === Shared Config: Start === */
const APP_CONFIG = {
	MONTH_NAMES: [
		'Stycze\u0144',
		'Luty',
		'Marzec',
		'Kwiecie\u0144',
		'Maj',
		'Czerwiec',
		'Lipiec',
		'Sierpie\u0144',
		'Wrzesie\u0144',
		'Pa\u017adziernik',
		'Listopad',
		'Grudzie\u0144',
	],
	ICON_MAP: {
		mouse: 'fa-mouse',
		keyboard: 'fa-keyboard',
		headset: 'fa-headset',
		monitor: 'fa-desktop',
		bag: 'fa-briefcase',
	},
	ACCESSORY_LABELS: {
		mouse: 'Myszka',
		keyboard: 'Klawiatura',
		headset: 'S\u0142uchawki',
		monitor: 'Monitor',
		bag: 'Torba / Etui',
	},
	STORAGE_KEYS: {
		MONITOR: 'monitor_laptopow_dane',
		HIRES: 'nowe_zatrudnienia_dane',
		EXCHANGES: 'wymiana_sprzetu_dane',
	},
	THEME_KEY: 'dashboard-theme',
}
/* === Shared Config: End === */

/* === Shared Formatters: Start === */
const createDateFromParts = (year, month, day) => {
	const parsedYear = Number(year)
	const parsedMonth = Number(month)
	const parsedDay = Number(day)

	if (!parsedYear || !parsedMonth || !parsedDay) return null

	const parsedDate = new Date(parsedYear, parsedMonth - 1, parsedDay)
	if (Number.isNaN(parsedDate.getTime())) return null
	if (parsedDate.getFullYear() !== parsedYear || parsedDate.getMonth() !== parsedMonth - 1 || parsedDate.getDate() !== parsedDay) {
		return null
	}

	return parsedDate
}

const parseDate = value => {
	if (value instanceof Date) {
		const parsedDate = new Date(value.getTime())
		return Number.isNaN(parsedDate.getTime()) ? null : parsedDate
	}

	if (typeof value === 'number' && Number.isFinite(value)) {
		const excelDate = new Date(Date.UTC(1899, 11, 30) + value * 86400000)
		return createDateFromParts(excelDate.getUTCFullYear(), excelDate.getUTCMonth() + 1, excelDate.getUTCDate())
	}

	const stringValue = String(value || '').trim()
	if (!stringValue) return null

	if (/^\d+(\.\d+)?$/.test(stringValue)) {
		return parseDate(Number(stringValue))
	}

	const isoDateMatch = stringValue.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
	if (isoDateMatch) {
		return createDateFromParts(isoDateMatch[1], isoDateMatch[2], isoDateMatch[3])
	}

	const isoDateTimeMatch = stringValue.match(/^(\d{4})-(\d{1,2})-(\d{1,2})T/)
	if (isoDateTimeMatch) {
		return createDateFromParts(isoDateTimeMatch[1], isoDateTimeMatch[2], isoDateTimeMatch[3])
	}

	const localDateMatch = stringValue.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/)
	if (localDateMatch) {
		return createDateFromParts(localDateMatch[3], localDateMatch[2], localDateMatch[1])
	}

	const parsedDate = new Date(stringValue)
	return Number.isNaN(parsedDate.getTime()) ? null : parsedDate
}

const formatDate = date => {
	const parsedDate = parseDate(date)
	if (!parsedDate) return ''

	const year = parsedDate.getFullYear()
	const month = String(parsedDate.getMonth() + 1).padStart(2, '0')
	const day = String(parsedDate.getDate()).padStart(2, '0')

	return `${year}-${month}-${day}`
}

const normalizeSpreadsheetDate = value => formatDate(parseDate(value))

const isSameMonth = (leftValue, rightValue) => {
	const leftDate = parseDate(leftValue)
	const rightDate = parseDate(rightValue)
	if (!leftDate || !rightDate) return false

	return leftDate.getFullYear() === rightDate.getFullYear() && leftDate.getMonth() === rightDate.getMonth()
}

const normalizeSN = sn => (sn ? sn.toString().trim().replace(/-/g, '').toUpperCase() : '')
/* === Shared Formatters: End === */

/* === Shared Accessory Rendering: Start === */
const getAccessorySizeClass = size => {
	if (size === '1rem') return 'acc-size-sm'
	return 'acc-size-md'
}

const getAccessoryColumnsClass = columns => {
	if (columns === 3) return 'acc-cols-3'
	return ''
}

const renderAccessoryIcons = (accessories, options = {}) => {
	const legacyMode = typeof options === 'string'
	const defaults = {
		size: '1.2rem',
		maxVisible: Number.POSITIVE_INFINITY,
		wrapperClass: 'inline-accessories',
		columns: null,
	}
	const config = legacyMode
		? { ...defaults, size: options }
		: {
				size: options.size || defaults.size,
				maxVisible: Number.isFinite(options.maxVisible) ? options.maxVisible : defaults.maxVisible,
				wrapperClass: options.wrapperClass || defaults.wrapperClass,
				columns: Number.isFinite(options.columns) ? options.columns : null,
		  }

	if (!accessories || accessories.length === 0) {
		return '<small class="acc-empty">brak</small>'
	}

	const normalized = accessories.filter(Boolean)
	const visibleItems = normalized.slice(0, config.maxVisible)
	const hiddenItems = normalized.slice(config.maxVisible)
	const wrapperClasses = [config.wrapperClass, getAccessorySizeClass(config.size), getAccessoryColumnsClass(config.columns)].filter(Boolean)

	const items = visibleItems
		.map(acc => {
			const icon = APP_CONFIG.ICON_MAP[acc] || 'fa-box'
			const label = APP_CONFIG.ACCESSORY_LABELS[acc] || acc
			return `<i class="fas ${icon} acc-inline-icon" title="${label}"></i>`
		})
		.join('')

	const hiddenBadge = hiddenItems.length
		? `<span class="acc-more-badge" title="${hiddenItems.map(acc => APP_CONFIG.ACCESSORY_LABELS[acc] || acc).join(', ')}">+${hiddenItems.length}</span>`
		: ''

	return `<span class="${wrapperClasses.join(' ')}">${items}${hiddenBadge}</span>`
}
/* === Shared Accessory Rendering: End === */

/* === Shared Month Picker Utilities: Start === */
const supportsMonthInput = () => {
	const input = document.createElement('input')
	input.setAttribute('type', 'month')
	return input.type === 'month'
}

const parseYearMonth = value => {
	if (!value) return null

	const match = value.match(/^(\d{4})-(\d{1,2})/)
	if (!match) return null

	const year = Number(match[1])
	const month = Number(match[2])
	if (!year || month < 1 || month > 12) return null

	return { year, month }
}
/* === Shared Month Picker Utilities: End === */

/* === Shared Month Picker Factory: Start === */
const createMonthPicker = ({
	initialDate = new Date(),
	onChange,
	getCounts,
	useCustomPicker = true,
	triggerId = 'month-trigger',
	inputId = 'hidden-month-input',
	displayId = 'current-month-display',
	tableBodyId = 'table-body',
} = {}) => {
	let currentViewDate = new Date(initialDate.getFullYear(), initialDate.getMonth(), 1)
	let isAnimating = false
	let monthPopover = null
	let monthPopoverCleanup = null

	const closePopover = () => {
		if (monthPopoverCleanup) {
			monthPopoverCleanup()
			monthPopoverCleanup = null
		}

		if (monthPopover) {
			monthPopover.remove()
			monthPopover = null
		}
	}

	const updateDisplay = () => {
		const display = document.getElementById(displayId)
		if (!display) return

		const monthName = APP_CONFIG.MONTH_NAMES[currentViewDate.getMonth()].toUpperCase()
		display.innerText = `${monthName} ${currentViewDate.getFullYear()}`
	}

	const syncInput = () => {
		const input = document.getElementById(inputId)
		if (!input) return

		const year = currentViewDate.getFullYear()
		const month = String(currentViewDate.getMonth() + 1).padStart(2, '0')
		input.value = `${year}-${month}`
	}

	const refreshView = () => {
		updateDisplay()
		syncInput()
	}

	const setCurrentDate = (date, { render = true } = {}) => {
		const nextDate = new Date(date)
		if (Number.isNaN(nextDate.getTime())) return

		currentViewDate = new Date(nextDate.getFullYear(), nextDate.getMonth(), 1)
		refreshView()

		if (render && typeof onChange === 'function') {
			onChange(new Date(currentViewDate))
		}
	}

	const setCurrentDateFromValue = value => {
		const parsed = parseYearMonth(value)
		if (!parsed) return

		setCurrentDate(new Date(parsed.year, parsed.month - 1, 1))
	}

	const openFallbackMonthPopover = () => {
		closePopover()

		const trigger = document.getElementById(triggerId)
		if (!trigger) return

		const selectedYear = currentViewDate.getFullYear()
		const getMonthCountsForYear = year =>
			typeof getCounts === 'function' ? getCounts(year) : Array.from({ length: 12 }, () => 0)

		const getYearRecordTotal = year =>
			getMonthCountsForYear(year).reduce((sum, count) => sum + (Number(count) || 0), 0)

		const popover = document.createElement('div')
		popover.className = 'month-fallback-popover'
		popover.setAttribute('role', 'dialog')
		popover.setAttribute('aria-label', 'Wybor roku i miesiaca')

		let yearOptions = ''
		for (let year = selectedYear - 5; year <= selectedYear + 5; year += 1) {
			const yearTotal = getYearRecordTotal(year)
			const optionLabel = yearTotal > 0 ? `${year} (${yearTotal})` : `${year}`
			yearOptions += `<option value="${year}" ${year === selectedYear ? 'selected' : ''}>${optionLabel}</option>`
		}

		popover.innerHTML = `
			<div class="month-fallback-title">Wybierz rok i miesiac</div>
			<div class="month-fallback-grid">
				<label class="month-fallback-field">
					<span>Rok</span>
					<select id="fallback-year-select">${yearOptions}</select>
				</label>
			</div>
			<div class="month-fallback-months" id="fallback-months" aria-label="Lista miesiecy"></div>
		`

		trigger.appendChild(popover)
		monthPopover = popover

		const yearSelect = popover.querySelector('#fallback-year-select')
		const monthsContainer = popover.querySelector('#fallback-months')
		const stopPopoverEvent = event => {
			event.stopPropagation()
		}

		const renderMonthButtons = year => {
			if (!monthsContainer) return

			const monthCounts = getMonthCountsForYear(year)

			monthsContainer.innerHTML = APP_CONFIG.MONTH_NAMES.map((name, monthIndex) => {
				const count = Number(monthCounts?.[monthIndex]) || 0
				const isActive = year === currentViewDate.getFullYear() && monthIndex === currentViewDate.getMonth()

				return `
					<button
						type="button"
						class="month-fallback-month${count > 0 ? ' has-records' : ''}${isActive ? ' is-active' : ''}"
						data-month-index="${monthIndex}"
						aria-pressed="${isActive}"
						aria-label="${name} ${year}, liczba rekordow: ${count}">
						<span class="month-fallback-month-label">${name.slice(0, 3).toLocaleUpperCase('pl-PL')}</span>
						${count > 0 ? `<span class="month-fallback-month-count">${count}</span>` : ''}
					</button>
				`
			}).join('')
		}

		const onKeyDown = event => {
			if (event.key === 'Escape') {
				event.preventDefault()
				closePopover()
			}
		}

		const onDocumentClick = event => {
			if (!popover.contains(event.target) && !trigger.contains(event.target)) {
				closePopover()
			}
		}

		popover.addEventListener('click', stopPopoverEvent)
		popover.addEventListener('mousedown', stopPopoverEvent)
		yearSelect?.addEventListener('change', event => {
			const nextYear = Number(event.target.value)
			renderMonthButtons(nextYear)
		})
		monthsContainer?.addEventListener('click', event => {
			const monthButton = event.target.closest('.month-fallback-month[data-month-index]')
			if (!monthButton) return

			const year = Number(yearSelect?.value)
			const month = Number(monthButton.dataset.monthIndex)
			if (!year || month < 0 || month > 11) return

			setCurrentDate(new Date(year, month, 1))
			closePopover()
		})
		window.addEventListener('keydown', onKeyDown)
		renderMonthButtons(selectedYear)

		setTimeout(() => {
			document.addEventListener('click', onDocumentClick)
		}, 0)

		monthPopoverCleanup = () => {
			popover.removeEventListener('click', stopPopoverEvent)
			popover.removeEventListener('mousedown', stopPopoverEvent)
			window.removeEventListener('keydown', onKeyDown)
			document.removeEventListener('click', onDocumentClick)
		}
	}

	const openPicker = event => {
		if (event) {
			event.preventDefault()
			event.stopPropagation()

			if (event.target.closest('.month-fallback-popover')) {
				return
			}
		}

		const input = document.getElementById(inputId)
		if (!input) return

		syncInput()

		if (useCustomPicker || input.type !== 'month') {
			if (monthPopover) {
				closePopover()
				return
			}

			openFallbackMonthPopover()
			return
		}

		try {
			if (typeof input.showPicker === 'function') {
				input.showPicker()
				return
			}
		} catch (error) {
		}

		input.focus()
		input.click()
	}

	const changeMonth = delta => {
		if (isAnimating) return

		const tbody = document.getElementById(tableBodyId)
		if (!tbody) {
			setCurrentDate(new Date(currentViewDate.getFullYear(), currentViewDate.getMonth() + delta, 1))
			return
		}

		isAnimating = true
		tbody.classList.remove('slide-in')
		tbody.classList.add('slide-out')

		setTimeout(() => {
			currentViewDate = new Date(currentViewDate.getFullYear(), currentViewDate.getMonth() + delta, 1)
			refreshView()

			if (typeof onChange === 'function') {
				onChange(new Date(currentViewDate))
			}

			tbody.classList.add('table-body-hidden')
			tbody.classList.remove('slide-out')

			requestAnimationFrame(() => {
				tbody.classList.remove('table-body-hidden')
				tbody.classList.add('slide-in')

				setTimeout(() => {
					isAnimating = false
				}, 500)
			})
		}, 250)
	}

	const init = () => {
		const input = document.getElementById(inputId)
		if (input) {
			if (useCustomPicker || !supportsMonthInput()) {
				input.type = 'text'
				input.readOnly = true
				input.inputMode = 'none'
			}

			syncInput()

			if (input.type === 'month') {
				const handleDatePick = event => {
					setCurrentDateFromValue(event.target.value)
				}

				input.addEventListener('change', handleDatePick)
				input.addEventListener('input', handleDatePick)
			}
		}

		const trigger = document.getElementById(triggerId)
		if (trigger) {
			trigger.addEventListener('click', openPicker)
			trigger.addEventListener('keydown', event => {
				if (event.key === 'Enter' || event.key === ' ') {
					openPicker(event)
				}
			})
		}
	}

	return {
		init,
		refreshView,
		setCurrentDate,
		getCurrentDate: () => new Date(currentViewDate),
		changeMonth,
		openPicker,
		closePopover,
	}
}
/* === Shared Month Picker Factory: End === */

/* === Shared Global UI: Start === */
const applyTheme = theme => {
	const isDark = theme === 'dark'
	document.body.classList.toggle('theme-dark', isDark)
}

const getStoredTheme = () => localStorage.getItem(APP_CONFIG.THEME_KEY) || 'light'

const createThemeToggle = () => {
	if (document.querySelector('.theme-toggle-btn')) return null

	const toggle = document.createElement('button')
	toggle.type = 'button'
	toggle.className = 'theme-toggle-btn'
	toggle.setAttribute('aria-label', 'Przelacz motyw')
	toggle.innerHTML = `
		<i class="fa-solid fa-moon"></i>
		<span>Dark Mode</span>
	`

	const updateToggle = isDark => {
		toggle.innerHTML = isDark
			? '<i class="fa-solid fa-sun"></i><span>Light Mode</span>'
			: '<i class="fa-solid fa-moon"></i><span>Dark Mode</span>'
		toggle.setAttribute('aria-pressed', String(isDark))
		toggle.title = isDark ? 'Przelacz na jasny motyw' : 'Przelacz na ciemny motyw'
	}

	toggle.addEventListener('click', () => {
		const nextTheme = document.body.classList.contains('theme-dark') ? 'light' : 'dark'
		applyTheme(nextTheme)
		localStorage.setItem(APP_CONFIG.THEME_KEY, nextTheme)
		updateToggle(nextTheme === 'dark')
	})

	updateToggle(getStoredTheme() === 'dark')
	return toggle
}

document.addEventListener('DOMContentLoaded', () => {
	applyTheme(getStoredTheme())

	document.querySelectorAll('#current-year').forEach(element => {
		element.textContent = new Date().getFullYear()
	})

	const themeToggle = createThemeToggle()
	if (themeToggle) {
		const dashboardBookmarkSlot = document.querySelector('.dashboard-theme-bookmark-slot')
		const dashboardTopbar = document.querySelector('.dashboard-topbar')
		const weatherWidget = dashboardTopbar?.querySelector('.weather-widget')
		if (document.body.classList.contains('dashboard-page') && dashboardTopbar) {
			const mobileQuery = window.matchMedia('(max-width: 640px)')
			const moveThemeToggle = () => {
				if (mobileQuery.matches || !dashboardBookmarkSlot) {
					if (weatherWidget) {
						weatherWidget.insertAdjacentElement('afterend', themeToggle)
					} else {
						dashboardTopbar.prepend(themeToggle)
					}
					return
				}

				dashboardBookmarkSlot.appendChild(themeToggle)
			}

			moveThemeToggle()
			mobileQuery.addEventListener('change', moveThemeToggle)
		} else {
			document.body.appendChild(themeToggle)
		}
	}

	const returnMenuLinks = document.querySelectorAll('.menu-btn[href="index.html"]')
	returnMenuLinks.forEach(link => {
		link.addEventListener('click', event => {
			if (window.opener && !window.opener.closed) {
				event.preventDefault()

				try {
					window.opener.focus()
				} catch (error) {
					// Browser may block focusing the opener tab.
				}

				window.close()
				return
			}

			window.location.href = link.href
		})
	})

	const fullscreenBtn = document.getElementById('fullscreen-btn')
	if (fullscreenBtn) {
		const updateWideMode = isWide => {
			document.body.classList.toggle('wide-mode', isWide)
			fullscreenBtn.innerHTML = isWide ? '<i class="fa-solid fa-compress"></i>' : '<i class="fa-solid fa-expand"></i>'
		}

		fullscreenBtn.addEventListener('click', () => {
			const isWide = !document.body.classList.contains('wide-mode')
			updateWideMode(isWide)
			localStorage.setItem('dashboard-wide-mode', String(isWide))
		})

		updateWideMode(localStorage.getItem('dashboard-wide-mode') === 'true')
	}
})
/* === Shared Global UI: End === */

/* === Shared Public API: Start === */
window.AppUtils = {
	config: APP_CONFIG,
	formatDate,
	parseDate,
	normalizeSpreadsheetDate,
	isSameMonth,
	normalizeSN,
	renderAccessoryIcons,
	createMonthPicker,
}
/* === Shared Public API: End === */
