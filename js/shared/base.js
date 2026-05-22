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
		mouse: 'computer-mouse-solid-full',
		'vertical-mouse': 'vertical-mouse-side-icon',
		keyboard: 'keyboard-solid-full',
		headset: 'headset-solid-full',
		monitor: 'desktop-solid-full',
		bag: 'briefcase-solid-full',
		backpack: 'backpack-icon',
		pointer: 'pen-clip-solid-full',
		printer: 'print-solid-full',
		'laptop-pad': 'table-cells-solid-full',
	},
	ACCESSORY_LABELS: {
		mouse: 'Myszka',
		'vertical-mouse': 'Mysz wertykalna',
		keyboard: 'Klawiatura',
		headset: 'S\u0142uchawki',
		monitor: 'Monitor',
		bag: 'Torba / Etui',
		backpack: 'Plecak',
		pointer: 'Wska\u017anik',
		printer: 'Drukarka',
		'laptop-pad': 'Podk\u0142adka pod laptopa',
	},
	ACCESSORY_ALIASES: {
		mouse: 'mouse',
		mysz: 'mouse',
		myszka: 'mouse',
		'computer-mouse-solid-full': 'mouse',
		keyboard: 'keyboard',
		klawiatura: 'keyboard',
		'keyboard-solid-full': 'keyboard',
		headset: 'headset',
		sluchawki: 'headset',
		'headset-solid-full': 'headset',
		monitor: 'monitor',
		'desktop-solid-full': 'monitor',
		bag: 'bag',
		torba: 'bag',
		etui: 'bag',
		'torba / etui': 'bag',
		briefcase: 'bag',
		'briefcase-solid-full': 'bag',
		backpack: 'backpack',
		plecak: 'backpack',
		'backpack-icon': 'backpack',
		pointer: 'pointer',
		wskaznik: 'pointer',
		pen: 'pointer',
		'pen-clip-solid-full': 'pointer',
		printer: 'printer',
		drukarka: 'printer',
		'print-solid-full': 'printer',
		'laptop-pad': 'laptop-pad',
		'laptop-stand': 'laptop-pad',
		'podkladka pod laptopa': 'laptop-pad',
		'podstawka pod laptopa': 'laptop-pad',
		'table-cells-solid-full': 'laptop-pad',
		'vertical-mouse': 'vertical-mouse',
		'mysz wertykalna': 'vertical-mouse',
		'vertical-mouse-side-icon': 'vertical-mouse',
	},
	STORAGE_KEYS: {
		MONITOR: 'monitor_laptopow_dane',
		HIRES: 'nowe_zatrudnienia_dane',
		EXCHANGES: 'wymiana_sprzetu_dane',
		USERS: 'dashboard_users',
		SESSION: 'dashboard_user_session',
		BOOKMARKS: 'dashboard_user_bookmarks',
		DASHBOARD_ACTIVE_USERS: 'dashboard_active_users',
		LUNCH: 'dashboard_lunch_reservations',
		NOTES: 'dashboard_notes_entries',
		NOTES_ACTIVE_VIEWERS: 'dashboard_notes_active_viewers',
		ANNOUNCEMENTS: 'dashboard_notes_announcements',
		TASKS: 'dashboard_notes_tasks',
	},
	PREFERENCE_KEYS: {
		THEME: 'dashboard-theme',
		WEATHER_LOCATION: 'dashboard-weather-location',
		DASHBOARD_MENU_ORDER: 'dashboard-menu-order',
		DASHBOARD_TASKS: 'dashboard-tasks',
		DASHBOARD_TASK_REMINDERS: 'dashboard-task-reminders',
		DASHBOARD_TASK_AUTOCLEAR: 'dashboard-task-autoclear',
	},
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

const normalizeSearchText = value => {
	const rawValue = String(value ?? '').trim()
	if (!rawValue) return ''

	const withoutDiacritics =
		typeof rawValue.normalize === 'function' ? rawValue.normalize('NFD').replace(/[\u0300-\u036f]/g, '') : rawValue

	return withoutDiacritics.replace(/\s+/g, ' ').toUpperCase()
}

const matchesSearchQuery = (fields, query) => {
	const normalizedQuery = normalizeSearchText(query)
	if (!normalizedQuery) return true

	const values = Array.isArray(fields) ? fields : [fields]
	return values.some(value => normalizeSearchText(value).includes(normalizedQuery))
}

const escapeHtml = value =>
	String(value || '')
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;')

