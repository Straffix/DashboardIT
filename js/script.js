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
	authSubmitBtn: null,
	profileModal: null,
	profileForm: null,
	profileNameInput: null,
	profileLoginInput: null,
	profileRoleBadge: null,
	profileAvatarGrid: null,
	profileLogoutBtn: null,
	mode: 'login',
	selectedRegisterAvatarId: AUTH_CONFIG.avatarPresets[0].id,
	selectedProfileAvatarId: AUTH_CONFIG.avatarPresets[0].id,
}

const cloneValue = value => JSON.parse(JSON.stringify(value))

const getAvatarPreset = avatarId => AUTH_CONFIG.avatarPresets.find(preset => preset.id === avatarId) || AUTH_CONFIG.avatarPresets[0]

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
		createdAt: user.createdAt,
		updatedAt: user.updatedAt,
	}
}

const loadUsers = () => {
	try {
		const storedUsers = JSON.parse(localStorage.getItem(APP_CONFIG.STORAGE_KEYS.USERS) || '[]')
		return Array.isArray(storedUsers) ? storedUsers.map(mapStoredUser) : []
	} catch (error) {
		return []
	}
}

const saveUsers = users => {
	authState.users = users.map(mapStoredUser)
	localStorage.setItem(APP_CONFIG.STORAGE_KEYS.USERS, JSON.stringify(authState.users))
}

const loadSession = () => {
	try {
		const storedSession = JSON.parse(localStorage.getItem(APP_CONFIG.STORAGE_KEYS.SESSION) || 'null')
		if (!storedSession || typeof storedSession !== 'object' || !storedSession.userId) {
			return null
		}

		return {
			userId: String(storedSession.userId),
			loginAt: storedSession.loginAt || new Date().toISOString(),
		}
	} catch (error) {
		return null
	}
}

const saveSession = session => {
	authState.session = session ? cloneValue(session) : null

	if (!session) {
		localStorage.removeItem(APP_CONFIG.STORAGE_KEYS.SESSION)
		return
	}

	localStorage.setItem(APP_CONFIG.STORAGE_KEYS.SESSION, JSON.stringify(authState.session))
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

const registerUser = ({ fullName, login, password, avatarId }) => {
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

const logoutUser = () => {
	saveSession(null)
	setCurrentUser(null)
}

const updateCurrentUserProfile = ({ fullName, login, avatarId }) => {
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
					updatedAt: now,
			  }
			: user
	)

	saveUsers(updatedUsers)
	const nextCurrentUser = updatedUsers.find(user => user.id === authState.currentUser.id)
	setCurrentUser(nextCurrentUser)
	return sanitizeUser(nextCurrentUser)
}

const createAvatarMarkup = ({ fullName, avatarId, extraClass = '' } = {}) => {
	const preset = getAvatarPreset(avatarId)
	const classes = ['app-user-avatar', extraClass].filter(Boolean).join(' ')
	return `<span class="${classes}" style="--app-avatar-gradient: ${preset.gradient}">${getInitials(fullName)}</span>`
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
	if (authState.profileNameInput) authState.profileNameInput.value = authState.currentUser.fullName || ''
	if (authState.profileLoginInput) authState.profileLoginInput.value = authState.currentUser.login || ''
	if (authState.profileRoleBadge) {
		authState.profileRoleBadge.textContent = authState.currentUser.role === 'admin' ? 'Administrator' : 'Uzytkownik'
		authState.profileRoleBadge.classList.toggle('is-admin', authState.currentUser.role === 'admin')
	}

	renderAvatarChoices(authState.profileAvatarGrid, authState.selectedProfileAvatarId)
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
	authState.authSwitchBtn = authModal.querySelector('.app-auth-switch')
	authState.authFullNameInput = authModal.querySelector('#app-auth-full-name')
	authState.authLoginInput = authModal.querySelector('#app-auth-login')
	authState.authPasswordInput = authModal.querySelector('#app-auth-password')
	authState.authPasswordRepeatInput = authModal.querySelector('#app-auth-password-repeat')
	authState.authRoleHint = authModal.querySelector('#app-auth-role-hint')
	authState.authAvatarGrid = authModal.querySelector('#app-auth-avatar-grid')
	authState.authSubmitBtn = authModal.querySelector('.app-auth-submit')
	authState.profileModal = profileModal
	authState.profileForm = profileModal.querySelector('.app-profile-form')
	authState.profileNameInput = profileModal.querySelector('#app-profile-name')
	authState.profileLoginInput = profileModal.querySelector('#app-profile-login')
	authState.profileRoleBadge = profileModal.querySelector('#app-profile-role-badge')
	authState.profileAvatarGrid = profileModal.querySelector('#app-profile-avatar-grid')
	authState.profileLogoutBtn = profileModal.querySelector('#app-profile-logout-btn')

	renderAvatarChoices(authState.authAvatarGrid, authState.selectedRegisterAvatarId)
	renderAuthUi()
	updateAuthMode('login')

	authState.trigger?.addEventListener('click', toggleUserPopover)

	hub.addEventListener('click', event => {
		const actionButton = event.target.closest('[data-user-action]')
		if (!actionButton) return

		const { userAction } = actionButton.dataset
		closeUserPopover()

		if (userAction === 'login') openAuthModal('login')
		if (userAction === 'register') openAuthModal('register')
		if (userAction === 'profile') openProfileModal()
		if (userAction === 'logout') logoutUser()
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
		renderAvatarChoices(authState.authAvatarGrid, authState.selectedRegisterAvatarId)
	})

	authState.profileAvatarGrid?.addEventListener('click', event => {
		const choice = event.target.closest('[data-avatar-id]')
		if (!choice) return

		authState.selectedProfileAvatarId = choice.dataset.avatarId
		renderAvatarChoices(authState.profileAvatarGrid, authState.selectedProfileAvatarId)
	})

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
				})
			} else {
				loginUser({
					login: authState.authLoginInput?.value || '',
					password: authState.authPasswordInput?.value || '',
				})
			}

			authState.authForm.reset()
			authState.selectedRegisterAvatarId = AUTH_CONFIG.avatarPresets[0].id
			renderAvatarChoices(authState.authAvatarGrid, authState.selectedRegisterAvatarId)
			closeModal(authModal)
		} catch (error) {
			alert(error.message || 'Nie udalo sie zapisac zmian.')
		}
	})

	authState.profileForm?.addEventListener('submit', event => {
		event.preventDefault()

		try {
			updateCurrentUserProfile({
				fullName: authState.profileNameInput?.value || '',
				login: authState.profileLoginInput?.value || '',
				avatarId: authState.selectedProfileAvatarId,
			})

			closeModal(profileModal)
		} catch (error) {
			alert(error.message || 'Nie udalo sie zaktualizowac profilu.')
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
/* === Shared Auth And Session: End === */

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
	ensureAuthUi()
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
	normalizeSearchText,
	matchesSearchQuery,
	confirmDialog,
	renderAccessoryIcons,
	createMonthPicker,
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
