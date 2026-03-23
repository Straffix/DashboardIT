document.addEventListener('DOMContentLoaded', () => {
	const bookmarkList = document.getElementById('dashboard-bookmarks-list')
	const bookmarkSummary = document.getElementById('dashboard-bookmarks-summary')
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

	if (!bookmarkList || !bookmarkSummary || !addBookmarkBtn || !bookmarkModal || !bookmarkForm) {
		return
	}

	const STORAGE_KEY = AppUtils.config.STORAGE_KEYS.BOOKMARKS
	let editingBookmarkId = null
	let bookmarks = loadBookmarks()

	function loadBookmarks() {
		try {
			const storedBookmarks = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
			return Array.isArray(storedBookmarks) ? storedBookmarks.map(normalizeBookmarkRecord) : []
		} catch (error) {
			return []
		}
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
		localStorage.setItem(STORAGE_KEY, JSON.stringify(bookmarks))
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

	function escapeHtml(value) {
		return String(value || '')
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;')
			.replace(/'/g, '&#39;')
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
			bookmarkSummary.textContent =
				'Po zalogowaniu zobaczysz swoje prywatne skroty do SharePointa, raportow i plikow.'
			addBookmarkBtn.innerHTML = '<i class="fa-solid fa-right-to-bracket"></i><span>Zaloguj sie, aby dodawac</span>'
			bookmarkList.innerHTML = `
				<article class="dashboard-bookmark-empty">
					<div class="dashboard-bookmark-empty-icon">
						<i class="fa-solid fa-user-lock"></i>
					</div>
					<div class="dashboard-bookmark-empty-copy">
						<strong>Prywatne zakladki sa powiazane z kontem</strong>
						<p>Zaloguj sie z panelu uzytkownika w prawym gornym rogu, a potem przypnij tutaj swoje najwazniejsze linki.</p>
					</div>
				</article>
			`
			return
		}

		addBookmarkBtn.innerHTML = '<i class="fa-solid fa-bookmark"></i><span>Dodaj zakladke</span>'
		bookmarkSummary.textContent =
			userBookmarks.length > 0
				? `Masz zapisane ${userBookmarks.length} prywatnych ${userBookmarks.length === 1 ? 'zakladke' : 'zakladek'} dla konta @${currentUser.login}.`
				: `Nie masz jeszcze prywatnych zakladek dla konta @${currentUser.login}.`

		if (userBookmarks.length === 0) {
			bookmarkList.innerHTML = `
				<article class="dashboard-bookmark-empty">
					<div class="dashboard-bookmark-empty-icon">
						<i class="fa-solid fa-bookmark"></i>
					</div>
					<div class="dashboard-bookmark-empty-copy">
						<strong>Dodaj pierwszy szybki skrot</strong>
						<p>Moze to byc SharePoint, raport, plik xlsx albo lokalna sciezka do najwazniejszych materialow.</p>
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
				const label = escapeHtml(bookmark.label)
				const safeHref = escapeHtml(href)
				return `
					<article class="dashboard-bookmark-card" data-bookmark-id="${bookmark.id}">
						<div class="dashboard-bookmark-card-copy">
							<div class="dashboard-bookmark-card-top">
								<span class="dashboard-bookmark-icon">
									<i class="fa-solid fa-bookmark"></i>
								</span>
								<div>
									<strong>${label}</strong>
									<p>${description}</p>
								</div>
							</div>
							<div class="dashboard-bookmark-meta">${metaLabel}</div>
						</div>
						<div class="dashboard-bookmark-actions">
							<a class="dashboard-bookmark-open-btn" href="${safeHref}" target="_blank" rel="noopener noreferrer">
								<i class="fa-solid fa-arrow-up-right-from-square"></i>
								<span>Otworz</span>
							</a>
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
