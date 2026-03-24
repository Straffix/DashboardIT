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
		USERS: 'dashboard_users',
		SESSION: 'dashboard_user_session',
		BOOKMARKS: 'dashboard_user_bookmarks',
		LUNCH: 'dashboard_lunch_reservations',
		NOTES: 'dashboard_notes_entries',
		ANNOUNCEMENTS: 'dashboard_notes_announcements',
		TASKS: 'dashboard_notes_tasks',
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
		popover.style.visibility = 'hidden'

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
			<h2 id="app-confirm-title">Wykonać akcję?</h2>
			<p id="app-confirm-message" class="app-confirm-message">Czy na pewno chcesz kontynuować?</p>
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
		if (event.key === 'Escape' && appConfirmState.shell?.classList.contains('is-open')) {
			event.preventDefault()
			closeConfirmDialog(false)
		}
	})

	return appConfirmState
}

const confirmDialog = ({
	title = 'Wykonać akcję?',
	message = 'Czy na pewno chcesz kontynuować?',
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

	window.setTimeout(() => dialog.cancelBtn?.focus(), 50)

	return new Promise(resolve => {
		dialog.resolver = resolve
	})
}
/* === Shared Confirm Dialog: End === */

/* === Shared Auth And Session: Start === */
const AUTH_CONFIG = {
	minPasswordLength: 4,
	maxAvatarUploadSizeBytes: 10 * 1024 * 1024,
	avatarOutputSize: 192,
	avatarOutputQuality: 0.9,
	avatarPresets: [
		{ id: 'violet', label: 'Fiolet', gradient: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' },
		{ id: 'blue', label: 'Niebieski', gradient: 'linear-gradient(135deg, #2563eb 0%, #38bdf8 100%)' },
		{ id: 'emerald', label: 'Zielony', gradient: 'linear-gradient(135deg, #10b981 0%, #22c55e 100%)' },
		{ id: 'amber', label: 'Pomaranczowy', gradient: 'linear-gradient(135deg, #f59e0b 0%, #fb7185 100%)' },
		{ id: 'rose', label: 'Rozowy', gradient: 'linear-gradient(135deg, #ec4899 0%, #f97316 100%)' },
		{ id: 'slate', label: 'Grafit', gradient: 'linear-gradient(135deg, #334155 0%, #64748b 100%)' },
	],
}

const authState = {
	users: [],
	session: null,
	currentUser: null,
	hub: null,
	trigger: null,
	popover: null,
	popoverIdentity: null,
	popoverMeta: null,
	popoverActions: null,
	authModal: null,
	authTitle: null,
	authForm: null,
	authSwitchBtn: null,
	authFullNameInput: null,
	authLoginInput: null,
	authPasswordInput: null,
	authPasswordRepeatInput: null,
	authRoleHint: null,
	authAvatarGrid: null,
	authAvatarPreview: null,
	authAvatarUploadInput: null,
	authAvatarBrowseBtn: null,
	authAvatarResetBtn: null,
	authSubmitBtn: null,
	profileModal: null,
	profileForm: null,
	profileNameInput: null,
	profileLoginInput: null,
	profileRoleBadge: null,
	profileAvatarGrid: null,
	profileAvatarPreview: null,
	profileAvatarUploadInput: null,
	profileAvatarBrowseBtn: null,
	profileAvatarResetBtn: null,
	profileLogoutBtn: null,
	mode: 'login',
	selectedRegisterAvatarId: AUTH_CONFIG.avatarPresets[0].id,
	selectedProfileAvatarId: AUTH_CONFIG.avatarPresets[0].id,
	customRegisterAvatarImage: '',
	customProfileAvatarImage: '',
}

const systemUiState = {
	toastStack: null,
	pageStatusStrip: null,
	pageStatusIdentity: null,
	pageStatusText: null,
	pageStatusTags: null,
	pageStatusActions: null,
}

const cloneValue = value => JSON.parse(JSON.stringify(value))
const appServices = (window.AppServices = window.AppServices || {})
const storageService = appServices.storageService
const usersService = appServices.usersService
const sessionService = appServices.sessionService
const hiresService = appServices.hiresService
const monitorService = appServices.monitorService
const exchangesService = appServices.exchangesService
const bookmarksService = appServices.bookmarksService
const preferencesService = appServices.preferencesService

const getAvatarPreset = avatarId => AUTH_CONFIG.avatarPresets.find(preset => preset.id === avatarId) || AUTH_CONFIG.avatarPresets[0]

const normalizeAvatarImage = value => {
	const normalizedValue = String(value || '').trim()
	return /^data:image\//i.test(normalizedValue) ? normalizedValue : ''
}

const getInitials = fullName => {
	const words = String(fullName || '')
		.trim()
		.split(/\s+/)
		.filter(Boolean)
		.slice(0, 2)

	if (words.length === 0) return 'IT'
	return words.map(word => word[0]).join('').toUpperCase()
}

const normalizeUserLogin = value =>
	String(value || '')
		.toLowerCase()
		.trim()
		.replace(/\s+/g, '')
		.replace(/[^a-z0-9._-]/g, '')

const encodeLocalPassword = password => {
	try {
		return btoa(unescape(encodeURIComponent(String(password || ''))))
	} catch (error) {
		return String(password || '')
	}
}

const mapStoredUser = user => ({
	id: user.id,
	fullName: String(user.fullName || '').trim(),
	login: normalizeUserLogin(user.login),
	passwordHash: String(user.passwordHash || ''),
	role: user.role === 'admin' ? 'admin' : 'user',
	avatarId: getAvatarPreset(user.avatarId).id,
	avatarImage: normalizeAvatarImage(user.avatarImage),
	createdAt: user.createdAt || new Date().toISOString(),
	updatedAt: user.updatedAt || user.createdAt || new Date().toISOString(),
})

const sanitizeUser = user => {
	if (!user) return null

	return {
		id: user.id,
		fullName: user.fullName,
		login: user.login,
		role: user.role,
		avatarId: user.avatarId,
		avatarImage: normalizeAvatarImage(user.avatarImage),
		createdAt: user.createdAt,
		updatedAt: user.updatedAt,
	}
}

const loadUsers = () => {
	return (usersService?.getAll?.() || []).map(mapStoredUser)
}

const saveUsers = users => {
	authState.users = users.map(mapStoredUser)
	usersService?.saveAll?.(authState.users)
}

const loadSession = () => {
	return sessionService?.getCurrent?.() || null
}

const saveSession = session => {
	authState.session = session ? cloneValue(session) : null

	if (!session) {
		sessionService?.clear?.()
		return
	}

	sessionService?.save?.(authState.session)
}

const findUserByLogin = login => authState.users.find(user => user.login === normalizeUserLogin(login))

const renderAuthUi = () => {
	if (!authState.trigger || !authState.popoverIdentity || !authState.popoverMeta || !authState.popoverActions) return

	const currentUser = authState.currentUser
	const identityLabel = currentUser ? currentUser.fullName : 'Gosc'
	const metaLabel = currentUser
		? `${currentUser.role === 'admin' ? 'Administrator' : 'Uzytkownik'} · @${currentUser.login}`
		: 'Nie zalogowano'

	authState.trigger.innerHTML = `
		${createAvatarMarkup({
			fullName: currentUser?.fullName || 'Gosc systemu',
			avatarId: currentUser?.avatarId || AUTH_CONFIG.avatarPresets[0].id,
			avatarImage: currentUser?.avatarImage || '',
			extraClass: 'app-user-avatar-lg',
		})}
		<span class="app-user-trigger-copy">
			<strong>${identityLabel}</strong>
			<small>${metaLabel}</small>
		</span>
		<i class="fa-solid fa-chevron-down" aria-hidden="true"></i>
	`

	authState.popoverIdentity.innerHTML = `
		${createAvatarMarkup({
			fullName: currentUser?.fullName || 'Gosc systemu',
			avatarId: currentUser?.avatarId || AUTH_CONFIG.avatarPresets[0].id,
			avatarImage: currentUser?.avatarImage || '',
		})}
		<div class="app-user-popover-copy">
			<strong>${identityLabel}</strong>
			<span>${metaLabel}</span>
		</div>
	`

	authState.popoverMeta.textContent = currentUser
		? 'Konto lokalne aktywne w tej przegladarce.'
		: authState.users.length === 0
			? 'Zaloz pierwsze konto. Otrzyma ono role administratora.'
			: 'Zaloguj sie lub zaloz nowe konto lokalne.'

	authState.popoverActions.innerHTML = currentUser
		? `
			<button type="button" class="app-user-action-btn" data-user-action="profile">
				<i class="fa-solid fa-user-gear"></i>
				<span>Profil i avatar</span>
			</button>
			<button type="button" class="app-user-action-btn" data-user-action="logout">
				<i class="fa-solid fa-arrow-right-from-bracket"></i>
				<span>Wyloguj</span>
			</button>
		`
		: `
			<button type="button" class="app-user-action-btn" data-user-action="login">
				<i class="fa-solid fa-right-to-bracket"></i>
				<span>Zaloguj sie</span>
			</button>
			<button type="button" class="app-user-action-btn" data-user-action="register">
				<i class="fa-solid fa-user-plus"></i>
				<span>Zaloz konto</span>
			</button>
		`

	renderPageStatusStrip()
}

const setCurrentUser = user => {
	authState.currentUser = user ? sanitizeUser(user) : null
	document.body.classList.toggle('app-user-logged-in', Boolean(authState.currentUser))
	renderAuthUi()

	document.dispatchEvent(
		new CustomEvent('app-auth-changed', {
			detail: {
				user: sanitizeUser(authState.currentUser),
			},
		})
	)
}

const syncCurrentUserFromSession = () => {
	authState.users = loadUsers()
	authState.session = loadSession()

	if (!authState.session) {
		setCurrentUser(null)
		return null
	}

	const matchedUser = authState.users.find(user => user.id === authState.session.userId)
	if (!matchedUser) {
		saveSession(null)
		setCurrentUser(null)
		return null
	}

	setCurrentUser(matchedUser)
	return authState.currentUser
}

const registerUser = ({ fullName, login, password, avatarId, avatarImage }) => {
	const normalizedName = String(fullName || '').trim()
	const normalizedLogin = normalizeUserLogin(login)
	const normalizedPassword = String(password || '')

	if (!normalizedName) {
		throw new Error('Wpisz imie i nazwisko.')
	}

	if (!normalizedLogin) {
		throw new Error('Wpisz poprawny login.')
	}

	if (normalizedPassword.length < AUTH_CONFIG.minPasswordLength) {
		throw new Error(`Haslo musi miec co najmniej ${AUTH_CONFIG.minPasswordLength} znaki.`)
	}

	if (findUserByLogin(normalizedLogin)) {
		throw new Error('Taki login juz istnieje.')
	}

	const now = new Date().toISOString()
	const nextUser = {
		id: `user-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
		fullName: normalizedName,
		login: normalizedLogin,
		passwordHash: encodeLocalPassword(normalizedPassword),
		role: authState.users.length === 0 ? 'admin' : 'user',
		avatarId: getAvatarPreset(avatarId).id,
		avatarImage: normalizeAvatarImage(avatarImage),
		createdAt: now,
		updatedAt: now,
	}

	saveUsers([...authState.users, nextUser])
	saveSession({ userId: nextUser.id, loginAt: now })
	setCurrentUser(nextUser)
	return sanitizeUser(nextUser)
}

const loginUser = ({ login, password }) => {
	const matchedUser = findUserByLogin(login)
	if (!matchedUser || matchedUser.passwordHash !== encodeLocalPassword(password)) {
		throw new Error('Nieprawidlowy login lub haslo.')
	}

	const now = new Date().toISOString()
	saveSession({ userId: matchedUser.id, loginAt: now })
	setCurrentUser(matchedUser)
	return sanitizeUser(matchedUser)
}

const logoutUser = ({ silent = false } = {}) => {
	saveSession(null)
	setCurrentUser(null)

	if (!silent) {
		notify({
			type: 'info',
			title: 'Wylogowano',
			message: 'Sesja lokalna zostala zamknieta dla tej przegladarki.',
		})
	}
}

const updateCurrentUserProfile = ({ fullName, login, avatarId, avatarImage }) => {
	if (!authState.currentUser) {
		throw new Error('Brak zalogowanego uzytkownika.')
	}

	const normalizedName = String(fullName || '').trim()
	const normalizedLogin = normalizeUserLogin(login)

	if (!normalizedName) {
		throw new Error('Imie i nazwisko nie moze byc puste.')
	}

	if (!normalizedLogin) {
		throw new Error('Login nie moze byc pusty.')
	}

	const duplicatedUser = authState.users.find(
		user => user.id !== authState.currentUser.id && user.login === normalizedLogin
	)

	if (duplicatedUser) {
		throw new Error('Ten login jest juz zajety.')
	}

	const now = new Date().toISOString()
	const updatedUsers = authState.users.map(user =>
		user.id === authState.currentUser.id
			? {
					...user,
					fullName: normalizedName,
					login: normalizedLogin,
					avatarId: getAvatarPreset(avatarId).id,
					avatarImage: normalizeAvatarImage(avatarImage),
					updatedAt: now,
			  }
			: user
	)

	saveUsers(updatedUsers)
	const nextCurrentUser = updatedUsers.find(user => user.id === authState.currentUser.id)
	setCurrentUser(nextCurrentUser)
	return sanitizeUser(nextCurrentUser)
}

const createAvatarMarkup = ({ fullName, avatarId, avatarImage, extraClass = '' } = {}) => {
	const preset = getAvatarPreset(avatarId)
	const classes = ['app-user-avatar', extraClass].filter(Boolean).join(' ')
	const normalizedAvatarImage = normalizeAvatarImage(avatarImage)
	if (normalizedAvatarImage) {
		const avatarStyle = [
			`--app-avatar-gradient: ${preset.gradient}`,
			`background-image: url('${escapeHtml(normalizedAvatarImage)}')`,
			'background-size: cover',
			'background-position: center',
			'background-repeat: no-repeat',
		].join('; ')

		return `<span class="${classes} is-image" style="${avatarStyle}" role="img" aria-label="${escapeHtml(fullName || 'Avatar uzytkownika')}"></span>`
	}

	return `<span class="${classes}" style="--app-avatar-gradient: ${preset.gradient}">${getInitials(fullName)}</span>`
}

const getToastTitle = type => {
	if (type === 'success') return 'Gotowe'
	if (type === 'warning') return 'Uwaga'
	if (type === 'error') return 'Blad'
	return 'Informacja'
}

const ensureToastStack = () => {
	if (systemUiState.toastStack || !document.body) return systemUiState.toastStack

	const stack = document.createElement('div')
	stack.className = 'app-toast-stack'
	stack.setAttribute('aria-live', 'polite')
	stack.setAttribute('aria-atomic', 'false')
	document.body.appendChild(stack)
	systemUiState.toastStack = stack
	return stack
}

const dismissToast = toast => {
	if (!toast || toast.dataset.leaving === 'true') return

	toast.dataset.leaving = 'true'
	toast.classList.add('is-leaving')
	window.setTimeout(() => {
		toast.remove()
	}, 180)
}

const notify = ({ message = '', title = '', type = 'info', duration = 4200 } = {}) => {
	const normalizedMessage = String(message || '').trim()
	if (!normalizedMessage) return null

	const stack = ensureToastStack()
	if (!stack) return null

	const iconMap = {
		success: 'fa-circle-check',
		warning: 'fa-triangle-exclamation',
		error: 'fa-circle-xmark',
		info: 'fa-circle-info',
	}

	const toast = document.createElement('article')
	toast.className = `app-toast is-${type}`
	toast.innerHTML = `
		<div class="app-toast-icon" aria-hidden="true">
			<i class="fa-solid ${iconMap[type] || iconMap.info}"></i>
		</div>
		<div class="app-toast-copy">
			<strong>${title || getToastTitle(type)}</strong>
			<span>${normalizedMessage}</span>
		</div>
		<button type="button" class="app-toast-close" aria-label="Zamknij komunikat">
			<i class="fa-solid fa-xmark"></i>
		</button>
	`

	const closeButton = toast.querySelector('.app-toast-close')
	closeButton?.addEventListener('click', () => dismissToast(toast))
	stack.appendChild(toast)

	if (duration > 0) {
		window.setTimeout(() => {
			dismissToast(toast)
		}, duration)
	}

	return toast
}

const getCurrentModuleLabel = () => {
	const pageHeading = document.querySelector('.logo-section h1')?.textContent?.trim()
	if (pageHeading) return pageHeading

	const title = document.title || ''
	return title.split('-')[0].trim() || 'DashboardIT'
}

const renderPageStatusStrip = () => {
	if (
		!systemUiState.pageStatusStrip ||
		!systemUiState.pageStatusIdentity ||
		!systemUiState.pageStatusText ||
		!systemUiState.pageStatusTags ||
		!systemUiState.pageStatusActions
	) {
		return
	}

	const currentUser = authState.currentUser
	const moduleLabel = getCurrentModuleLabel()
	const identityLabel = currentUser ? currentUser.fullName : 'Gosc systemu'
	const metaLabel = currentUser
		? `${currentUser.role === 'admin' ? 'Administrator' : 'Uzytkownik'} · @${currentUser.login}`
		: 'Tryb podgladu bez lokalnej sesji'

	systemUiState.pageStatusIdentity.innerHTML = `
		${createAvatarMarkup({
			fullName: currentUser?.fullName || 'Gosc systemu',
			avatarId: currentUser?.avatarId || AUTH_CONFIG.avatarPresets[0].id,
			avatarImage: currentUser?.avatarImage || '',
			extraClass: 'app-page-status-avatar',
		})}
		<div class="app-page-status-copy">
			<strong>${identityLabel}</strong>
			<span>${metaLabel}</span>
		</div>
	`

	systemUiState.pageStatusText.textContent = currentUser
		? `Pracujesz w module ${moduleLabel}. Konto lokalne jest aktywne w tej przegladarce i gotowe do dalszej pracy.`
		: `Przegladasz modul ${moduleLabel} jako gosc. Zaloguj sie, aby korzystac z funkcji zapisujacych dane i historii zmian.`

	systemUiState.pageStatusTags.innerHTML = `
		<span class="app-page-status-tag ${currentUser?.role === 'admin' ? 'is-admin' : 'is-neutral'}">
			${currentUser ? (currentUser.role === 'admin' ? 'Rola admin' : 'Rola user') : 'Gosc'}
		</span>
		<span class="app-page-status-tag is-demo">Demo localStorage</span>
		<span class="app-page-status-tag is-neutral">Frontend ready for API</span>
	`

	systemUiState.pageStatusActions.innerHTML = currentUser
		? `
			<button type="button" class="app-page-status-btn" data-user-action="profile">
				<i class="fa-solid fa-user-gear"></i>
				<span>Profil i avatar</span>
			</button>
			<button type="button" class="app-page-status-btn is-secondary" data-user-action="logout">
				<i class="fa-solid fa-arrow-right-from-bracket"></i>
				<span>Wyloguj</span>
			</button>
		`
		: `
			<button type="button" class="app-page-status-btn" data-user-action="login">
				<i class="fa-solid fa-right-to-bracket"></i>
				<span>Zaloguj sie</span>
			</button>
			<button type="button" class="app-page-status-btn is-secondary" data-user-action="register">
				<i class="fa-solid fa-user-plus"></i>
				<span>Zaloz konto</span>
			</button>
		`
}

const handleUserAction = action => {
	closeUserPopover()

	if (action === 'login') openAuthModal('login')
	if (action === 'register') openAuthModal('register')
	if (action === 'profile') openProfileModal()
	if (action === 'logout') logoutUser()
}

const ensurePageStatusStrip = () => {
	document.querySelectorAll('.app-page-status-strip').forEach(strip => strip.remove())
	systemUiState.pageStatusStrip = null
	systemUiState.pageStatusIdentity = null
	systemUiState.pageStatusText = null
	systemUiState.pageStatusTags = null
	systemUiState.pageStatusActions = null
	return null
}

const closeUserPopover = () => {
	if (!authState.hub || !authState.popover) return

	authState.hub.classList.remove('is-open')
	authState.trigger?.setAttribute('aria-expanded', 'false')
	authState.popover.hidden = true
}

const openUserPopover = () => {
	if (!authState.hub || !authState.popover) return

	renderAuthUi()
	authState.hub.classList.add('is-open')
	authState.trigger?.setAttribute('aria-expanded', 'true')
	authState.popover.hidden = false
}

const toggleUserPopover = () => {
	if (authState.popover?.hidden) {
		openUserPopover()
		return
	}

	closeUserPopover()
}

const closeModal = modal => {
	if (!modal) return
	modal.hidden = true
	modal.setAttribute('aria-hidden', 'true')
	document.body.classList.remove('app-auth-open')
}

const openModal = modal => {
	if (!modal) return
	modal.hidden = false
	modal.setAttribute('aria-hidden', 'false')
	document.body.classList.add('app-auth-open')
}

const renderAvatarChoices = (container, selectedId) => {
	if (!container) return

	container.innerHTML = AUTH_CONFIG.avatarPresets
		.map(
			preset => `
				<button
					type="button"
					class="app-avatar-choice ${preset.id === selectedId ? 'is-selected' : ''}"
					data-avatar-id="${preset.id}"
					aria-pressed="${String(preset.id === selectedId)}"
					title="${preset.label}">
					<span class="app-avatar-choice-fill" style="--app-avatar-gradient: ${preset.gradient}"></span>
				</button>
			`
		)
		.join('')
}

const renderAvatarUploadPreview = (container, { fullName, avatarId, avatarImage, helperText } = {}) => {
	if (!container) return

	const hasCustomAvatar = Boolean(normalizeAvatarImage(avatarImage))
	container.innerHTML = `
		${createAvatarMarkup({
			fullName: fullName || 'Uzytkownik',
			avatarId,
			avatarImage,
			extraClass: 'app-user-avatar-xl',
		})}
		<div class="app-avatar-upload-copy">
			<strong>${hasCustomAvatar ? 'Wlasny avatar aktywny' : 'Avatar z palety kolorow'}</strong>
			<span>${helperText || (hasCustomAvatar ? 'Zdjecie zostanie zapisane lokalnie dla tego konta.' : 'Mozesz zostac przy kolorowym avatarze albo wgrac swoje zdjecie.')}</span>
		</div>
	`
}

const renderRegisterAvatarEditor = () => {
	renderAvatarChoices(authState.authAvatarGrid, authState.selectedRegisterAvatarId)
	renderAvatarUploadPreview(authState.authAvatarPreview, {
		fullName: authState.authFullNameInput?.value || authState.authLoginInput?.value || 'Nowy uzytkownik',
		avatarId: authState.selectedRegisterAvatarId,
		avatarImage: authState.customRegisterAvatarImage,
	})

	if (authState.authAvatarResetBtn) {
		authState.authAvatarResetBtn.hidden = !authState.customRegisterAvatarImage
	}
}

const renderProfileAvatarEditor = () => {
	renderAvatarChoices(authState.profileAvatarGrid, authState.selectedProfileAvatarId)
	renderAvatarUploadPreview(authState.profileAvatarPreview, {
		fullName: authState.profileNameInput?.value || authState.profileLoginInput?.value || authState.currentUser?.fullName || 'Uzytkownik',
		avatarId: authState.selectedProfileAvatarId,
		avatarImage: authState.customProfileAvatarImage,
	})

	if (authState.profileAvatarResetBtn) {
		authState.profileAvatarResetBtn.hidden = !authState.customProfileAvatarImage
	}
}

const resetRegisterAvatarEditor = () => {
	authState.selectedRegisterAvatarId = AUTH_CONFIG.avatarPresets[0].id
	authState.customRegisterAvatarImage = ''
	if (authState.authAvatarUploadInput) {
		authState.authAvatarUploadInput.value = ''
	}
	renderRegisterAvatarEditor()
}

const clearCustomAvatar = scope => {
	if (scope === 'profile') {
		authState.customProfileAvatarImage = ''
		if (authState.profileAvatarUploadInput) {
			authState.profileAvatarUploadInput.value = ''
		}
		renderProfileAvatarEditor()
		return
	}

	authState.customRegisterAvatarImage = ''
	if (authState.authAvatarUploadInput) {
		authState.authAvatarUploadInput.value = ''
	}
	renderRegisterAvatarEditor()
}

const buildAvatarImageFromFile = file =>
	new Promise((resolve, reject) => {
		if (!file) {
			reject(new Error('Nie wybrano pliku avatara.'))
			return
		}

		if (!String(file.type || '').startsWith('image/')) {
			reject(new Error('Avatar musi byc plikiem graficznym.'))
			return
		}

		if (Number(file.size || 0) > AUTH_CONFIG.maxAvatarUploadSizeBytes) {
			reject(new Error('Wybrany plik jest za duzy. Uzyj obrazu do 10 MB.'))
			return
		}

		const reader = new FileReader()
		reader.onerror = () => reject(new Error('Nie udalo sie odczytac pliku avatara.'))
		reader.onload = () => {
			const image = new Image()
			image.onerror = () => reject(new Error('Nie udalo sie przetworzyc obrazu avatara.'))
			image.onload = () => {
				const cropSize = Math.max(1, Math.min(image.width, image.height))
				const cropOffsetX = Math.max(0, Math.floor((image.width - cropSize) / 2))
				const cropOffsetY = Math.max(0, Math.floor((image.height - cropSize) / 2))
				const canvas = document.createElement('canvas')
				const targetSize = AUTH_CONFIG.avatarOutputSize

				canvas.width = targetSize
				canvas.height = targetSize

				const context = canvas.getContext('2d')
				if (!context) {
					reject(new Error('Przegladarka nie pozwala przygotowac avatara.'))
					return
				}

				context.drawImage(
					image,
					cropOffsetX,
					cropOffsetY,
					cropSize,
					cropSize,
					0,
					0,
					targetSize,
					targetSize
				)

				try {
					resolve(canvas.toDataURL('image/jpeg', AUTH_CONFIG.avatarOutputQuality))
				} catch (error) {
					reject(new Error('Nie udalo sie zapisac przygotowanego avatara.'))
				}
			}

			image.src = String(reader.result || '')
		}

		reader.readAsDataURL(file)
	})

const handleAvatarFileSelection = async (scope, file) => {
	const avatarImage = await buildAvatarImageFromFile(file)
	if (scope === 'profile') {
		authState.customProfileAvatarImage = avatarImage
		renderProfileAvatarEditor()
		return
	}

	authState.customRegisterAvatarImage = avatarImage
	renderRegisterAvatarEditor()
}

const updateAuthMode = mode => {
	authState.mode = mode === 'register' ? 'register' : 'login'
	if (!authState.authModal || !authState.authForm) return

	const isRegister = authState.mode === 'register'
	authState.authModal.dataset.mode = authState.mode

	if (authState.authTitle) {
		authState.authTitle.textContent = isRegister ? 'Zaloz konto lokalne' : 'Zaloguj sie do systemu'
	}

	if (authState.authSwitchBtn) {
		authState.authSwitchBtn.textContent = isRegister ? 'Masz konto? Zaloguj sie' : 'Nie masz konta? Zarejestruj sie'
	}

	if (authState.authSubmitBtn) {
		authState.authSubmitBtn.textContent = isRegister ? 'Utworz konto' : 'Zaloguj sie'
	}

	authState.authFullNameInput?.closest('.app-auth-field')?.classList.toggle('is-hidden', !isRegister)
	authState.authPasswordRepeatInput?.closest('.app-auth-field')?.classList.toggle('is-hidden', !isRegister)
	authState.authRoleHint?.classList.toggle('is-hidden', !isRegister)
	authState.authAvatarGrid?.closest('.app-auth-field')?.classList.toggle('is-hidden', !isRegister)
	authState.authAvatarPreview?.closest('.app-auth-field')?.classList.toggle('is-hidden', !isRegister)
}

const openAuthModal = mode => {
	updateAuthMode(mode)
	openModal(authState.authModal)

	window.setTimeout(() => {
		if (authState.mode === 'register') {
			authState.authFullNameInput?.focus()
			return
		}

		authState.authLoginInput?.focus()
	}, 40)
}

const populateProfileForm = () => {
	if (!authState.currentUser || !authState.profileForm) return

	authState.selectedProfileAvatarId = authState.currentUser.avatarId
	authState.customProfileAvatarImage = normalizeAvatarImage(authState.currentUser.avatarImage)
	if (authState.profileNameInput) authState.profileNameInput.value = authState.currentUser.fullName || ''
	if (authState.profileLoginInput) authState.profileLoginInput.value = authState.currentUser.login || ''
	if (authState.profileRoleBadge) {
		authState.profileRoleBadge.textContent = authState.currentUser.role === 'admin' ? 'Administrator' : 'Uzytkownik'
		authState.profileRoleBadge.classList.toggle('is-admin', authState.currentUser.role === 'admin')
	}

	renderProfileAvatarEditor()
}

const openProfileModal = () => {
	if (!authState.currentUser) {
		openAuthModal('login')
		return
	}

	populateProfileForm()
	openModal(authState.profileModal)
	window.setTimeout(() => authState.profileNameInput?.focus(), 40)
}

const ensureAuthUi = () => {
	if (authState.hub || !document.body) return authState

	const hub = document.createElement('div')
	hub.className = 'app-user-hub'
	hub.innerHTML = `
		<button type="button" class="app-user-trigger" aria-label="Otworz panel uzytkownika" aria-expanded="false"></button>
		<div class="app-user-popover" hidden>
			<div class="app-user-popover-identity"></div>
			<p class="app-user-popover-meta"></p>
			<div class="app-user-popover-actions"></div>
		</div>
	`

	const authModal = document.createElement('div')
	authModal.className = 'app-auth-modal-shell'
	authModal.hidden = true
	authModal.setAttribute('aria-hidden', 'true')
	authModal.innerHTML = `
		<div class="app-auth-modal-backdrop" data-auth-close></div>
		<section class="app-auth-card" role="dialog" aria-modal="true" aria-labelledby="app-auth-title">
			<button type="button" class="app-auth-close" data-auth-close aria-label="Zamknij panel logowania">
				<i class="fa-solid fa-xmark"></i>
			</button>
			<p class="app-auth-kicker">Panel uzytkownika</p>
			<h2 id="app-auth-title">Zaloguj sie do systemu</h2>
			<p class="app-auth-copy">Konta sa lokalne dla tej przegladarki. Pozniej warstwa danych moze zostac podlaczona do backendu.</p>
			<form class="app-auth-form" novalidate>
				<label class="app-auth-field is-hidden">
					<span>Imie i nazwisko</span>
					<input type="text" id="app-auth-full-name" placeholder="Np. Jan Kowalski" autocomplete="name">
				</label>
				<label class="app-auth-field">
					<span>Login</span>
					<input type="text" id="app-auth-login" placeholder="Np. jkowalski" autocomplete="username" required>
				</label>
				<label class="app-auth-field">
					<span>Haslo</span>
					<input type="password" id="app-auth-password" placeholder="Minimum 4 znaki" autocomplete="current-password" required>
				</label>
				<label class="app-auth-field is-hidden">
					<span>Powtorz haslo</span>
					<input type="password" id="app-auth-password-repeat" placeholder="Powtorz haslo" autocomplete="new-password">
				</label>
				<div class="app-auth-field is-hidden">
					<span>Wybierz styl avatara</span>
					<div class="app-avatar-choice-grid" id="app-auth-avatar-grid"></div>
				</div>
				<div class="app-auth-field is-hidden">
					<span>Wlasny avatar</span>
					<div class="app-avatar-upload">
						<div class="app-avatar-upload-preview" id="app-auth-avatar-preview"></div>
						<div class="app-avatar-upload-actions">
							<input type="file" id="app-auth-avatar-upload" accept="image/*" hidden>
							<div class="app-avatar-upload-btn-row">
								<button type="button" class="app-avatar-upload-btn" id="app-auth-avatar-browse-btn">Przegladaj</button>
								<button type="button" class="app-avatar-upload-btn" id="app-auth-avatar-reset-btn" hidden>Usun avatar</button>
							</div>
							<small>PNG, JPG lub WebP. Zdjecie zostanie przyciete do kwadratu i zapisane lokalnie.</small>
						</div>
					</div>
				</div>
				<p class="app-auth-role-hint is-hidden" id="app-auth-role-hint">Pierwsze zalozone konto otrzyma role administratora.</p>
				<div class="app-auth-actions">
					<button type="submit" class="app-auth-submit">Zaloguj sie</button>
					<button type="button" class="app-auth-switch">Nie masz konta? Zarejestruj sie</button>
				</div>
			</form>
		</section>
	`

	const profileModal = document.createElement('div')
	profileModal.className = 'app-auth-modal-shell'
	profileModal.hidden = true
	profileModal.setAttribute('aria-hidden', 'true')
	profileModal.innerHTML = `
		<div class="app-auth-modal-backdrop" data-profile-close></div>
		<section class="app-auth-card app-profile-card" role="dialog" aria-modal="true" aria-labelledby="app-profile-title">
			<button type="button" class="app-auth-close" data-profile-close aria-label="Zamknij profil">
				<i class="fa-solid fa-xmark"></i>
			</button>
			<p class="app-auth-kicker">Twoj profil</p>
			<h2 id="app-profile-title">Dane uzytkownika</h2>
			<p class="app-auth-copy">Tutaj mozesz zmienic nazwe, login i wyglad avatara. Rola jest informacyjna.</p>
			<form class="app-auth-form app-profile-form" novalidate>
				<div class="app-profile-role-row">
					<span>Rola</span>
					<strong class="app-role-badge" id="app-profile-role-badge">Uzytkownik</strong>
				</div>
				<label class="app-auth-field">
					<span>Imie i nazwisko</span>
					<input type="text" id="app-profile-name" placeholder="Np. Jan Kowalski" autocomplete="name" required>
				</label>
				<label class="app-auth-field">
					<span>Login</span>
					<input type="text" id="app-profile-login" placeholder="Np. jkowalski" autocomplete="username" required>
				</label>
				<div class="app-auth-field">
					<span>Avatar</span>
					<div class="app-avatar-choice-grid" id="app-profile-avatar-grid"></div>
				</div>
				<div class="app-auth-field">
					<span>Wlasny avatar</span>
					<div class="app-avatar-upload">
						<div class="app-avatar-upload-preview" id="app-profile-avatar-preview"></div>
						<div class="app-avatar-upload-actions">
							<input type="file" id="app-profile-avatar-upload" accept="image/*" hidden>
							<div class="app-avatar-upload-btn-row">
								<button type="button" class="app-avatar-upload-btn" id="app-profile-avatar-browse-btn">Przegladaj</button>
								<button type="button" class="app-avatar-upload-btn" id="app-profile-avatar-reset-btn" hidden>Usun avatar</button>
							</div>
							<small>PNG, JPG lub WebP. Zdjecie zostanie przyciete do kwadratu i zapisane lokalnie.</small>
						</div>
					</div>
				</div>
				<div class="app-auth-actions">
					<button type="submit" class="app-auth-submit">Zapisz zmiany</button>
					<button type="button" class="app-auth-switch app-auth-switch-danger" id="app-profile-logout-btn">Wyloguj</button>
				</div>
			</form>
		</section>
	`

	document.body.appendChild(hub)
	document.body.appendChild(authModal)
	document.body.appendChild(profileModal)

	authState.hub = hub
	authState.trigger = hub.querySelector('.app-user-trigger')
	authState.popover = hub.querySelector('.app-user-popover')
	authState.popoverIdentity = hub.querySelector('.app-user-popover-identity')
	authState.popoverMeta = hub.querySelector('.app-user-popover-meta')
	authState.popoverActions = hub.querySelector('.app-user-popover-actions')
	authState.authModal = authModal
	authState.authTitle = authModal.querySelector('#app-auth-title')
	authState.authForm = authModal.querySelector('.app-auth-form')
	authState.authSwitchBtn = authModal.querySelector('.app-auth-actions .app-auth-switch')
	authState.authFullNameInput = authModal.querySelector('#app-auth-full-name')
	authState.authLoginInput = authModal.querySelector('#app-auth-login')
	authState.authPasswordInput = authModal.querySelector('#app-auth-password')
	authState.authPasswordRepeatInput = authModal.querySelector('#app-auth-password-repeat')
	authState.authRoleHint = authModal.querySelector('#app-auth-role-hint')
	authState.authAvatarGrid = authModal.querySelector('#app-auth-avatar-grid')
	authState.authAvatarPreview = authModal.querySelector('#app-auth-avatar-preview')
	authState.authAvatarUploadInput = authModal.querySelector('#app-auth-avatar-upload')
	authState.authAvatarBrowseBtn = authModal.querySelector('#app-auth-avatar-browse-btn')
	authState.authAvatarResetBtn = authModal.querySelector('#app-auth-avatar-reset-btn')
	authState.authSubmitBtn = authModal.querySelector('.app-auth-submit')
	authState.profileModal = profileModal
	authState.profileForm = profileModal.querySelector('.app-profile-form')
	authState.profileNameInput = profileModal.querySelector('#app-profile-name')
	authState.profileLoginInput = profileModal.querySelector('#app-profile-login')
	authState.profileRoleBadge = profileModal.querySelector('#app-profile-role-badge')
	authState.profileAvatarGrid = profileModal.querySelector('#app-profile-avatar-grid')
	authState.profileAvatarPreview = profileModal.querySelector('#app-profile-avatar-preview')
	authState.profileAvatarUploadInput = profileModal.querySelector('#app-profile-avatar-upload')
	authState.profileAvatarBrowseBtn = profileModal.querySelector('#app-profile-avatar-browse-btn')
	authState.profileAvatarResetBtn = profileModal.querySelector('#app-profile-avatar-reset-btn')
	authState.profileLogoutBtn = profileModal.querySelector('#app-profile-logout-btn')

	renderRegisterAvatarEditor()
	renderAuthUi()
	updateAuthMode('login')

	authState.trigger?.addEventListener('click', toggleUserPopover)

	hub.addEventListener('click', event => {
		const actionButton = event.target.closest('[data-user-action]')
		if (!actionButton) return

		handleUserAction(actionButton.dataset.userAction)
	})

	document.addEventListener('click', event => {
		if (!hub.contains(event.target)) {
			closeUserPopover()
		}
	})

	authModal.addEventListener('click', event => {
		if (event.target.closest('[data-auth-close]')) {
			closeModal(authModal)
		}
	})

	profileModal.addEventListener('click', event => {
		if (event.target.closest('[data-profile-close]')) {
			closeModal(profileModal)
		}
	})

	authState.authSwitchBtn?.addEventListener('click', () => {
		updateAuthMode(authState.mode === 'login' ? 'register' : 'login')
	})

	authState.authAvatarGrid?.addEventListener('click', event => {
		const choice = event.target.closest('[data-avatar-id]')
		if (!choice) return

		authState.selectedRegisterAvatarId = choice.dataset.avatarId
		authState.customRegisterAvatarImage = ''
		renderRegisterAvatarEditor()
	})

	authState.profileAvatarGrid?.addEventListener('click', event => {
		const choice = event.target.closest('[data-avatar-id]')
		if (!choice) return

		authState.selectedProfileAvatarId = choice.dataset.avatarId
		authState.customProfileAvatarImage = ''
		renderProfileAvatarEditor()
	})

	authState.authAvatarBrowseBtn?.addEventListener('click', () => authState.authAvatarUploadInput?.click())
	authState.profileAvatarBrowseBtn?.addEventListener('click', () => authState.profileAvatarUploadInput?.click())

	authState.authAvatarResetBtn?.addEventListener('click', () => clearCustomAvatar('register'))
	authState.profileAvatarResetBtn?.addEventListener('click', () => clearCustomAvatar('profile'))

	authState.authAvatarUploadInput?.addEventListener('change', async event => {
		const file = event.target.files?.[0]
		if (!file) return

		try {
			await handleAvatarFileSelection('register', file)
		} catch (error) {
			notify({
				type: 'error',
				title: 'Avatar nie zostal wgrany',
				message: error.message || 'Nie udalo sie przygotowac avatara.',
			})
		}
	})

	authState.profileAvatarUploadInput?.addEventListener('change', async event => {
		const file = event.target.files?.[0]
		if (!file) return

		try {
			await handleAvatarFileSelection('profile', file)
		} catch (error) {
			notify({
				type: 'error',
				title: 'Avatar nie zostal wgrany',
				message: error.message || 'Nie udalo sie przygotowac avatara.',
			})
		}
	})

	authState.authFullNameInput?.addEventListener('input', renderRegisterAvatarEditor)
	authState.authLoginInput?.addEventListener('input', renderRegisterAvatarEditor)
	authState.profileNameInput?.addEventListener('input', renderProfileAvatarEditor)
	authState.profileLoginInput?.addEventListener('input', renderProfileAvatarEditor)

	authState.authForm?.addEventListener('submit', event => {
		event.preventDefault()

		try {
			if (authState.mode === 'register') {
				const password = authState.authPasswordInput?.value || ''
				const repeatedPassword = authState.authPasswordRepeatInput?.value || ''
				if (password !== repeatedPassword) {
					throw new Error('Hasla musza byc identyczne.')
				}

					registerUser({
						fullName: authState.authFullNameInput?.value || '',
						login: authState.authLoginInput?.value || '',
						password,
						avatarId: authState.selectedRegisterAvatarId,
						avatarImage: authState.customRegisterAvatarImage,
					})
					notify({
						type: 'success',
						title: 'Konto utworzone',
						message: 'Nowe konto lokalne zostalo zalozone i od razu aktywowane w tej przegladarce.',
					})
				} else {
					loginUser({
						login: authState.authLoginInput?.value || '',
						password: authState.authPasswordInput?.value || '',
					})
					notify({
						type: 'success',
						title: 'Zalogowano',
						message: 'Sesja uzytkownika jest aktywna i gotowa do pracy we wszystkich modulach.',
					})
				}

				authState.authForm.reset()
				resetRegisterAvatarEditor()
				closeModal(authModal)
			} catch (error) {
				notify({
					type: 'error',
					title: authState.mode === 'register' ? 'Nie udalo sie zalozyc konta' : 'Nie udalo sie zalogowac',
					message: error.message || 'Nie udalo sie zapisac zmian.',
				})
			}
		})

	authState.profileForm?.addEventListener('submit', event => {
		event.preventDefault()

		try {
			updateCurrentUserProfile({
				fullName: authState.profileNameInput?.value || '',
				login: authState.profileLoginInput?.value || '',
				avatarId: authState.selectedProfileAvatarId,
				avatarImage: authState.customProfileAvatarImage,
			})

			closeModal(profileModal)
			notify({
				type: 'success',
				title: 'Profil zaktualizowany',
				message: 'Zmiany profilu zostaly zapisane i sa widoczne we wszystkich modulach.',
			})
		} catch (error) {
			notify({
				type: 'error',
				title: 'Aktualizacja nieudana',
				message: error.message || 'Nie udalo sie zaktualizowac profilu.',
			})
		}
	})

	authState.profileLogoutBtn?.addEventListener('click', () => {
		logoutUser()
		closeModal(profileModal)
	})

	window.addEventListener('keydown', event => {
		if (event.key === 'Escape') {
			closeUserPopover()

			if (!authState.authModal?.hidden) closeModal(authState.authModal)
			if (!authState.profileModal?.hidden) closeModal(authState.profileModal)
		}
	})

	return authState
}

const getCurrentUser = () => sanitizeUser(authState.currentUser)

const isAuthenticated = () => Boolean(authState.currentUser)

const isCurrentUserAdmin = () => authState.currentUser?.role === 'admin'

const getAuditActorSnapshot = (user = authState.currentUser) => {
	const safeUser = sanitizeUser(user)
	if (!safeUser) return null

	return {
		id: safeUser.id,
		fullName: safeUser.fullName,
		login: safeUser.login,
		role: safeUser.role,
		avatarId: safeUser.avatarId,
	}
}

const getAuditActorLabel = actor => {
	if (!actor) return 'Brak danych historycznych'
	if (actor.fullName) return actor.fullName
	if (actor.login) return `@${actor.login}`
	return 'Brak danych historycznych'
}

appServices.authService = {
	// TODO: replace these local auth flows with backend auth endpoints and token/session handling.
	register: registerUser,
	login: loginUser,
	logout: logoutUser,
	updateProfile: updateCurrentUserProfile,
	getCurrentUser,
	isAuthenticated,
	isCurrentUserAdmin,
	syncCurrentUserFromSession,
}
/* === Shared Auth And Session: End === */

/* === Shared Global UI: Start === */
const applyTheme = theme => {
	const isDark = theme === 'dark'
	document.body.classList.toggle('theme-dark', isDark)
}

const getStoredTheme = () => preferencesService?.getTheme?.() || storageService?.getText(APP_CONFIG.THEME_KEY, 'light') || 'light'

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
		preferencesService?.setTheme?.(nextTheme) || storageService?.setText?.(APP_CONFIG.THEME_KEY, nextTheme)
		updateToggle(nextTheme === 'dark')
	})

	window.addEventListener('storage', event => {
		if (event.key === APP_CONFIG.THEME_KEY) {
			updateToggle(getStoredTheme() === 'dark')
		}
	})

	updateToggle(getStoredTheme() === 'dark')
	return toggle
}

document.addEventListener('DOMContentLoaded', () => {
	applyTheme(getStoredTheme())
	ensureAuthUi()
	ensurePageStatusStrip()
	syncCurrentUserFromSession()

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
			preferencesService?.setWideMode?.(isWide) || storageService?.setBoolean?.('dashboard-wide-mode', isWide)
		})

			updateWideMode(preferencesService?.getWideMode?.() ?? storageService?.getBoolean?.('dashboard-wide-mode', false))
		}

	window.addEventListener('storage', event => {
		if (event.key === APP_CONFIG.STORAGE_KEYS.SESSION || event.key === APP_CONFIG.STORAGE_KEYS.USERS) {
			closeUserPopover()
			syncCurrentUserFromSession()
		}

		if (event.key === APP_CONFIG.THEME_KEY) {
			applyTheme(getStoredTheme())
		}
	})
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
	normalizeSearchText,
	matchesSearchQuery,
	escapeHtml,
	formatDateTimeLabel,
	getInitials,
	confirmDialog,
	renderAccessoryIcons,
	createMonthPicker,
	createAvatarMarkup,
	notify,
	auth: {
		getCurrentUser,
		isAuthenticated,
		isCurrentUserAdmin,
		getAuditActorSnapshot,
		getAuditActorLabel,
		openAuthModal,
		openProfileModal,
	},
}
/* === Shared Public API: End === */
