/**
 * UTILS.JS - Wspólne funkcje i stałe dla systemu DashboardIT
 */

const APP_CONFIG = {
	MONTH_NAMES: [
		'Styczeń',
		'Luty',
		'Marzec',
		'Kwiecień',
		'Maj',
		'Czerwiec',
		'Lipiec',
		'Sierpień',
		'Wrzesień',
		'Październik',
		'Listopad',
		'Grudzień',
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
		headset: 'Słuchawki',
		monitor: 'Monitor',
		bag: 'Torba / Etui',
	},
	STORAGE_KEYS: {
		MONITOR: 'monitor_laptopow_dane',
		HIRES: 'nowe_zatrudnienia_dane',
		EXCHANGES: 'wymiana_sprzetu_dane',
	},
}

// --- FORMATOWANIE DAT ---
const formatDate = date => {
	const d = new Date(date)
	if (isNaN(d.getTime())) return ''
	const year = d.getFullYear()
	const month = String(d.getMonth() + 1).padStart(2, '0')
	const day = String(d.getDate()).padStart(2, '0')
	return `${year}-${month}-${day}`
}

// --- NORMALIZACJA NUMERÓW SERYJNYCH ---
const normalizeSN = sn => {
	return sn ? sn.toString().trim().replace(/-/g, '').toUpperCase() : ''
}

// --- GENEROWANIE IKON AKCESORIÓW ---
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
		return '<small style="color:#ccc">brak</small>'
	}
	const normalized = accessories.filter(Boolean)
	const visibleItems = normalized.slice(0, config.maxVisible)
	const hiddenItems = normalized.slice(config.maxVisible)

	const items = visibleItems
		.map(acc => {
			const icon = APP_CONFIG.ICON_MAP[acc] || 'fa-box'
			const label = APP_CONFIG.ACCESSORY_LABELS[acc] || acc
			return `<i class="fas ${icon} acc-inline-icon" style="--acc-icon-size:${config.size}" title="${label}"></i>`
		})
		.join('')

	const hiddenBadge = hiddenItems.length
		? `<span class="acc-more-badge" title="${hiddenItems
				.map(acc => APP_CONFIG.ACCESSORY_LABELS[acc] || acc)
				.join(', ')}">+${hiddenItems.length}</span>`
		: ''

	const wrapperStyle = config.columns ? ` style="--acc-columns:${config.columns}"` : ''
	return `<span class="${config.wrapperClass}"${wrapperStyle}>${items}${hiddenBadge}</span>`
}

// --- EXPORT DO GLOBALNEGO OKNA ---
window.AppUtils = {
	config: APP_CONFIG,
	formatDate,
	normalizeSN,
	renderAccessoryIcons,
}
