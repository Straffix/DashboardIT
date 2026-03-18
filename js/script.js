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
}

const formatDate = date => {
	const parsedDate = new Date(date)
	if (Number.isNaN(parsedDate.getTime())) return ''

	const year = parsedDate.getFullYear()
	const month = String(parsedDate.getMonth() + 1).padStart(2, '0')
	const day = String(parsedDate.getDate()).padStart(2, '0')

	return `${year}-${month}-${day}`
}

const normalizeSN = sn => (sn ? sn.toString().trim().replace(/-/g, '').toUpperCase() : '')

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

const createMonthPicker = ({
	initialDate = new Date(),
	onChange,
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
		const selectedMonth = currentViewDate.getMonth()

		const popover = document.createElement('div')
		popover.className = 'month-fallback-popover'
		popover.setAttribute('role', 'dialog')
		popover.setAttribute('aria-label', 'Wybor miesiaca')

		const monthOptions = APP_CONFIG.MONTH_NAMES.map(
			(name, idx) => `<option value="${idx}" ${idx === selectedMonth ? 'selected' : ''}>${name}</option>`
		).join('')

		let yearOptions = ''
		for (let year = selectedYear - 5; year <= selectedYear + 5; year += 1) {
			yearOptions += `<option value="${year}" ${year === selectedYear ? 'selected' : ''}>${year}</option>`
		}

		popover.innerHTML = `
			<div class="month-fallback-title">Wybierz miesiac</div>
			<div class="month-fallback-grid">
				<label class="month-fallback-field">
					<span>Miesiac</span>
					<select id="fallback-month-select">${monthOptions}</select>
				</label>
				<label class="month-fallback-field">
					<span>Rok</span>
					<select id="fallback-year-select">${yearOptions}</select>
				</label>
			</div>
			<div class="month-fallback-actions">
				<button type="button" class="month-fallback-btn" id="fallback-month-cancel">Anuluj</button>
				<button type="button" class="month-fallback-btn is-primary" id="fallback-month-apply">Zastosuj</button>
			</div>
		`

		trigger.appendChild(popover)
		monthPopover = popover

		const monthSelect = popover.querySelector('#fallback-month-select')
		const yearSelect = popover.querySelector('#fallback-year-select')
		const applyBtn = popover.querySelector('#fallback-month-apply')
		const cancelBtn = popover.querySelector('#fallback-month-cancel')

		const apply = () => {
			const year = Number(yearSelect.value)
			const month = Number(monthSelect.value)
			if (!year || month < 0 || month > 11) return

			setCurrentDate(new Date(year, month, 1))
			closePopover()
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

		applyBtn.addEventListener('click', apply)
		cancelBtn.addEventListener('click', closePopover)
		window.addEventListener('keydown', onKeyDown)

		setTimeout(() => {
			document.addEventListener('click', onDocumentClick)
		}, 0)

		monthPopoverCleanup = () => {
			window.removeEventListener('keydown', onKeyDown)
			document.removeEventListener('click', onDocumentClick)
		}
	}

	const openPicker = () => {
		const input = document.getElementById(inputId)
		if (!input) return

		syncInput()

		if (useCustomPicker || input.type !== 'month') {
			openFallbackMonthPopover()
			return
		}

		try {
			if (typeof input.showPicker === 'function') {
				input.showPicker()
				return
			}
		} catch (error) {
			// Native picker unavailable, fall back to focus and click.
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
					event.preventDefault()
					openPicker()
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

document.addEventListener('DOMContentLoaded', () => {
	document.querySelectorAll('#current-year').forEach(element => {
		element.textContent = new Date().getFullYear()
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

window.AppUtils = {
	config: APP_CONFIG,
	formatDate,
	normalizeSN,
	renderAccessoryIcons,
	createMonthPicker,
}
