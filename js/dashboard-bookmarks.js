document.addEventListener('DOMContentLoaded', () => {
	const bookmarkList = document.getElementById('dashboard-bookmarks-list')
	const addBookmarkBtn = document.getElementById('dashboard-bookmark-add-btn')
	const bookmarkModal = document.getElementById('dashboard-bookmark-modal')
	const bookmarkForm = document.getElementById('dashboard-bookmark-form')
	const bookmarkLabelInput = document.getElementById('dashboard-bookmark-label')
	const bookmarkUrlInput = document.getElementById('dashboard-bookmark-url')
	const bookmarkDescriptionInput = document.getElementById('dashboard-bookmark-description')
	const bookmarkSubmitBtn = document.getElementById('dashboard-bookmark-submit-btn')
	const bookmarkModalTitle = document.getElementById('dashboard-bookmark-modal-title')
	const bookmarkModalText = document.getElementById('dashboard-bookmark-modal-text')
	const bookmarkCancelBtn = document.getElementById('dashboard-bookmark-cancel-btn')

	if (!bookmarkList || !addBookmarkBtn || !bookmarkModal || !bookmarkForm) {
		return
	}

	const bookmarksService = window.AppServices?.bookmarksService
	const escapeHtml = AppUtils.escapeHtml
	let editingBookmarkId = null
	let bookmarks = loadBookmarks()

	function loadBookmarks() {
		const storedBookmarks = bookmarksService?.getAll?.() || []
		return Array.isArray(storedBookmarks) ? storedBookmarks.map(normalizeBookmarkRecord) : []
	}

	function normalizeBookmarkRecord(record) {
		return {
			id: String(record.id || ''),
			userId: String(record.userId || ''),
			label: String(record.label || '').trim(),
			url: String(record.url || '').trim(),
			description: String(record.description || '').trim(),
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
			return `file://${trimmedValue.replace(/\\/g, '/')}`
		}

		if (/^[a-zA-Z]:\\/.test(trimmedValue)) {
			return `file:///${trimmedValue.replace(/\\/g, '/')}`
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
				`https://www.google.com/s2/favicons?domain_url=${encodeURIComponent(parsedUrl.origin)}&sz=64`,
				`https://icons.duckduckgo.com/ip3/${parsedUrl.hostname}.ico`,
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
				return
			}
		})
	}

	function resetBookmarkForm() {
		editingBookmarkId = null
		bookmarkForm.reset()

		if (bookmarkModalTitle) {
			bookmarkModalTitle.textContent = 'Dodaj zakladke'
		}

		if (bookmarkModalText) {
			bookmarkModalText.textContent = 'Zapisz szybki link tylko dla swojego konta.'
		}

		if (bookmarkSubmitBtn) {
			bookmarkSubmitBtn.textContent = 'Zapisz zakladke'
		}
	}

	function openBookmarkModal(mode = 'create', bookmark = null) {
		resetBookmarkForm()

		if (mode === 'edit' && bookmark) {
			editingBookmarkId = bookmark.id
			bookmarkLabelInput.value = bookmark.label
			bookmarkUrlInput.value = bookmark.url
			bookmarkDescriptionInput.value = bookmark.description

			if (bookmarkModalTitle) {
				bookmarkModalTitle.textContent = 'Edytuj zakladke'
			}

			if (bookmarkModalText) {
				bookmarkModalText.textContent = 'Zmien nazwe, adres lub opis tego skrotu.'
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

	function renderBookmarks() {
		const currentUser = getCurrentUser()
		const userBookmarks = getCurrentUserBookmarks()

		addBookmarkBtn.disabled = false

		if (!currentUser) {
			addBookmarkBtn.innerHTML = '<i class="fa-solid fa-right-to-bracket"></i><span>Zaloguj sie, aby dodawac</span>'
			bookmarkList.innerHTML = `
				<article class="dashboard-bookmark-empty">
					<div class="dashboard-bookmark-empty-icon">
						<i class="fa-solid fa-user-lock"></i>
					</div>
					<div class="dashboard-bookmark-empty-copy">
						<strong>Zaloguj sie, aby uruchomic pasek zakladek</strong>
						<p>Po zalogowaniu przypniesz tutaj swoje linki i pliki.</p>
					</div>
				</article>
			`
			return
		}

		addBookmarkBtn.innerHTML = '<i class="fa-solid fa-bookmark"></i><span>Dodaj zakladke</span>'

		if (userBookmarks.length === 0) {
			bookmarkList.innerHTML = `
				<article class="dashboard-bookmark-empty">
					<div class="dashboard-bookmark-empty-icon">
						<i class="fa-solid fa-bookmark"></i>
					</div>
					<div class="dashboard-bookmark-empty-copy">
						<strong>Dodaj pierwszy element do paska</strong>
						<p>Przypnij SharePoint, raport albo lokalny plik.</p>
					</div>
				</article>
			`
			return
		}

		bookmarkList.innerHTML = userBookmarks
			.map(bookmark => {
				const href = normalizeLinkTarget(bookmark.url)
				const description = escapeHtml(bookmark.description || 'Prywatny skrot zapisany dla Twojego konta.')
				const metaLabel = escapeHtml(getBookmarkMetaLabel(bookmark))
				const faviconSources = getBookmarkFaviconSources(bookmark)
				const initialFaviconUrl = escapeHtml(faviconSources[0] || '')
				const fallbackFaviconSources = escapeHtml(faviconSources.slice(1).join('||'))
				const label = escapeHtml(bookmark.label)
				const safeHref = escapeHtml(href)
				return `
					<article class="dashboard-bookmark-tab" data-bookmark-id="${bookmark.id}">
						<a class="dashboard-bookmark-tab-main" href="${safeHref}" target="_blank" rel="noopener noreferrer" title="${description}">
							<span class="dashboard-bookmark-icon${initialFaviconUrl ? '' : ' is-fallback'}" data-bookmark-icon>
								${initialFaviconUrl ? `<img class="dashboard-bookmark-favicon" src="${initialFaviconUrl}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer" data-bookmark-favicon data-favicon-sources="${fallbackFaviconSources}">` : ''}
								<i class="fa-solid fa-bookmark" aria-hidden="true"></i>
							</span>
							<span class="dashboard-bookmark-tab-copy">
								<strong>${label}</strong>
								<span class="dashboard-bookmark-meta">${metaLabel}</span>
							</span>
						</a>
						<div class="dashboard-bookmark-actions">
							<button type="button" class="dashboard-bookmark-icon-btn" data-bookmark-action="edit" data-bookmark-id="${bookmark.id}" aria-label="Edytuj zakladke">
								<i class="fa-solid fa-pen"></i>
							</button>
							<button type="button" class="dashboard-bookmark-icon-btn is-danger" data-bookmark-action="delete" data-bookmark-id="${bookmark.id}" aria-label="Usun zakladke">
								<i class="fa-solid fa-trash"></i>
							</button>
						</div>
					</article>
				`
			})
			.join('')

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

	addBookmarkBtn.addEventListener('click', () => {
		void handleAddBookmarkClick()
	})

	bookmarkList.addEventListener('click', event => {
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
							updatedAt: now,
					  }
					: bookmark
			)
		} else {
			bookmarks.unshift({
				id: createBookmarkId(),
				userId: currentUser.id,
				label,
				url,
				description,
				createdAt: now,
				updatedAt: now,
			})
		}

		saveBookmarks()
		renderBookmarks()
		closeBookmarkModal()
	})

	document.addEventListener('app-auth-changed', () => {
		renderBookmarks()
		if (!AppUtils.auth.isAuthenticated() && !bookmarkModal.hidden) {
			closeBookmarkModal()
		}
	})

	renderBookmarks()
})
