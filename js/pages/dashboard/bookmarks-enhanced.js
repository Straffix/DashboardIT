document.addEventListener('DOMContentLoaded', () => {
	const bookmarkList = document.getElementById('dashboard-bookmarks-list')
	const bookmarkModal = document.getElementById('dashboard-bookmark-modal')
	const bookmarkForm = document.getElementById('dashboard-bookmark-form')
	const bookmarkPanel = document.querySelector('.dashboard-bookmarks-panel')
	const bookmarkModalCard = bookmarkModal.querySelector('.dashboard-bookmark-modal-card')
	const bookmarkLabelInput = document.getElementById('dashboard-bookmark-label')
	const bookmarkUrlInput = document.getElementById('dashboard-bookmark-url')
	const bookmarkColorInput = document.getElementById('dashboard-bookmark-color')
	const bookmarkIconInput = document.getElementById('dashboard-bookmark-icon')
	const bookmarkIconGrid = document.getElementById('dashboard-bookmark-icon-grid')
	const bookmarkSubmitBtn = document.getElementById('dashboard-bookmark-submit-btn')
	const bookmarkDeleteBtn = document.getElementById('dashboard-bookmark-delete-btn')
	const bookmarkModalTitle = document.getElementById('dashboard-bookmark-modal-title')
	const bookmarkCancelBtn = document.getElementById('dashboard-bookmark-cancel-btn')

	if (
		!bookmarkList ||
		!bookmarkModal ||
		!bookmarkForm ||
		!bookmarkColorInput ||
		!bookmarkIconInput ||
		!bookmarkIconGrid
	) {
		return
	}

	const bookmarksService = window.AppServices?.bookmarksService
	const authService = window.AppServices?.authService
	const escapeHtml = AppUtils.escapeHtml
	const BOOKMARK_DEFAULT_COLOR = '#94a3b8'
	const BOOKMARK_PICKER_NEUTRAL_COLOR = '#64748b'
	const ROOT_BOOKMARK_ICON_FILES = Object.freeze([
		'arrow-down-solid-full',
		'arrow-left-solid-full',
		'arrow-right-from-bracket-solid-full',
		'backpack-icon',
		'ban-solid-full',
		'bookmark-solid-full',
		'box-solid-full',
		'briefcase-solid-full',
		'bug-solid-full',
		'calendar-check-solid-full',
		'calendar-day-solid-full',
		'check-solid-full',
		'chevron-down-solid-full',
		'chevron-left-solid-full',
		'chevron-right-solid-full',
		'circle-check-solid-full',
		'circle-info-solid-full',
		'circle-xmark-solid-full',
		'clipboard-list-solid-full',
		'clock-solid-full',
		'comment-solid-full',
		'compress-solid-full',
		'computer-mouse-solid-full',
		'desktop-solid-full',
		'expand-solid-full',
		'facebook-brands-solid-full',
		'facebook-f-brands-solid-full',
		'file-excel-solid-full',
		'file-import-solid-full',
		'floppy-disk-solid-full',
		'folder-network-custom',
		'grip-solid-full',
		'headset-solid-full',
		'image-solid-full',
		'instagram-brands-solid-full',
		'keyboard-solid-full',
		'laptop-solid-full',
		'layer-group-solid-full',
		'location-crosshairs-solid-full',
		'lock-solid-full',
		'magnifying-glass-solid-full',
		'minus-solid-full',
		'moon-solid-full',
		'panorama-solid-full',
		'paper-plane-solid-full',
		'pen-clip-solid-full',
		'pen-solid-full',
		'pen-to-square-solid-full',
		'plus-solid-full',
		'print-solid-full',
		'report-spark-custom',
		'right-left-solid-full',
		'right-to-bracket-solid-full',
		'rotate-right-solid-full',
		'shield-halved-solid-full',
		'square-x-twitter-brands-solid-full',
		'store-solid-full',
		'sun-solid-full',
		'table-cells-solid-full',
		'team-space-custom',
		'thumbtack-solid-full',
		'trash-can-solid-full',
		'trash-solid-full',
		'triangle-exclamation-solid-full',
		'user-gear-solid-full',
		'user-plus-solid-full',
		'user-solid-full',
		'utensils-solid-full',
		'vertical-mouse-side-icon',
		'xmark-solid-full',
	])
	const NESTED_BOOKMARK_ICON_FILES = Object.freeze([
		'apple',
		'astroid',
		'blocks',
		'book',
		'bookmark',
		'book-open-solid-full',
		'building',
		'bullhorn-solid-full',
		'calendar-days-solid-full',
		'chart-column-decreasing',
		'chart-line-solid-full',
		'chart-pie-solid-full',
		'circle-plus-solid-full',
		'circle-user',
		'cloudscale-brands-solid-full',
		'cloud-solid-full',
		'computer',
		'confluence-brands-solid-full',
		'database-solid-full',
		'diagram-project-solid-full',
		'envelope-solid-full',
		'file-pdf-solid-full',
		'file-powerpoint-solid-full',
		'file-word-solid-full',
		'folder-open-solid-full',
		'folder-solid-full',
		'gear-solid-full',
		'gratipay-brands-solid-full',
		'heart',
		'house-solid-full',
		'key-round',
		'key-solid-full',
		'link',
		'link-2',
		'link-solid-full',
		'lock',
		'mail',
		'map-pin-minus-inside',
		'monitor',
		'network-wired-solid-full',
		'openai-brands-solid-full',
		'paperclip',
		'presentation',
		'readme-brands-solid-full',
		'rss',
		'screen-share',
		'server-solid-full',
		'settings',
		'settings-2',
		'share-2',
		'shield',
		'shield-half',
		'square-arrow-out-up-right',
		'square-web-awesome-brands-solid-full',
		'star',
		'substack-brands-solid-full',
		'table-cells-large-solid-full',
		'table-solid-full',
		'threema-brands-solid-full',
		'ticket-simple-solid-full',
		'trash-2',
		'user-group-solid-full',
		'users-solid-full',
		'wpforms-brands-solid-full',
		'wrench',
		'youtube-brands-solid-full',
	])
	const BOOKMARK_ICON_COLOR_PALETTE = Object.freeze([
		'#0f766e',
		'#2563eb',
		'#7c3aed',
		'#ea580c',
		'#dc2626',
		'#0891b2',
		'#15803d',
		'#d97706',
		'#4f46e5',
		'#0ea5e9',
		'#ec4899',
		'#475569',
	])
	const BOOKMARK_ICON_METADATA_OVERRIDES = Object.freeze({
		'bookmark-solid-full': { label: 'Zakladka', hint: 'skrot', colorHex: '#8b5cf6' },
		'bookmarks__bookmark-solid-full': { label: 'Zakladka Alt', hint: 'bookmarks icons', colorHex: '#a855f7' },
		'book-open-solid-full': { label: 'Baza Wiedzy', hint: 'instrukcje', colorHex: '#0f766e' },
		'file-excel-solid-full': { label: 'Excel', hint: 'arkusze', colorHex: '#15803d' },
		'file-word-solid-full': { label: 'Word', hint: 'dokumenty', colorHex: '#2563eb' },
		'file-pdf-solid-full': { label: 'PDF', hint: 'instrukcje', colorHex: '#dc2626' },
		'file-powerpoint-solid-full': { label: 'Prezentacja', hint: 'slajdy', colorHex: '#ea580c' },
		'cloud-solid-full': { label: 'Cloud', hint: 'chmura', colorHex: '#0ea5e9' },
		'confluence-brands-solid-full': { label: 'Confluence', hint: 'wiki', colorHex: '#1d4ed8' },
		'readme-brands-solid-full': { label: 'Readme', hint: 'dokumentacja', colorHex: '#2563eb' },
		'openai-brands-solid-full': { label: 'OpenAI', hint: 'ai', colorHex: '#0f766e' },
		'ticket-simple-solid-full': { label: 'Ticket', hint: 'zgloszenie', colorHex: '#ef4444' },
		'desktop-solid-full': { label: 'Komputer', hint: 'stanowisko', colorHex: '#2563eb' },
		monitor: { label: 'Monitor', hint: 'ekran', colorHex: '#0f766e' },
		'server-solid-full': { label: 'Serwer', hint: 'infrastruktura', colorHex: '#475569' },
		'database-solid-full': { label: 'Baza Danych', hint: 'system', colorHex: '#0891b2' },
		'network-wired-solid-full': { label: 'Siec', hint: 'lan vpn', colorHex: '#4f46e5' },
		'user-gear-solid-full': { label: 'Admin', hint: 'uprawnienia', colorHex: '#7c3aed' },
		'gear-solid-full': { label: 'Ustawienia', hint: 'konfiguracja', colorHex: '#64748b' },
		'shield-halved-solid-full': { label: 'Bezpieczenstwo', hint: 'ochrona', colorHex: '#16a34a' },
		'triangle-exclamation-solid-full': { label: 'Alert', hint: 'uwaga', colorHex: '#dc2626' },
		'chart-line-solid-full': { label: 'Raport', hint: 'wyniki', colorHex: '#0ea5e9' },
		'chart-pie-solid-full': { label: 'Dashboard', hint: 'analiza', colorHex: '#a855f7' },
		'calendar-days-solid-full': { label: 'Kalendarz', hint: 'terminy', colorHex: '#7c3aed' },
		'calendar-day-solid-full': { label: 'Dzien', hint: 'plan', colorHex: '#ec4899' },
		'users-solid-full': { label: 'Zespol', hint: 'ludzie', colorHex: '#dc2626' },
		'user-group-solid-full': { label: 'Grupa', hint: 'pracownicy', colorHex: '#0284c7' },
		'envelope-solid-full': { label: 'Mail', hint: 'poczta', colorHex: '#2563eb' },
		paperclip: { label: 'Zalacznik', hint: 'plik', colorHex: '#64748b' },
		'folder-open-solid-full': { label: 'Folder', hint: 'zasoby', colorHex: '#d97706' },
		'folder-solid-full': { label: 'Archiwum', hint: 'pliki', colorHex: '#92400e' },
		'house-solid-full': { label: 'Start', hint: 'strona glowna', colorHex: '#2563eb' },
		building: { label: 'Portal', hint: 'intranet', colorHex: '#475569' },
		'link-solid-full': { label: 'Link', hint: 'odnosnik', colorHex: '#4f46e5' },
		'square-arrow-out-up-right': { label: 'Przekierowanie', hint: 'zewnetrzne', colorHex: '#0f766e' },
	})
	const ENHANCED_BOOKMARK_ICON_OPTIONS = buildEnhancedBookmarkIconOptions()
	const ENHANCED_BOOKMARK_ICON_IDS = new Set(ENHANCED_BOOKMARK_ICON_OPTIONS.map(option => option.id).filter(Boolean))
	const ENHANCED_BOOKMARK_ICON_OPTIONS_BY_ID = new Map(
		ENHANCED_BOOKMARK_ICON_OPTIONS.filter(option => option.id).map(option => [option.id, option]),
	)
	const ENHANCED_BOOKMARK_ICON_ALIASES = new Map(
		ENHANCED_BOOKMARK_ICON_OPTIONS.flatMap(option => (option.aliases || []).map(alias => [alias, option.id])),
	)
	const BOOKMARK_ICON_OPTIONS = [
		{ id: '', label: 'Domyślna', hint: 'favicon strony' },
		// Pliki / dokumenty
		{ id: 'file-excel-solid-full', label: 'Excel', hint: 'arkusze' },
		{ id: 'file-word-solid-full', label: 'Word', hint: 'dokumenty' },
		{ id: 'file-pdf-solid-full', label: 'PDF', hint: 'instrukcje' },
		{ id: 'file-powerpoint-solid-full', label: 'Prezentacja', hint: 'slajdy' },
		{ id: 'folder-open-solid-full', label: 'Folder', hint: 'zasoby' },
		{ id: 'link-solid-full', label: 'Link', hint: 'odnośnik' },

		// Microsoft / praca zespołowa
		{ id: 'cloud-solid-full', label: 'SharePoint', hint: 'chmura' },
		{ id: 'users-solid-full', label: 'Zespół', hint: 'ludzie' },
		{ id: 'envelope-solid-full', label: 'Mail', hint: 'poczta' },
		{ id: 'calendar-days-solid-full', label: 'Kalendarz', hint: 'terminy' },

		// IT / helpdesk
		{ id: 'ticket-simple-solid-full', label: 'Zgłoszenia', hint: 'helpdesk' },
		{ id: 'desktop-solid-full', label: 'Komputer', hint: 'stacje robocze' },
		{ id: 'network-wired-solid-full', label: 'Sieć', hint: 'LAN/VPN' },

		// Bezpieczeństwo / administracja
		{ id: 'shield-halved-solid-full', label: 'Bezpieczeństwo', hint: 'ochrona' },
		{ id: 'key-solid-full', label: 'Uwaga', hint: 'ważne' },
		{ id: 'user-gear-solid-full', label: 'Admin', hint: 'uprawnienia' },
		{ id: 'gear-solid-full', label: 'Ustawienia', hint: 'konfiguracja' },

		// Raporty / analiza
		{ id: 'chart-line-solid-full', label: 'Raport', hint: 'wyniki' },
		{ id: 'chart-pie-solid-full', label: 'Dashboard', hint: 'analiza' },
		{ id: 'table-solid-full', label: 'Tabela', hint: 'dane' },
	]
	const BOOKMARK_ICON_ASSET_PATHS = Object.freeze({
		'bookmark-solid-full': 'img/ico/bookmark-solid-full.svg',
		'file-excel-solid-full': 'img/ico/file-excel-solid-full.svg',
		'file-word-solid-full': 'img/ico/bookmarks icons/file-word-solid-full.svg',
		'file-pdf-solid-full': 'img/ico/bookmarks icons/file-pdf-solid-full.svg',
		'file-powerpoint-solid-full': 'img/ico/bookmarks icons/file-powerpoint-solid-full.svg',
		'folder-open-solid-full': 'img/ico/bookmarks icons/folder-open-solid-full.svg',
		'link-solid-full': 'img/ico/bookmarks icons/link-solid-full.svg',
		'cloud-solid-full': 'img/ico/cloud-solid-full.svg',
		'users-solid-full': 'img/ico/bookmarks icons/users-solid-full.svg',
		'envelope-solid-full': 'img/ico/bookmarks icons/envelope-solid-full.svg',
		'calendar-days-solid-full': 'img/ico/bookmarks icons/calendar-days-solid-full.svg',
		'ticket-simple-solid-full': 'img/ico/bookmarks icons/ticket-simple-solid-full.svg',
		'desktop-solid-full': 'img/ico/desktop-solid-full.svg',
		'network-wired-solid-full': 'img/ico/bookmarks icons/network-wired-solid-full.svg',
		'shield-halved-solid-full': 'img/ico/shield-halved-solid-full.svg',
		'key-solid-full': 'img/ico/bookmarks icons/key-solid-full.svg',
		'user-gear-solid-full': 'img/ico/bookmarks icons/user-gear-solid-full.svg',
		'gear-solid-full': 'img/ico/bookmarks icons/gear-solid-full.svg',
		'chart-line-solid-full': 'img/ico/bookmarks icons/chart-line-solid-full.svg',
		'chart-pie-solid-full': 'img/ico/bookmarks icons/chart-pie-solid-full.svg',
		'table-solid-full': 'img/ico/bookmarks icons/table-solid-full.svg',
	})
	const BOOKMARK_ICON_IDS = new Set(BOOKMARK_ICON_OPTIONS.map(option => option.id).filter(Boolean))

	let editingBookmarkId = null
	let bookmarks = loadBookmarks()

	function loadBookmarks() {
		const storedBookmarks = bookmarksService?.getAll?.() || []
		return Array.isArray(storedBookmarks) ? storedBookmarks.map(normalizeBookmarkRecord) : []
	}

	function normalizeBookmarkColor(value, fallback = BOOKMARK_DEFAULT_COLOR) {
		const normalizedValue = String(value || '')
			.trim()
			.toLowerCase()
		return /^#[0-9a-f]{6}$/.test(normalizedValue) ? normalizedValue : fallback
	}

	function normalizeOptionalBookmarkColor(value) {
		const normalizedValue = String(value || '')
			.trim()
			.toLowerCase()
		return /^#[0-9a-f]{6}$/.test(normalizedValue) ? normalizedValue : ''
	}

	function buildEnhancedBookmarkIconOptions() {
		const rootIconNames = new Set(ROOT_BOOKMARK_ICON_FILES)
		const options = [
			{ id: '', label: 'Domyslna', hint: 'favicon strony', colorHex: '#64748b', assetPath: '', aliases: [''] },
			...ROOT_BOOKMARK_ICON_FILES.map(iconName =>
				createEnhancedBookmarkIconOption({
					baseName: iconName,
					assetPath: `img/ico/${iconName}.svg`,
					source: 'ico',
				}),
			),
			...NESTED_BOOKMARK_ICON_FILES.map(iconName =>
				createEnhancedBookmarkIconOption({
					baseName: iconName,
					assetPath: `img/ico/bookmarks icons/${iconName}.svg`,
					source: 'bookmarks',
					isDuplicate: rootIconNames.has(iconName),
				}),
			),
		]

		return options
	}

	function createEnhancedBookmarkIconOption({ baseName, assetPath, source, isDuplicate = false }) {
		const id = isDuplicate ? `${source}__${baseName}` : baseName
		const metadata = BOOKMARK_ICON_METADATA_OVERRIDES[id] || BOOKMARK_ICON_METADATA_OVERRIDES[baseName] || {}
		const aliases = metadata.aliases || []

		return {
			id,
			label: metadata.label || humanizeBookmarkIconName(baseName),
			hint: metadata.hint || (isDuplicate ? `${source} icons` : source === 'ico' ? 'ico' : 'bookmark'),
			colorHex: normalizeBookmarkColor(metadata.colorHex, pickBookmarkIconColor(id)),
			assetPath,
			aliases,
		}
	}

	function humanizeBookmarkIconName(iconName) {
		return String(iconName || '')
			.replace(/-(solid-full|brands-solid-full)$/g, '')
			.replace(/-(custom|icon)$/g, '')
			.replace(/[-_]+/g, ' ')
			.split(' ')
			.filter(Boolean)
			.map(segment => segment.charAt(0).toUpperCase() + segment.slice(1))
			.join(' ')
	}

	function pickBookmarkIconColor(iconId) {
		let hash = 0
		for (const character of String(iconId || '')) {
			hash = (hash * 31 + character.charCodeAt(0)) >>> 0
		}

		return BOOKMARK_ICON_COLOR_PALETTE[hash % BOOKMARK_ICON_COLOR_PALETTE.length]
	}

	function normalizeBookmarkIconName(value) {
		const normalizedValue = String(value || '')
			.trim()
			.toLowerCase()
		if (ENHANCED_BOOKMARK_ICON_IDS.has(normalizedValue)) {
			return normalizedValue
		}

		return ENHANCED_BOOKMARK_ICON_ALIASES.get(normalizedValue) || ''
	}

	function getBookmarkIconOption(iconName) {
		const normalizedIconName = normalizeBookmarkIconName(iconName)
		return normalizedIconName ? ENHANCED_BOOKMARK_ICON_OPTIONS_BY_ID.get(normalizedIconName) || null : null
	}

	function getBookmarkIconDefaultColor(iconName, fallback = BOOKMARK_DEFAULT_COLOR) {
		const iconOption = getBookmarkIconOption(iconName)
		return normalizeBookmarkColor(iconOption?.colorHex, fallback)
	}

	function normalizeBookmarkRecord(record) {
		return {
			id: String(record.id || ''),
			userId: String(record.userId || ''),
			label: String(record.label || '').trim(),
			url: String(record.url || '').trim(),
			description: String(record.description || '').trim(),
			colorHex: normalizeOptionalBookmarkColor(record.colorHex),
			iconName: normalizeBookmarkIconName(record.iconName),
			createdAt: record.createdAt || '',
			updatedAt: record.updatedAt || record.createdAt || '',
		}
	}

	function saveBookmarks() {
		bookmarksService?.saveAll?.(bookmarks)
	}

	function getCurrentUser() {
		return AppUtils.auth.getCurrentUser()
	}

	function getCurrentUserDefaultBookmarkColor(user = getCurrentUser()) {
		return normalizeBookmarkColor(user?.bookmarkDefaultColor, BOOKMARK_DEFAULT_COLOR)
	}

	function resolveBookmarkColor(bookmark, fallbackColor = BOOKMARK_DEFAULT_COLOR) {
		return normalizeBookmarkColor(bookmark?.colorHex, normalizeBookmarkColor(fallbackColor, BOOKMARK_DEFAULT_COLOR))
	}

	function getBookmarkIconAssetUrl(iconName) {
		return getBookmarkIconOption(iconName)?.assetPath || ''
	}

	function getBookmarkAccentRgb(colorHex) {
		const normalizedColor = normalizeBookmarkColor(colorHex)
		const red = Number.parseInt(normalizedColor.slice(1, 3), 16)
		const green = Number.parseInt(normalizedColor.slice(3, 5), 16)
		const blue = Number.parseInt(normalizedColor.slice(5, 7), 16)
		return `${red}, ${green}, ${blue}`
	}

	function applyBookmarkAccentTheme(element, colorHex) {
		if (!element) return
		const normalizedColor = normalizeBookmarkColor(colorHex)
		element.style.setProperty('--bookmark-accent', normalizedColor)
		element.style.setProperty('--bookmark-accent-rgb', getBookmarkAccentRgb(normalizedColor))
	}

	function applyBookmarkAccentThemes(scope = bookmarkList) {
		if (!scope) return

		scope.querySelectorAll('[data-bookmark-accent-color]').forEach(element => {
			applyBookmarkAccentTheme(element, element.dataset.bookmarkAccentColor || BOOKMARK_DEFAULT_COLOR)
		})
	}

	function setBookmarkColorValue(colorHex, fallbackColor = BOOKMARK_DEFAULT_COLOR) {
		const normalizedColor = normalizeBookmarkColor(colorHex, fallbackColor)
		bookmarkColorInput.value = normalizedColor
		bookmarkModalCard?.style.setProperty('--bookmark-current-color', normalizedColor)
		return normalizedColor
	}

	function buildBookmarkAssetIconMarkup(iconName, className = 'dashboard-bookmark-icon-asset') {
		const iconUrl = getBookmarkIconAssetUrl(iconName)
		if (!iconUrl) return ''

		const encodedIconUrl = escapeHtml(encodeURI(iconUrl))
		return `<span class="${escapeHtml(className)}" style="-webkit-mask: url('${encodedIconUrl}') center / contain no-repeat; mask: url('${encodedIconUrl}') center / contain no-repeat;" aria-hidden="true"></span>`
	}

	function getCurrentUserBookmarks() {
		const currentUser = getCurrentUser()
		if (!currentUser) return []

		return bookmarks
			.filter(bookmark => bookmark.userId === currentUser.id)
			.sort((left, right) => {
				const leftTime = Date.parse(left.updatedAt || left.createdAt || '') || 0
				const rightTime = Date.parse(right.updatedAt || right.createdAt || '') || 0
				return rightTime - leftTime
			})
	}

	function createBookmarkId() {
		return `bookmark-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`
	}

	function normalizeLinkTarget(value) {
		const trimmedValue = String(value || '').trim()
		if (!trimmedValue) return ''

		if (/^(https?:|mailto:|tel:|file:|ftp:|ms-excel:|ms-word:|ms-powerpoint:)/i.test(trimmedValue)) {
			return trimmedValue
		}

		if (/^\\\\/.test(trimmedValue)) {
			return `file://${trimmedValue.replaceAll('\\', '/')}`
		}

		if (/^[a-zA-Z]:\\/.test(trimmedValue)) {
			return `file:///${trimmedValue.replaceAll('\\', '/')}`
		}

		return `https://${trimmedValue.replace(/^\/+/, '')}`
	}

	function getBookmarkFaviconSources(bookmark) {
		const normalizedTarget = normalizeLinkTarget(bookmark.url)

		try {
			const parsedUrl = new URL(normalizedTarget)
			if (!/^https?:$/i.test(parsedUrl.protocol)) {
				return []
			}

			return [
				`https://www.google.com/s2/favicons?domain=${encodeURIComponent(parsedUrl.hostname)}&sz=64`,
				`https://www.google.com/s2/favicons?domain_url=${encodeURIComponent(parsedUrl.origin)}&sz=64`,
				`https://icons.duckduckgo.com/ip3/${parsedUrl.hostname}.ico`,
				`https://icon.horse/icon/${parsedUrl.hostname}`,
				`${parsedUrl.origin}/favicon.ico`,
			]
		} catch (error) {
			return []
		}
	}

	function enhanceBookmarkFavicons() {
		bookmarkList.querySelectorAll('[data-bookmark-favicon]').forEach(image => {
			const iconShell = image.closest('[data-bookmark-icon]')
			if (!iconShell) return

			const showFallback = () => {
				iconShell.classList.remove('has-image')
				image.remove()
			}

			const fallbackSources = String(image.dataset.faviconSources || '')
				.split('||')
				.map(source => source.trim())
				.filter(Boolean)

			const tryNextSource = () => {
				const nextSource = fallbackSources.shift()
				if (!nextSource) {
					showFallback()
					return
				}

				image.dataset.faviconSources = fallbackSources.join('||')
				image.src = nextSource
			}

			const handleLoad = () => {
				iconShell.classList.add('has-image')
			}

			image.addEventListener('load', handleLoad)
			image.addEventListener('error', tryNextSource)

			if (image.complete) {
				if (image.naturalWidth > 0) {
					handleLoad()
				} else {
					tryNextSource()
				}
			}
		})
	}

	function setSelectedBookmarkIcon(iconName = '') {
		const normalizedIconName = normalizeBookmarkIconName(iconName)
		const activePickerColor = normalizeBookmarkColor(
			bookmarkColorInput?.value || getCurrentUserDefaultBookmarkColor(),
			getCurrentUserDefaultBookmarkColor(),
		)
		bookmarkIconInput.value = normalizedIconName

		bookmarkIconGrid.innerHTML = ENHANCED_BOOKMARK_ICON_OPTIONS.map(option => {
			const isActive = option.id === normalizedIconName || (!option.id && !normalizedIconName)
			const optionColor = isActive ? activePickerColor : BOOKMARK_PICKER_NEUTRAL_COLOR
			const optionColorRgb = getBookmarkAccentRgb(optionColor)
			const previewMarkup = option.id
				? buildBookmarkAssetIconMarkup(option.id, 'dashboard-bookmark-option-asset')
				: buildBookmarkAssetIconMarkup('bookmark-solid-full', 'dashboard-bookmark-option-asset')
			const optionLabel = [option.label, option.hint].filter(Boolean).join(' - ')

			return `
				<button
					type="button"
					class="dashboard-bookmark-icon-choice${isActive ? ' is-active' : ''}"
					data-bookmark-icon-option="${option.id}"
					aria-pressed="${String(isActive)}"
					aria-label="${escapeHtml(optionLabel)}"
					title="${escapeHtml(optionLabel)}"
					style="--bookmark-option-accent: ${escapeHtml(optionColor)}; --bookmark-option-accent-rgb: ${escapeHtml(optionColorRgb)};"
				>
					<span class="dashboard-bookmark-icon-choice-preview">${previewMarkup}</span>
				</button>
			`
		}).join('')
	}

	function syncSelectedBookmarkIconColor() {
		const activeIconButton = bookmarkIconGrid.querySelector('.dashboard-bookmark-icon-choice.is-active')
		if (!activeIconButton) return

		const activePickerColor = normalizeBookmarkColor(
			bookmarkColorInput?.value || getCurrentUserDefaultBookmarkColor(),
			getCurrentUserDefaultBookmarkColor(),
		)

		activeIconButton.style.setProperty('--bookmark-option-accent', activePickerColor)
		activeIconButton.style.setProperty('--bookmark-option-accent-rgb', getBookmarkAccentRgb(activePickerColor))
	}

	function resetBookmarkForm() {
		editingBookmarkId = null
		bookmarkForm.reset()

		if (bookmarkModalTitle) {
			bookmarkModalTitle.textContent = 'Dodaj zakladke'
		}

		if (bookmarkSubmitBtn) {
			bookmarkSubmitBtn.textContent = 'Zapisz zakladke'
		}

		if (bookmarkDeleteBtn) {
			bookmarkDeleteBtn.hidden = true
		}

		setBookmarkColorValue(getCurrentUserDefaultBookmarkColor())
		setSelectedBookmarkIcon('')
	}

	function openBookmarkModal(mode = 'create', bookmark = null) {
		resetBookmarkForm()

		if (mode === 'edit' && bookmark) {
			const bookmarkColor = resolveBookmarkColor(bookmark, getCurrentUserDefaultBookmarkColor())
			editingBookmarkId = bookmark.id
			bookmarkLabelInput.value = bookmark.label
			bookmarkUrlInput.value = bookmark.url
			setBookmarkColorValue(bookmarkColor)
			setSelectedBookmarkIcon(bookmark.iconName)

			if (bookmarkModalTitle) {
				bookmarkModalTitle.textContent = 'Edytuj zakladke'
			}

			if (bookmarkSubmitBtn) {
				bookmarkSubmitBtn.textContent = 'Zapisz zmiany'
			}

			if (bookmarkDeleteBtn) {
				bookmarkDeleteBtn.hidden = false
			}
		}

		bookmarkModal.hidden = false
		bookmarkModal.setAttribute('aria-hidden', 'false')
		document.body.classList.add('dashboard-bookmark-modal-open')
		window.setTimeout(() => bookmarkLabelInput?.focus(), 40)
	}

	function closeBookmarkModal() {
		bookmarkModal.hidden = true
		bookmarkModal.setAttribute('aria-hidden', 'true')
		document.body.classList.remove('dashboard-bookmark-modal-open')
		resetBookmarkForm()
	}

	function buildAddBookmarkButtonMarkup({ isAuthenticated = false } = {}) {
		const label = isAuthenticated ? 'Dodaj skrot' : 'Zaloguj sie, aby dodawac zakladki'
		return `
			<button
				type="button"
				class="dashboard-bookmark-add-tile"
				data-bookmark-add
				aria-label="${label}"
				title="${label}"
			>
				<span class="dashboard-bookmark-add-icon" aria-hidden="true">
					<i class="app-icon ${isAuthenticated ? 'plus-solid-full' : 'right-to-bracket-solid-full'}"></i>
				</span>
			</button>
		`
	}

	function updateBookmarkTabDensity() {
		const bookmarkTabs = Array.from(bookmarkList.querySelectorAll('.dashboard-bookmark-tab'))
		bookmarkTabs.forEach(tab => tab.classList.remove('is-compact'))

		for (let index = bookmarkTabs.length - 1; index >= 0 && bookmarkList.scrollWidth > bookmarkList.clientWidth; index -= 1) {
			bookmarkTabs[index].classList.add('is-compact')
		}
	}

	function scheduleBookmarkTabDensityUpdate() {
		window.requestAnimationFrame(updateBookmarkTabDensity)
	}

	function setBookmarkPanelVisibility(isVisible) {
		if (!bookmarkPanel) return

		bookmarkPanel.hidden = !isVisible
	}

	function renderBookmarks() {
		const currentUser = getCurrentUser()
		const userBookmarks = getCurrentUserBookmarks()
		const userDefaultColor = getCurrentUserDefaultBookmarkColor(currentUser)
		const addBookmarkMarkup = buildAddBookmarkButtonMarkup({ isAuthenticated: Boolean(currentUser) })
		if (!currentUser) {
			bookmarkList.innerHTML = addBookmarkMarkup
			setBookmarkPanelVisibility(true)
			scheduleBookmarkTabDensityUpdate()
			return
		}

		if (userBookmarks.length === 0) {
			bookmarkList.innerHTML = addBookmarkMarkup
			setBookmarkPanelVisibility(true)
			scheduleBookmarkTabDensityUpdate()
			return
		}

		setBookmarkPanelVisibility(true)

		bookmarkList.innerHTML = userBookmarks
				.map(bookmark => {
					const href = normalizeLinkTarget(bookmark.url)
					const description = escapeHtml(bookmark.description || 'Prywatny skrot zapisany dla Twojego konta.')
					const faviconSources = getBookmarkFaviconSources(bookmark)
					const initialFaviconUrl = escapeHtml(faviconSources[0] || '')
					const fallbackFaviconSources = escapeHtml(faviconSources.slice(1).join('||'))
					const label = escapeHtml(bookmark.label)
					const safeHref = escapeHtml(href)
					const customIconName = normalizeBookmarkIconName(bookmark.iconName)
					const bookmarkColor = resolveBookmarkColor(
						bookmark,
						customIconName ? getBookmarkIconDefaultColor(customIconName, userDefaultColor) : userDefaultColor,
					)
					const iconClassName = customIconName
						? 'dashboard-bookmark-icon has-custom-icon'
						: `dashboard-bookmark-icon${initialFaviconUrl ? '' : ' is-fallback'}`

					return `
					<article class="dashboard-bookmark-tab" data-bookmark-id="${bookmark.id}" data-bookmark-accent-color="${escapeHtml(bookmarkColor)}">
						<a class="dashboard-bookmark-tab-main" href="${safeHref}" target="_blank" rel="noopener noreferrer" title="${description}" aria-label="${label}">
							<span class="${iconClassName}" data-bookmark-icon>
								${customIconName ? buildBookmarkAssetIconMarkup(customIconName) : initialFaviconUrl ? `<img class="dashboard-bookmark-favicon" src="${initialFaviconUrl}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer" data-bookmark-favicon data-favicon-sources="${fallbackFaviconSources}">` : ''}
								<i class="app-icon bookmark-solid-full" aria-hidden="true"></i>
							</span>
							<span class="dashboard-bookmark-tab-copy">
								<strong>${label}</strong>
							</span>
						</a>
						<div class="dashboard-bookmark-actions">
							<button type="button" class="dashboard-bookmark-icon-btn" data-bookmark-action="edit" data-bookmark-id="${bookmark.id}" aria-label="Edytuj zakladke">
								<span class="dashboard-bookmark-kebab" aria-hidden="true"></span>
							</button>
						</div>
					</article>
				`
				})
				.join('') + addBookmarkMarkup

		applyBookmarkAccentThemes()
		enhanceBookmarkFavicons()
		scheduleBookmarkTabDensityUpdate()
	}

	async function handleAddBookmarkClick() {
		if (!AppUtils.auth.isAuthenticated()) {
			AppUtils.auth.openAuthModal?.('login')
			return
		}

		openBookmarkModal('create')
	}

	function getBookmarkById(bookmarkId) {
		return bookmarks.find(bookmark => bookmark.id === bookmarkId)
	}

	async function handleBookmarkDelete(bookmarkId, { closeModalAfterDelete = false } = {}) {
		const bookmark = getBookmarkById(bookmarkId)
		if (!bookmark) return

		const shouldDelete = await AppUtils.confirmDialog({
			title: 'Usuwanie zakladki',
			message: `Usunac zakladke "${bookmark.label}"?`,
			confirmLabel: 'TAK',
			cancelLabel: 'NIE',
		})

		if (!shouldDelete) return

		if (closeModalAfterDelete) {
			closeBookmarkModal()
		}

		bookmarks = bookmarks.filter(entry => entry.id !== bookmarkId)
		saveBookmarks()
		renderBookmarks()
	}

	function handleBookmarkEdit(bookmarkId) {
		const bookmark = getBookmarkById(bookmarkId)
		if (!bookmark) return

		openBookmarkModal('edit', bookmark)
	}

	bookmarkList.addEventListener('click', event => {
		const addButton = event.target.closest('[data-bookmark-add]')
		if (addButton) {
			void handleAddBookmarkClick()
			return
		}

		const bookmarkLink = event.target.closest('.dashboard-bookmark-tab-main')
		if (bookmarkLink && event.detail > 0) {
			window.setTimeout(() => bookmarkLink.blur(), 0)
			return
		}

		const actionButton = event.target.closest('[data-bookmark-action]')
		if (!actionButton) return

		const bookmarkId = actionButton.dataset.bookmarkId
		if (!bookmarkId) return

		if (actionButton.dataset.bookmarkAction === 'edit') {
			handleBookmarkEdit(bookmarkId)
		}
	})

	if ('ResizeObserver' in window) {
		new ResizeObserver(scheduleBookmarkTabDensityUpdate).observe(bookmarkList)
	} else {
		window.addEventListener('resize', scheduleBookmarkTabDensityUpdate)
	}

	bookmarkModal.addEventListener('click', event => {
		if (event.target.matches('[data-bookmark-close]')) {
			closeBookmarkModal()
		}
	})

	bookmarkCancelBtn?.addEventListener('click', closeBookmarkModal)
	bookmarkDeleteBtn?.addEventListener('click', () => {
		if (!editingBookmarkId) return

		void handleBookmarkDelete(editingBookmarkId, { closeModalAfterDelete: true })
	})

	const syncBookmarkColorTrigger = () => {
		setBookmarkColorValue(
			bookmarkColorInput.value || getCurrentUserDefaultBookmarkColor(),
			getCurrentUserDefaultBookmarkColor(),
		)
		syncSelectedBookmarkIconColor()
	}

	bookmarkColorInput.addEventListener('input', syncBookmarkColorTrigger)
	bookmarkColorInput.addEventListener('change', syncBookmarkColorTrigger)

	bookmarkIconGrid.addEventListener('click', event => {
		const iconButton = event.target.closest('[data-bookmark-icon-option]')
		if (!iconButton) return

		setSelectedBookmarkIcon(iconButton.dataset.bookmarkIconOption || '')
	})

	window.addEventListener('keydown', event => {
		if (event.key === 'Escape' && !bookmarkModal.hidden) {
			closeBookmarkModal()
		}
	})

	bookmarkForm.addEventListener('submit', event => {
		event.preventDefault()

		const currentUser = getCurrentUser()
		if (!currentUser) {
			closeBookmarkModal()
			AppUtils.auth.openAuthModal?.('login')
			return
		}

		const label = String(bookmarkLabelInput?.value || '').trim()
		const url = String(bookmarkUrlInput?.value || '').trim()
		const colorHex = normalizeBookmarkColor(
			bookmarkColorInput?.value || getCurrentUserDefaultBookmarkColor(currentUser),
			getCurrentUserDefaultBookmarkColor(currentUser),
		)
		const iconName = normalizeBookmarkIconName(bookmarkIconInput?.value || '')

		if (!label || !url) {
			AppUtils.notify({
				type: 'warning',
				title: 'Brak danych',
				message: 'Wpisz nazwe zakladki i adres lub sciezke.',
			})
			return
		}

		const normalizedUrl = normalizeLinkTarget(url)
		if (!normalizedUrl) {
			AppUtils.notify({
				type: 'error',
				title: 'Niepoprawny adres',
				message: 'Wpisz poprawny adres lub sciezke.',
			})
			return
		}

		const now = new Date().toISOString()

		if (editingBookmarkId) {
			bookmarks = bookmarks.map(bookmark =>
				bookmark.id === editingBookmarkId
					? {
							...bookmark,
							label,
							url,
							colorHex,
							iconName,
							updatedAt: now,
						}
					: bookmark,
			)
		} else {
			bookmarks.unshift({
				id: createBookmarkId(),
				userId: currentUser.id,
				label,
				url,
				colorHex,
				iconName,
				createdAt: now,
				updatedAt: now,
			})
		}

		saveBookmarks()

		if (authService?.updateProfile && currentUser.bookmarkDefaultColor !== colorHex) {
			try {
				authService.updateProfile({
					...currentUser,
					bookmarkDefaultColor: colorHex,
				})
			} catch (error) {
				AppUtils.notify({
					type: 'warning',
					title: 'Zakladka zapisana',
					message:
						error instanceof Error
							? `Kolor domyslny konta nie zostal zapisany: ${error.message}`
							: 'Kolor domyslny konta nie zostal zapisany.',
				})
			}
		}

		renderBookmarks()
		closeBookmarkModal()
	})

	document.addEventListener('app-auth-changed', () => {
		bookmarks = loadBookmarks()
		if (!bookmarkModal.hidden) {
			setBookmarkColorValue(
				bookmarkColorInput.value || getCurrentUserDefaultBookmarkColor(),
				getCurrentUserDefaultBookmarkColor(),
			)
			setSelectedBookmarkIcon(bookmarkIconInput.value || '')
		}
		renderBookmarks()
		if (!AppUtils.auth.isAuthenticated() && !bookmarkModal.hidden) {
			closeBookmarkModal()
		}
	})

	setBookmarkColorValue(getCurrentUserDefaultBookmarkColor())
	setSelectedBookmarkIcon('')
	renderBookmarks()
})
