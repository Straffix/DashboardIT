document.addEventListener('DOMContentLoaded', () => {
	const bookmarkList = document.getElementById('dashboard-bookmarks-list')
	const bookmarkModal = document.getElementById('dashboard-bookmark-modal')
	const bookmarkForm = document.getElementById('dashboard-bookmark-form')
	const bookmarkPanel = document.querySelector('.dashboard-bookmarks-panel')
	const bookmarkModalCard = bookmarkModal.querySelector('.dashboard-bookmark-modal-card')
	const bookmarkLabelInput = document.getElementById('dashboard-bookmark-label')
	const bookmarkUrlInput = document.getElementById('dashboard-bookmark-url')
	const bookmarkDescriptionInput = document.getElementById('dashboard-bookmark-description')
	const bookmarkColorInput = document.getElementById('dashboard-bookmark-color')
	const bookmarkIconInput = document.getElementById('dashboard-bookmark-icon')
	const bookmarkIconGrid = document.getElementById('dashboard-bookmark-icon-grid')
	const bookmarkSubmitBtn = document.getElementById('dashboard-bookmark-submit-btn')
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

	function normalizeBookmarkIconName(value) {
		const normalizedValue = String(value || '')
			.trim()
			.toLowerCase()
		return BOOKMARK_ICON_IDS.has(normalizedValue) ? normalizedValue : ''
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
		const normalizedIconName = normalizeBookmarkIconName(iconName)
		return normalizedIconName ? BOOKMARK_ICON_ASSET_PATHS[normalizedIconName] || `img/ico/${normalizedIconName}.svg` : ''
	}

	function getBookmarkAccentRgb(colorHex) {
		const normalizedColor = normalizeBookmarkColor(colorHex)
		const red = Number.parseInt(normalizedColor.slice(1, 3), 16)
		const green = Number.parseInt(normalizedColor.slice(3, 5), 16)
		const blue = Number.parseInt(normalizedColor.slice(5, 7), 16)
		return `${red}, ${green}, ${blue}`
	}

	function buildBookmarkStyle(colorHex) {
		const normalizedColor = normalizeBookmarkColor(colorHex)
		return `--bookmark-accent:${normalizedColor};--bookmark-accent-rgb:${getBookmarkAccentRgb(normalizedColor)};`
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

		return `<img class="${className}" src="${escapeHtml(encodeURI(iconUrl))}" alt="" loading="lazy" decoding="async" aria-hidden="true">`
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

	function getBookmarkMetaLabel(bookmark) {
		const normalizedTarget = normalizeLinkTarget(bookmark.url)

		try {
			const parsedUrl = new URL(normalizedTarget)
			if (parsedUrl.protocol === 'file:') {
				return bookmark.url
			}

			return parsedUrl.hostname.replace(/^www\./i, '')
		} catch (error) {
			return bookmark.url
		}
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
		bookmarkIconInput.value = normalizedIconName

		bookmarkIconGrid.innerHTML = BOOKMARK_ICON_OPTIONS.map(option => {
			const isActive = option.id === normalizedIconName || (!option.id && !normalizedIconName)
			const previewMarkup = option.id
				? buildBookmarkAssetIconMarkup(option.id, 'dashboard-bookmark-option-asset')
				: '<i class="app-icon bookmark-solid-full" aria-hidden="true"></i>'
			const optionLabel = [option.label, option.hint].filter(Boolean).join(' - ')

			return `
				<button
					type="button"
					class="dashboard-bookmark-icon-choice${isActive ? ' is-active' : ''}"
					data-bookmark-icon-option="${option.id}"
					aria-pressed="${String(isActive)}"
					aria-label="${escapeHtml(optionLabel)}"
					title="${escapeHtml(optionLabel)}"
				>
					<span class="dashboard-bookmark-icon-choice-preview">${previewMarkup}</span>
				</button>
			`
		}).join('')
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
			bookmarkDescriptionInput.value = bookmark.description
			setBookmarkColorValue(bookmarkColor)
			setSelectedBookmarkIcon(bookmark.iconName)

			if (bookmarkModalTitle) {
				bookmarkModalTitle.textContent = 'Edytuj zakladke'
			}

			if (bookmarkSubmitBtn) {
				bookmarkSubmitBtn.textContent = 'Zapisz zmiany'
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
		const label = isAuthenticated ? 'Dodaj zakladke' : 'Zaloguj sie, aby dodawac zakladki'
		return `
			<button
				type="button"
				class="dashboard-bookmark-add-tile"
				data-bookmark-add
				aria-label="${label}"
				title="${label}"
			>
				<i class="app-icon plus-solid-full" aria-hidden="true"></i>
			</button>
		`
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
			return
		}

		if (userBookmarks.length === 0) {
			bookmarkList.innerHTML = addBookmarkMarkup
			setBookmarkPanelVisibility(true)
			return
		}

		setBookmarkPanelVisibility(true)

		bookmarkList.innerHTML =
			userBookmarks
			.map(bookmark => {
				const href = normalizeLinkTarget(bookmark.url)
				const description = escapeHtml(bookmark.description || 'Prywatny skrot zapisany dla Twojego konta.')
				const metaLabel = escapeHtml(getBookmarkMetaLabel(bookmark))
				const faviconSources = getBookmarkFaviconSources(bookmark)
				const initialFaviconUrl = escapeHtml(faviconSources[0] || '')
				const fallbackFaviconSources = escapeHtml(faviconSources.slice(1).join('||'))
				const label = escapeHtml(bookmark.label)
				const safeHref = escapeHtml(href)
				const bookmarkColor = resolveBookmarkColor(bookmark, userDefaultColor)
				const customIconName = normalizeBookmarkIconName(bookmark.iconName)
				const iconClassName = customIconName
					? 'dashboard-bookmark-icon has-custom-icon'
					: `dashboard-bookmark-icon${initialFaviconUrl ? '' : ' is-fallback'}`

				return `
					<article class="dashboard-bookmark-tab" data-bookmark-id="${bookmark.id}">
						<a class="dashboard-bookmark-tab-main" href="${safeHref}" rel="noopener noreferrer" title="${description}" style="${buildBookmarkStyle(bookmarkColor)}">
							<span class="${iconClassName}" data-bookmark-icon>
								${customIconName ? buildBookmarkAssetIconMarkup(customIconName) : initialFaviconUrl ? `<img class="dashboard-bookmark-favicon" src="${initialFaviconUrl}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer" data-bookmark-favicon data-favicon-sources="${fallbackFaviconSources}">` : ''}
								<i class="app-icon bookmark-solid-full" aria-hidden="true"></i>
							</span>
							<span class="dashboard-bookmark-tab-copy">
								<strong>${label}</strong>
								<span class="dashboard-bookmark-meta">${metaLabel}</span>
							</span>
						</a>
						<div class="dashboard-bookmark-actions">
							<button type="button" class="dashboard-bookmark-icon-btn" data-bookmark-action="edit" data-bookmark-id="${bookmark.id}" aria-label="Edytuj zakladke">
								<i class="app-icon pen-solid-full"></i>
							</button>
							<button type="button" class="dashboard-bookmark-icon-btn is-danger" data-bookmark-action="delete" data-bookmark-id="${bookmark.id}" aria-label="Usun zakladke">
								<i class="app-icon trash-solid-full"></i>
							</button>
						</div>
					</article>
				`
			})
			.join('') + addBookmarkMarkup

		enhanceBookmarkFavicons()
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

	async function handleBookmarkDelete(bookmarkId) {
		const bookmark = getBookmarkById(bookmarkId)
		if (!bookmark) return

		const shouldDelete = await AppUtils.confirmDialog({
			title: 'Usuwanie zakladki',
			message: `Usunac zakladke "${bookmark.label}"?`,
			confirmLabel: 'TAK',
			cancelLabel: 'NIE',
		})

		if (!shouldDelete) return

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

		const actionButton = event.target.closest('[data-bookmark-action]')
		if (!actionButton) return

		const bookmarkId = actionButton.dataset.bookmarkId
		if (!bookmarkId) return

		if (actionButton.dataset.bookmarkAction === 'edit') {
			handleBookmarkEdit(bookmarkId)
		}

		if (actionButton.dataset.bookmarkAction === 'delete') {
			void handleBookmarkDelete(bookmarkId)
		}
	})

	bookmarkModal.addEventListener('click', event => {
		if (event.target.matches('[data-bookmark-close]')) {
			closeBookmarkModal()
		}
	})

	bookmarkCancelBtn?.addEventListener('click', closeBookmarkModal)

	const syncBookmarkColorTrigger = () => {
		setBookmarkColorValue(bookmarkColorInput.value || getCurrentUserDefaultBookmarkColor(), getCurrentUserDefaultBookmarkColor())
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
		const description = String(bookmarkDescriptionInput?.value || '').trim()
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
							description,
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
				description,
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