const formatDateTimeLabel = value => {
	const parsedDate = parseDate(value) || new Date(String(value || ''))
	if (Number.isNaN(parsedDate.getTime())) return '--'

	return parsedDate.toLocaleString('pl-PL', {
		day: '2-digit',
		month: '2-digit',
		year: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
	})
}
/* === Shared Formatters: End === */

/* === Shared Icon Rendering: Start === */
const APP_ICON_ASSET_DIR = './img/ico'

const normalizeIconAssetName = value => String(value || '').trim().replace(/\.svg$/i, '')

const getIconAssetUrl = iconName => {
	const normalizedName = normalizeIconAssetName(iconName)
	return normalizedName ? `${APP_ICON_ASSET_DIR}/${normalizedName}.svg` : ''
}

const renderIcon = (iconName, options = {}) => {
	const assetName = normalizeIconAssetName(iconName)
	if (!assetName) return ''

	const className = String(options.className || '')
		.trim()
		.split(/\s+/)
		.filter(Boolean)
	const extraAttributes = Array.isArray(options.attributes) ? options.attributes.filter(Boolean) : []
	const title = options.title ? ` title="${escapeHtml(options.title)}"` : ''
	const ariaLabel = options.ariaLabel ? ` aria-label="${escapeHtml(options.ariaLabel)}" role="img"` : ''
	const ariaHidden = options.ariaLabel ? '' : ' aria-hidden="true"'

	return `<i class="${['app-icon', assetName, ...className].join(' ')}"${title}${ariaLabel}${ariaHidden}${
		extraAttributes.length ? ` ${extraAttributes.join(' ')}` : ''
	}></i>`
}

window.AppIcons = {
	getAssetUrl: getIconAssetUrl,
	render: renderIcon,
}
/* === Shared Icon Rendering: End === */

/* === Shared Accessory Rendering: Start === */
const normalizeAccessoryLookup = value =>
	String(value ?? '')
		.trim()
		.toLocaleLowerCase('pl-PL')
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/_/g, '-')
		.replace(/\s+/g, ' ')

const normalizeAccessoryKey = accessory => {
	const normalizedValue = normalizeAccessoryLookup(accessory)
	if (!normalizedValue) return ''

	if (APP_CONFIG.ACCESSORY_LABELS[normalizedValue] || APP_CONFIG.ICON_MAP[normalizedValue]) {
		return normalizedValue
	}

	return APP_CONFIG.ACCESSORY_ALIASES[normalizedValue] || normalizedValue
}

const normalizeAccessories = accessories => {
	const source = Array.isArray(accessories)
		? accessories
		: typeof accessories === 'string'
			? accessories.split(',')
			: []
	const seenAccessories = new Set()

	return source
		.map(normalizeAccessoryKey)
		.filter(Boolean)
		.filter(accessory => {
			if (seenAccessories.has(accessory)) return false

			seenAccessories.add(accessory)
			return true
		})
}

