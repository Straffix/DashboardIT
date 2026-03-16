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
const renderAccessoryIcons = (accessories, size = '1.2rem') => {
	if (!accessories || accessories.length === 0) {
		return '<small style="color:#ccc">brak</small>'
	}
	return accessories
		.map(acc => {
			const icon = APP_CONFIG.ICON_MAP[acc] || 'fa-box'
			return `<i class="fas ${icon}" style="margin: 0 4px; color: #64748b; font-size: ${size};" title="${acc}"></i>`
		})
		.join('')
}

// --- EXPORT DO GLOBALNEGO OKNA ---
window.AppUtils = {
	config: APP_CONFIG,
	formatDate,
	normalizeSN,
	renderAccessoryIcons,
}
