document.addEventListener('DOMContentLoaded', () => {
	const testersService = window.AppServices?.testersService
	const storageService = window.AppServices?.storageService
	const testersDomainConfig = window.AppServices?.testersDomainConfig
	const escapeHtml = window.AppUtils?.escapeHtml
	const formatDateTimeLabel = window.AppUtils?.formatDateTimeLabel
	const createAvatarMarkup = window.AppUtils?.createAvatarMarkup

	const summary = document.getElementById('tester-board-summary')
	const feedback = document.getElementById('tester-feedback')
	const authCallout = document.getElementById('tester-auth-callout')
	const authTitle = document.getElementById('tester-auth-title')
	const authText = document.getElementById('tester-auth-text')
	const authBtn = document.getElementById('tester-auth-btn')
	const authorNameInput = document.getElementById('tester-author-name')
	const areaInput = document.getElementById('tester-area')
	const categorySelect = document.getElementById('tester-category')
	const severitySelect = document.getElementById('tester-severity')
	const messageInput = document.getElementById('tester-message')
	const entryForm = document.getElementById('tester-entry-form')
	const submitBtn = document.getElementById('tester-submit-btn')
	const resetBtn = document.getElementById('tester-reset-btn')
	const entriesList = document.getElementById('tester-entries-list')
	const refreshBtn = document.getElementById('tester-refresh-btn')
	const severityFilter = document.getElementById('tester-severity-filter')
	const storageStatus = document.getElementById('tester-storage-status')
	const totalStat = document.getElementById('tester-stat-total')
	const criticalStat = document.getElementById('tester-stat-critical')
	const updatedStat = document.getElementById('tester-stat-updated')
	const guestStat = document.getElementById('tester-stat-guest')
	const areaStat = document.getElementById('tester-stat-area')
	const topSeverityStat = document.getElementById('tester-stat-top-severity')

	if (
		!testersService ||
		!storageService ||
		!testersDomainConfig ||
		typeof escapeHtml !== 'function' ||
		typeof formatDateTimeLabel !== 'function' ||
		!summary ||
		!feedback ||
		!authCallout ||
		!authTitle ||
		!authText ||
		!authBtn ||
		!authorNameInput ||
		!areaInput ||
		!categorySelect ||
		!severitySelect ||
		!messageInput ||
		!entryForm ||
		!submitBtn ||
		!resetBtn ||
		!entriesList ||
		!refreshBtn ||
		!severityFilter ||
		!storageStatus ||
		!totalStat ||
		!criticalStat ||
		!updatedStat ||
		!guestStat ||
		!areaStat ||
		!topSeverityStat
	) {
		console.error('Tester feedback page is missing required services or elements.')
		return
	}

	const CATEGORY_META = testersDomainConfig.CATEGORY_META || {}
	const SEVERITY_META = testersDomainConfig.SEVERITY_META || {}
	const state = {
		entries: [],
		feedbackTimeoutId: null,
	}
	const formControls = Array.from(entryForm.querySelectorAll('input, textarea, select, button'))

	const renderMultilineText = value => escapeHtml(value).replace(/\n/g, '<br>')
	const getCurrentUser = () => window.AppUtils?.auth?.getCurrentUser?.() || null
	const openAuthModal = mode => window.AppUtils?.auth?.openAuthModal?.(mode)
	const openProfileModal = () => window.AppUtils?.auth?.openProfileModal?.()

	function getCategoryMeta(category) {
		return CATEGORY_META[category] || CATEGORY_META.bug || { label: 'Bug', className: 'is-category-bug' }
	}

	function getSeverityMeta(severity) {
		return SEVERITY_META[severity] || SEVERITY_META.medium || { label: 'Sredni', className: 'is-severity-medium' }
	}

	function showFeedbackMessage(message, type = 'info') {
		if (state.feedbackTimeoutId) {
			window.clearTimeout(state.feedbackTimeoutId)
			state.feedbackTimeoutId = null
		}

		feedback.textContent = message
		feedback.className = `tester-feedback is-${type}`

		state.feedbackTimeoutId = window.setTimeout(() => {
			feedback.className = 'tester-feedback is-hidden'
			feedback.textContent = ''
		}, 4200)
	}

	function renderStorageStatus() {
		if (storageService.isRemoteEnabled()) {
			storageStatus.innerHTML = `
				<strong>Wspolny zapis serwerowy jest aktywny</strong>
				<p>Nowe wpisy trafiaja do wspolnej tablicy i sa zapisywane w bazie PostgreSQL.</p>
			`
			return
		}

		storageStatus.innerHTML = `
			<strong>Tryb lokalny tej przegladarki</strong>
			<p>Backend API nie jest teraz dostepny, wiec wpisy zapisuja sie tylko lokalnie w tej przegladarce.</p>
		`
	}

	function syncAuthorField() {
		const currentUser = getCurrentUser()
		if (currentUser) {
			authorNameInput.value = String(currentUser.fullName || currentUser.login || '').trim()
			authorNameInput.readOnly = true
			authorNameInput.setAttribute('aria-readonly', 'true')
			authorNameInput.title = 'Zalogowany uzytkownik jest podpisywany automatycznie.'
			return
		}

		authorNameInput.readOnly = false
		authorNameInput.removeAttribute('aria-readonly')
		authorNameInput.removeAttribute('title')
		if (!authorNameInput.value.trim()) {
			authorNameInput.value = ''
		}
	}

	function setComposerDisabled(isDisabled) {
		entryForm.classList.toggle('is-locked', isDisabled)
		entryForm.setAttribute('aria-disabled', String(isDisabled))
		formControls.forEach(control => {
			control.disabled = isDisabled
		})
	}

	function renderAuthState() {
		const currentUser = getCurrentUser()
		if (currentUser) {
			authCallout.classList.add('is-active-user')
			authTitle.textContent = `Dodajesz wpis jako ${currentUser.fullName || `@${currentUser.login}`}`
			authText.textContent = 'Masz aktywna sesje, wiec mozesz zapisywac nowe uwagi po testach na wspolnej tablicy.'
			authBtn.innerHTML = '<i class="fa-solid fa-user-gear"></i><span>Otworz profil</span>'
			authBtn.dataset.action = 'profile'
			setComposerDisabled(false)
			syncAuthorField()
			return
		}

		authCallout.classList.remove('is-active-user')
		authTitle.textContent = 'Podglad tablicy jest dostepny dla wszystkich'
		authText.textContent = 'Aby dodac nowa uwage, zaloguj sie. Goscie moga tylko przegladac zapisane rekordy.'
		authBtn.innerHTML = '<i class="fa-solid fa-right-to-bracket"></i><span>Zaloguj sie</span>'
		authBtn.dataset.action = 'login'
		setComposerDisabled(true)
		authorNameInput.value = ''
		authorNameInput.placeholder = 'Zaloguj sie, aby dodac wpis'
	}

	function getFilteredEntries() {
		const filterValue = String(severityFilter.value || 'all')
		if (filterValue === 'all') return state.entries
		return state.entries.filter(entry => entry.severity === filterValue)
	}

	function renderEmptyState() {
		entriesList.innerHTML = `
			<div class="tester-empty-state">
				<div class="tester-empty-icon">
					<i class="fa-solid fa-clipboard-list"></i>
				</div>
				<h4>Brak wpisow w tym widoku</h4>
				<p>Dodaj pierwsza uwage po testach albo zmien filtr, aby zobaczyc zapisane rekordy.</p>
			</div>
		`
	}

	function renderEntries() {
		const filteredEntries = getFilteredEntries()
		if (filteredEntries.length === 0) {
			renderEmptyState()
			return
		}

		entriesList.innerHTML = filteredEntries
			.map(entry => {
				const categoryMeta = getCategoryMeta(entry.category)
				const severityMeta = getSeverityMeta(entry.severity)
				const avatarMarkup =
					typeof createAvatarMarkup === 'function'
						? createAvatarMarkup({
								fullName: entry.authorName,
								avatarId: entry.authorAvatarId || 'blue',
								avatarImage: entry.authorAvatarImage || '',
								extraClass: 'tester-entry-avatar',
							})
						: `<span class="tester-entry-avatar">${escapeHtml(String(entry.authorName || '?').slice(0, 1).toUpperCase())}</span>`
				const areaMarkup = entry.area
					? `<span class="tester-entry-inline-meta"><i class="fa-solid fa-layer-group" aria-hidden="true"></i><span>${escapeHtml(entry.area)}</span></span>`
					: `<span class="tester-entry-inline-meta is-muted"><i class="fa-solid fa-circle-info" aria-hidden="true"></i><span>Bez wskazanego obszaru</span></span>`
				const authorSourceLabel = entry.authorId ? 'konto' : 'gosc'

				return `
					<article class="tester-entry-card ${severityMeta.className}">
						<div class="tester-entry-head">
							<div class="tester-entry-author">
								${avatarMarkup}
								<div class="tester-entry-author-copy">
									<strong>${escapeHtml(entry.authorName)}</strong>
									<p>${authorSourceLabel} • ${formatDateTimeLabel(entry.updatedAt)}</p>
								</div>
							</div>

							<div class="tester-entry-tags">
								<span class="tester-entry-tag ${categoryMeta.className}">${escapeHtml(categoryMeta.label)}</span>
								<span class="tester-entry-tag ${severityMeta.className}">${escapeHtml(severityMeta.label)}</span>
							</div>
						</div>

						<div class="tester-entry-body">
							<p>${renderMultilineText(entry.message)}</p>
						</div>

						<div class="tester-entry-footer">
							${areaMarkup}
							<span class="tester-entry-inline-meta"><i class="fa-regular fa-clock" aria-hidden="true"></i><span>Dodano ${formatDateTimeLabel(entry.createdAt)}</span></span>
						</div>
					</article>
				`
			})
			.join('')
	}

	function renderSummary() {
		const totalEntries = state.entries.length
		const criticalEntries = state.entries.filter(entry => entry.severity === 'critical').length
		const guestEntries = state.entries.filter(entry => !entry.authorId).length
		const entriesWithArea = state.entries.filter(entry => entry.area).length
		const topSeverityEntry = state.entries
			.slice()
			.sort((leftEntry, rightEntry) => {
				const leftOrder = (getSeverityMeta(leftEntry.severity).order ?? 99)
				const rightOrder = (getSeverityMeta(rightEntry.severity).order ?? 99)
				return leftOrder - rightOrder
			})[0]

		totalStat.textContent = String(totalEntries)
		criticalStat.textContent = String(criticalEntries)
		guestStat.textContent = String(guestEntries)
		areaStat.textContent = String(entriesWithArea)
		topSeverityStat.textContent = totalEntries ? getSeverityMeta(topSeverityEntry?.severity).label : '--'
		updatedStat.textContent = totalEntries ? formatDateTimeLabel(state.entries[0].updatedAt) : '--'

		if (totalEntries === 0) {
			summary.textContent = 'Tablica jest jeszcze pusta. Dodaj pierwsza uwage po testach i zapisz ja dla calego zespolu.'
			return
		}

		summary.textContent = `Na tablicy sa ${totalEntries} wpisy, w tym ${criticalEntries} krytyczne. Ostatni zapis widziany na tej stronie: ${formatDateTimeLabel(state.entries[0].updatedAt)}.`
	}

	function renderBoard() {
		renderSummary()
		renderEntries()
	}

	function reloadEntries() {
		state.entries = testersService.getEntries()
		renderBoard()
	}

	function resetComposer() {
		entryForm.reset()
		syncAuthorField()
		severitySelect.value = 'high'
		categorySelect.value = 'bug'
	}

	entryForm.addEventListener('submit', event => {
		event.preventDefault()
		const currentUser = getCurrentUser()
		if (!currentUser) {
			showFeedbackMessage('Musisz byc zalogowany, aby dodac uwage testerow.', 'error')
			openAuthModal('login')
			return
		}

		try {
			submitBtn.disabled = true
			testersService.createEntry({
				authorName: authorNameInput.value,
				area: areaInput.value,
				category: categorySelect.value,
				severity: severitySelect.value,
				message: messageInput.value,
				actor: currentUser,
			})
			reloadEntries()
			resetComposer()
			showFeedbackMessage('Uwaga zostala zapisana i jest widoczna dla wszystkich.', 'success')
		} catch (error) {
			showFeedbackMessage(error?.message || 'Nie udalo sie zapisac wpisu testerow.', 'error')
		} finally {
			submitBtn.disabled = false
		}
	})

	authBtn.addEventListener('click', () => {
		if (authBtn.dataset.action === 'profile') {
			openProfileModal()
			return
		}

		openAuthModal('login')
	})

	resetBtn.addEventListener('click', () => {
		window.setTimeout(() => {
			syncAuthorField()
			showFeedbackMessage('Formularz zostal wyczyszczony.', 'info')
		}, 0)
	})

	severityFilter.addEventListener('change', renderEntries)
	refreshBtn.addEventListener('click', () => {
		reloadEntries()
		showFeedbackMessage('Widok wpisow zostal odswiezony.', 'info')
	})

	window.addEventListener('focus', reloadEntries)
	document.addEventListener('visibilitychange', () => {
		if (document.visibilityState === 'visible') {
			reloadEntries()
		}
	})

	document.addEventListener('app-auth-changed', () => {
		renderAuthState()
		reloadEntries()
	})

	window.addEventListener('storage', event => {
		if (event.key === window.AppUtils?.config?.STORAGE_KEYS?.TESTER_FEEDBACK) {
			reloadEntries()
		}
	})

	window.setInterval(reloadEntries, 30000)

	renderStorageStatus()
	renderAuthState()
	reloadEntries()
})