const getSelectedAccessories = (selector = '.accessory-item.active') =>
	Array.from(document.querySelectorAll(selector))
		.map(item => item.dataset.item)
		.filter(Boolean)

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

	const normalized = normalizeAccessories(accessories)
	if (normalized.length === 0) {
		return '<small class="acc-empty">brak</small>'
	}

	const visibleItems = normalized.slice(0, config.maxVisible)
	const hiddenItems = normalized.slice(config.maxVisible)
	const wrapperClasses = [config.wrapperClass, getAccessorySizeClass(config.size), getAccessoryColumnsClass(config.columns)].filter(Boolean)

	const items = visibleItems
		.map(acc => {
			const icon = APP_CONFIG.ICON_MAP[acc] || 'box-solid-full'
			const label = APP_CONFIG.ACCESSORY_LABELS[acc] || acc
			return renderIcon(icon, {
				className: 'acc-inline-icon',
				title: label,
			})
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
		popover.setAttribute('aria-label', 'Wybór roku i miesiąca')
		popover.style.visibility = 'hidden'

		let yearOptions = ''
		for (let year = selectedYear - 5; year <= selectedYear + 5; year += 1) {
			const yearTotal = getYearRecordTotal(year)
			const optionLabel = yearTotal > 0 ? `${year} (${yearTotal})` : `${year}`
			yearOptions += `<option value="${year}" ${year === selectedYear ? 'selected' : ''}>${optionLabel}</option>`
		}

		popover.innerHTML = `
			<div class="month-fallback-title">Wybierz rok i miesiąc</div>
			<div class="month-fallback-grid">
				<label class="month-fallback-field">
					<span>Rok</span>
					<select id="fallback-year-select">${yearOptions}</select>
				</label>
			</div>
			<div class="month-fallback-months" id="fallback-months" aria-label="Lista miesięcy"></div>
		`

		document.body.appendChild(popover)
		monthPopover = popover

		const yearSelect = popover.querySelector('#fallback-year-select')
		const monthsContainer = popover.querySelector('#fallback-months')
		const stopPopoverEvent = event => {
			event.stopPropagation()
		}
		const positionPopover = () => {
			if (!popover.isConnected) return

			const triggerRect = trigger.getBoundingClientRect()
			const popoverRect = popover.getBoundingClientRect()
			const viewportPadding = 12
			const preferredTop = triggerRect.bottom + 8
			const topLimit = Math.max(viewportPadding, window.innerHeight - popoverRect.height - viewportPadding)
			const preferredAboveTop = triggerRect.top - popoverRect.height - 8
			const shouldOpenAbove = preferredTop > topLimit && preferredAboveTop >= viewportPadding
			const top = shouldOpenAbove
				? preferredAboveTop
				: Math.max(viewportPadding, Math.min(preferredTop, topLimit))
			const preferredLeft = triggerRect.left + triggerRect.width / 2 - popoverRect.width / 2
			const leftLimit = Math.max(viewportPadding, window.innerWidth - popoverRect.width - viewportPadding)
			const left = Math.max(viewportPadding, Math.min(preferredLeft, leftLimit))

			popover.style.top = `${Math.round(top)}px`
			popover.style.left = `${Math.round(left)}px`
			popover.style.visibility = 'visible'
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

			positionPopover()
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
		window.addEventListener('resize', positionPopover)
		window.addEventListener('scroll', positionPopover, true)
		renderMonthButtons(selectedYear)
		positionPopover()

		setTimeout(() => {
			document.addEventListener('click', onDocumentClick)
		}, 0)

		monthPopoverCleanup = () => {
			popover.removeEventListener('click', stopPopoverEvent)
			popover.removeEventListener('mousedown', stopPopoverEvent)
			window.removeEventListener('keydown', onKeyDown)
			window.removeEventListener('resize', positionPopover)
			window.removeEventListener('scroll', positionPopover, true)
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

/* === Shared Audit Helpers: Start === */
const normalizeAuditFields = record => ({
	createdBy: record?.createdBy || null,
	updatedBy: record?.updatedBy || record?.createdBy || null,
	createdAt: record?.createdAt || '',
	updatedAt: record?.updatedAt || record?.createdAt || '',
})

const buildAuditMarkup = record => {
	const authUtils = window.AppUtils?.auth
	const createdByLabel = authUtils?.getAuditActorLabel?.(record?.createdBy) || 'Nieznany'
	const updatedByLabel = authUtils?.getAuditActorLabel?.(record?.updatedBy || record?.createdBy) || createdByLabel
	const createdAtLabel = formatDate(record?.createdAt)
	const updatedAtLabel = formatDate(record?.updatedAt)
	const createdLine = createdAtLabel ? `${createdByLabel} · ${createdAtLabel}` : createdByLabel
	const updatedLine = updatedAtLabel ? `${updatedByLabel} · ${updatedAtLabel}` : updatedByLabel
	const shouldShowUpdate = Boolean(record?.updatedBy || record?.updatedAt) && updatedLine !== createdLine

	return `
		<div class="record-audit">
			<span class="record-audit-line"><strong>Dodal:</strong> ${createdLine}</span>
			${shouldShowUpdate ? `<span class="record-audit-line"><strong>Edytowal:</strong> ${updatedLine}</span>` : ''}
		</div>
	`
}
/* === Shared Audit Helpers: End === */

/* === Shared Search Controller: Start === */
const createSearchController = ({ panel, workspaceActions, toggleButton, input, onClear } = {}) => {
	const focusInput = ({ selectValue = false } = {}) => {
		if (!input) return

		window.setTimeout(() => {
			input.focus()

			if (selectValue && typeof input.select === 'function') {
				input.select()
			}
		}, 40)
	}

	const setOpen = isOpen => {
		if (!panel) return

		panel.hidden = !isOpen
		workspaceActions?.classList.toggle('is-search-open', isOpen)
		toggleButton?.setAttribute('aria-expanded', String(isOpen))

		if (isOpen) {
			focusInput()
		}
	}

	const open = ({ selectValue = false } = {}) => {
		setOpen(true)
		focusInput({ selectValue })
	}

	const close = ({ clearValue = true } = {}) => {
		if (clearValue) {
			if (input) {
				input.value = ''
			}

			onClear?.()
		}

		setOpen(false)
	}

	const toggle = () => {
		if (Boolean(panel) && !panel.hidden) {
			close()
			return
		}

		open({ selectValue: true })
	}

	window.addEventListener('keydown', event => {
		const isFindShortcut =
			(event.ctrlKey || event.metaKey) &&
			!event.altKey &&
			!event.shiftKey &&
			String(event.key || '').toLowerCase() === 'f'

		if (!isFindShortcut || !panel || !input || event.defaultPrevented) return

		event.preventDefault()
		event.stopPropagation()
		open({ selectValue: true })
	})

	return {
		setOpen,
		open,
		close,
		toggle,
		isOpen: () => Boolean(panel) && !panel.hidden,
	}
}
/* === Shared Search Controller: End === */

/* === Shared Confirm Dialog: Start === */
const appConfirmState = {
	shell: null,
	title: null,
	message: null,
	confirmBtn: null,
	cancelBtn: null,
	resolver: null,
}

const closeConfirmDialog = (result = false) => {
	if (!appConfirmState.shell || !appConfirmState.resolver) return false

	const resolve = appConfirmState.resolver
	appConfirmState.resolver = null

	appConfirmState.shell.classList.remove('is-open')
	appConfirmState.shell.setAttribute('aria-hidden', 'true')
	document.body.classList.remove('app-confirm-open')
	resolve(result)
	return true
}

const ensureConfirmDialog = () => {
	if (appConfirmState.shell || !document.body) return appConfirmState

	const shell = document.createElement('div')
	shell.className = 'app-confirm-shell'
	shell.setAttribute('aria-hidden', 'true')
	shell.innerHTML = `
		<div class="app-confirm-backdrop"></div>
		<div class="app-confirm-card" role="alertdialog" aria-modal="true" aria-labelledby="app-confirm-title" aria-describedby="app-confirm-message">
			<p class="app-confirm-kicker">Potwierdzenie</p>
			<h2 id="app-confirm-title">Wykonac akcje?</h2>
			<p id="app-confirm-message" class="app-confirm-message">Czy na pewno chcesz kontynuowac?</p>
			<div class="app-confirm-actions">
				<button type="button" class="app-confirm-btn app-confirm-btn-secondary" data-confirm-action="cancel">NIE</button>
				<button type="button" class="app-confirm-btn app-confirm-btn-primary" data-confirm-action="confirm">TAK</button>
			</div>
		</div>
	`

	document.body.appendChild(shell)

	appConfirmState.shell = shell
	appConfirmState.title = shell.querySelector('#app-confirm-title')
	appConfirmState.message = shell.querySelector('#app-confirm-message')
	appConfirmState.confirmBtn = shell.querySelector('[data-confirm-action="confirm"]')
	appConfirmState.cancelBtn = shell.querySelector('[data-confirm-action="cancel"]')

	shell.querySelector('.app-confirm-backdrop')?.addEventListener('click', () => closeConfirmDialog(false))
	appConfirmState.cancelBtn?.addEventListener('click', () => closeConfirmDialog(false))
	appConfirmState.confirmBtn?.addEventListener('click', () => closeConfirmDialog(true))

	window.addEventListener('keydown', event => {
		if (!appConfirmState.shell?.classList.contains('is-open')) return

		if (event.key === 'Escape') {
			event.preventDefault()
			closeConfirmDialog(false)
			return
		}

		if (event.key === 'Enter' && !event.shiftKey && !event.altKey && !event.ctrlKey && !event.metaKey && !event.isComposing) {
			event.preventDefault()
			closeConfirmDialog(true)
		}
	})

	return appConfirmState
}

const confirmDialog = ({
	title = 'Wykonac akcje?',
	message = 'Czy na pewno chcesz kontynuowac?',
	confirmLabel = 'TAK',
	cancelLabel = 'NIE',
} = {}) => {
	if (typeof document === 'undefined' || !document.body) {
		return Promise.resolve(confirm(message))
	}

	const dialog = ensureConfirmDialog()
	if (!dialog.shell || !dialog.title || !dialog.message || !dialog.confirmBtn || !dialog.cancelBtn) {
		return Promise.resolve(confirm(message))
	}

	if (dialog.resolver) {
		closeConfirmDialog(false)
	}

	dialog.title.textContent = title
	dialog.message.textContent = message
	dialog.confirmBtn.textContent = confirmLabel
	dialog.cancelBtn.textContent = cancelLabel

	dialog.shell.classList.add('is-open')
	dialog.shell.setAttribute('aria-hidden', 'false')
	document.body.classList.add('app-confirm-open')

	window.setTimeout(() => dialog.confirmBtn?.focus(), 50)

	return new Promise(resolve => {
		dialog.resolver = resolve
	})
}
/* === Shared Confirm Dialog: End === */
