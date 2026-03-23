document.addEventListener('DOMContentLoaded', () => {
	const TIME_SLOTS = ['11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00']
	const MAX_CAPACITY_PER_SLOT = 4
	const STORAGE_KEY = AppUtils.config.STORAGE_KEYS.LUNCH
	const USERS_STORAGE_KEY = AppUtils.config.STORAGE_KEYS.USERS

	const dateInput = document.getElementById('lunch-date')
	const todayBtn = document.getElementById('lunch-today-btn')
	const slotGrid = document.getElementById('lunch-slot-grid')
	const daySummary = document.getElementById('lunch-day-summary')
	const feedback = document.getElementById('lunch-feedback')
	const authCallout = document.getElementById('lunch-auth-callout')
	const authTitle = document.getElementById('lunch-auth-title')
	const authText = document.getElementById('lunch-auth-text')
	const authBtn = document.getElementById('lunch-auth-btn')
	const myReservationBox = document.getElementById('lunch-my-reservation')
	const bookedStat = document.getElementById('lunch-stat-booked')
	const capacityStat = document.getElementById('lunch-stat-capacity')
	const openSlotsStat = document.getElementById('lunch-stat-open-slots')
	const userStat = document.getElementById('lunch-stat-user')
	const userMetaStat = document.getElementById('lunch-stat-user-meta')

	if (
		!dateInput ||
		!todayBtn ||
		!slotGrid ||
		!daySummary ||
		!feedback ||
		!authCallout ||
		!authBtn ||
		!myReservationBox
	) {
		return
	}

	let selectedDate = getTodayDate()
	let feedbackTimeoutId = null

	function getTodayDate() {
		return AppUtils.formatDate(new Date())
	}

	function readJsonStorage(key, fallback = []) {
		try {
			const rawValue = localStorage.getItem(key)
			if (!rawValue) return fallback

			const parsedValue = JSON.parse(rawValue)
			return Array.isArray(parsedValue) ? parsedValue : fallback
		} catch (error) {
			return fallback
		}
	}

	function normalizeReservationRecord(record) {
		const normalizedSlot = TIME_SLOTS.includes(record.timeSlot) ? record.timeSlot : ''
		const normalizedDate = AppUtils.formatDate(record.date)

		return {
			id: String(record.id || ''),
			date: normalizedDate || '',
			timeSlot: normalizedSlot,
			userId: String(record.userId || ''),
			createdAt: record.createdAt || new Date().toISOString(),
			updatedAt: record.updatedAt || record.createdAt || new Date().toISOString(),
			status: record.status === 'cancelled' ? 'cancelled' : 'active',
		}
	}

	const lunchService = {
		loadReservations() {
			return readJsonStorage(STORAGE_KEY).map(normalizeReservationRecord)
		},

		saveReservations(reservations) {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(reservations))
		},

		getReservationsForDate(date) {
			const normalizedDate = AppUtils.formatDate(date)
			return this.loadReservations()
				.filter(reservation => reservation.status === 'active' && reservation.date === normalizedDate)
				.sort((left, right) => {
					const leftSlotIndex = TIME_SLOTS.indexOf(left.timeSlot)
					const rightSlotIndex = TIME_SLOTS.indexOf(right.timeSlot)
					if (leftSlotIndex !== rightSlotIndex) return leftSlotIndex - rightSlotIndex

					const leftTime = Date.parse(left.createdAt) || 0
					const rightTime = Date.parse(right.createdAt) || 0
					return leftTime - rightTime
				})
		},

		getReservationsForSlot(date, timeSlot) {
			return this.getReservationsForDate(date).filter(reservation => reservation.timeSlot === timeSlot)
		},

		getUserReservationForDate(date, userId) {
			return this.getReservationsForDate(date).find(reservation => reservation.userId === String(userId || '')) || null
		},

		// TODO: replace this localStorage implementation with fetch/API calls once backend auth is ready.
		reserveSlot({ date, timeSlot, userId }) {
			const normalizedDate = AppUtils.formatDate(date)
			const normalizedUserId = String(userId || '')
			if (!normalizedUserId) {
				throw new Error('Musisz byc zalogowany, aby zapisac sie na obiad.')
			}

			if (!normalizedDate) {
				throw new Error('Wybierz poprawna date rezerwacji.')
			}

			if (!TIME_SLOTS.includes(timeSlot)) {
				throw new Error('Wybrany slot nie istnieje w harmonogramie.')
			}

			const reservations = this.loadReservations()
			const activeReservations = reservations.filter(
				reservation => reservation.status === 'active' && reservation.date === normalizedDate
			)

			const existingReservation = activeReservations.find(reservation => reservation.userId === normalizedUserId)
			if (existingReservation) {
				if (existingReservation.timeSlot === timeSlot) {
					throw new Error(`Masz juz aktywna rezerwacje na ${timeSlot}.`)
				}

				throw new Error(`Masz juz aktywna rezerwacje na ${existingReservation.timeSlot}. Najpierw ja anuluj.`)
			}

			const activeSlotReservations = activeReservations.filter(reservation => reservation.timeSlot === timeSlot)
			if (activeSlotReservations.length >= MAX_CAPACITY_PER_SLOT) {
				throw new Error(`Slot ${timeSlot} jest juz pelny.`)
			}

			const now = new Date().toISOString()
			const nextReservation = {
				id: `lunch-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
				date: normalizedDate,
				timeSlot,
				userId: normalizedUserId,
				createdAt: now,
				updatedAt: now,
				status: 'active',
			}

			reservations.push(nextReservation)
			this.saveReservations(reservations)
			return nextReservation
		},

		cancelReservation({ reservationId, userId }) {
			const normalizedReservationId = String(reservationId || '')
			const normalizedUserId = String(userId || '')
			const reservations = this.loadReservations()
			const reservationIndex = reservations.findIndex(
				reservation =>
					reservation.id === normalizedReservationId &&
					reservation.userId === normalizedUserId &&
					reservation.status === 'active'
			)

			if (reservationIndex === -1) {
				throw new Error('Nie znaleziono aktywnej rezerwacji do anulowania.')
			}

			reservations[reservationIndex] = {
				...reservations[reservationIndex],
				status: 'cancelled',
				updatedAt: new Date().toISOString(),
			}

			this.saveReservations(reservations)
			return reservations[reservationIndex]
		},
	}

	window.AppServices = window.AppServices || {}
	window.AppServices.lunchService = lunchService

	function getCurrentUser() {
		return AppUtils.auth.getCurrentUser()
	}

	function loadUsers() {
		return readJsonStorage(USERS_STORAGE_KEY)
			.filter(user => user && user.id)
			.map(user => ({
				id: String(user.id),
				fullName: String(user.fullName || '').trim(),
				login: String(user.login || '').trim(),
				role: user.role === 'admin' ? 'admin' : 'user',
			}))
	}

	function getUserById(userId) {
		return loadUsers().find(user => user.id === String(userId || '')) || null
	}

	function getInitials(label) {
		const parts = String(label || '')
			.trim()
			.split(/\s+/)
			.filter(Boolean)
			.slice(0, 2)

		if (parts.length === 0) return 'IT'
		return parts.map(part => part[0]).join('').toUpperCase()
	}

	function escapeHtml(value) {
		return String(value || '')
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;')
			.replace(/'/g, '&#39;')
	}

	function formatDateLabel(date) {
		const parsedDate = AppUtils.parseDate(date)
		if (!parsedDate) return String(date || '')

		return parsedDate.toLocaleDateString('pl-PL', {
			weekday: 'long',
			day: 'numeric',
			month: 'long',
			year: 'numeric',
		})
	}

	function showFeedbackMessage(message, type = 'info') {
		if (feedbackTimeoutId) {
			window.clearTimeout(feedbackTimeoutId)
			feedbackTimeoutId = null
		}

		feedback.textContent = message
		feedback.className = `lunch-feedback is-${type}`

		feedbackTimeoutId = window.setTimeout(() => {
			feedback.className = 'lunch-feedback is-hidden'
			feedback.textContent = ''
		}, 4200)
	}

	function renderAuthCallout(currentUser) {
		if (currentUser) {
			authCallout.classList.add('is-active-user')
			authTitle.textContent = `Pracujesz jako ${currentUser.fullName || `@${currentUser.login}`}`
			authText.textContent =
				'Możesz zapisać się na jeden slot dziennie, anulować własną rezerwację i podejrzeć zajętość wszystkich godzin.'
			authBtn.innerHTML = '<i class="fa-solid fa-user-gear"></i><span>Otworz profil</span>'
			return
		}

		authCallout.classList.remove('is-active-user')
		authTitle.textContent = 'Podglad slotow jest dostepny dla wszystkich'
		authText.textContent =
			'Zaloguj sie, aby zapisac sie na wybrana godzine albo anulowac swoja rezerwacje. Bez logowania widzisz tylko zajetosc slotow.'
		authBtn.innerHTML = '<i class="fa-solid fa-right-to-bracket"></i><span>Zaloguj sie</span>'
	}

	function buildSeatDotsMarkup(count) {
		return Array.from({ length: MAX_CAPACITY_PER_SLOT }, (_, index) => {
			const isFilled = index < count
			return `<span class="lunch-seat-dot${isFilled ? ' is-filled' : ''}"></span>`
		}).join('')
	}

	function buildAttendeeMarkup(reservation, currentUser) {
		const user = getUserById(reservation.userId)
		const displayName = user?.fullName || `Uzytkownik ${reservation.userId}`
		const secondaryLabel = user?.login ? `@${user.login}` : 'konto lokalne'
		const isCurrentUser = currentUser?.id === reservation.userId

		return `
			<li class="lunch-attendee${isCurrentUser ? ' is-current-user' : ''}">
				<span class="lunch-attendee-avatar">${escapeHtml(getInitials(displayName))}</span>
				<div class="lunch-attendee-copy">
					<strong>${escapeHtml(displayName)}</strong>
					<span>${escapeHtml(secondaryLabel)}</span>
				</div>
				${isCurrentUser ? '<span class="lunch-attendee-badge">Ty</span>' : ''}
			</li>
		`
	}

	function getSlotCardActionState(timeSlot, slotReservations, myReservation, currentUser) {
		const isOwnReservation = Boolean(currentUser && slotReservations.some(reservation => reservation.userId === currentUser.id))
		const isFull = slotReservations.length >= MAX_CAPACITY_PER_SLOT
		const hasOtherReservation = Boolean(currentUser && myReservation && myReservation.timeSlot !== timeSlot)

		if (!currentUser) {
			return {
				action: 'login',
				label: isFull ? 'Slot pelny' : 'Zaloguj sie, aby zarezerwowac',
				disabled: isFull,
			}
		}

		if (isOwnReservation) {
			return {
				action: 'cancel',
				label: 'Anuluj moja rezerwacje',
				disabled: false,
			}
		}

		if (hasOtherReservation) {
			return {
				action: 'reserve',
				label: `Masz juz slot ${myReservation.timeSlot}`,
				disabled: true,
			}
		}

		if (isFull) {
			return {
				action: 'reserve',
				label: 'Slot pelny',
				disabled: true,
			}
		}

		return {
			action: 'reserve',
			label: 'Zarezerwuj ten termin',
			disabled: false,
		}
	}

	function renderMyReservation(currentUser, myReservation) {
		if (!currentUser) {
			myReservationBox.innerHTML = `
				<strong>Nie jestes zalogowany</strong>
				<p>Zaloguj sie z panelu uzytkownika, aby wybrac godzine obiadu dla konta lokalnego.</p>
			`
			return
		}

		if (!myReservation) {
			myReservationBox.innerHTML = `
				<strong>Brak aktywnej rezerwacji</strong>
				<p>Na dzien ${escapeHtml(formatDateLabel(selectedDate))} nie masz jeszcze wybranego slotu obiadowego.</p>
			`
			return
		}

		myReservationBox.innerHTML = `
			<strong>${escapeHtml(myReservation.timeSlot)} · ${escapeHtml(formatDateLabel(selectedDate))}</strong>
			<p>Twoj lunch jest zapisany w tym slocie. Mozesz go anulowac z tej karty albo bezposrednio z siatki terminow.</p>
			<button type="button" class="lunch-summary-btn" data-summary-action="cancel" data-reservation-id="${escapeHtml(
				myReservation.id
			)}">
				<i class="fa-solid fa-ban"></i>
				<span>Anuluj rezerwacje</span>
			</button>
		`
	}

	function renderStats(currentUser, reservationsForDate) {
		const bookedSeats = reservationsForDate.length
		const openSlotCount = TIME_SLOTS.filter(
			timeSlot => reservationsForDate.filter(reservation => reservation.timeSlot === timeSlot).length < MAX_CAPACITY_PER_SLOT
		).length

		bookedStat.textContent = String(bookedSeats)
		capacityStat.textContent = `z ${TIME_SLOTS.length * MAX_CAPACITY_PER_SLOT}`
		openSlotsStat.textContent = String(openSlotCount)
		userStat.textContent = currentUser ? currentUser.fullName || `@${currentUser.login}` : 'Gosc'
		userMetaStat.textContent = currentUser
			? `${currentUser.role === 'admin' ? 'Administrator' : 'Uzytkownik'} · konto lokalne aktywne`
			: 'Podglad bez mozliwosci zapisu'
	}

	function renderSlots(currentUser, reservationsForDate, myReservation) {
		slotGrid.innerHTML = TIME_SLOTS.map(timeSlot => {
			const slotReservations = reservationsForDate.filter(reservation => reservation.timeSlot === timeSlot)
			const actionState = getSlotCardActionState(timeSlot, slotReservations, myReservation, currentUser)
			const seatsLeft = MAX_CAPACITY_PER_SLOT - slotReservations.length
			const isOwnReservation = Boolean(currentUser && myReservation && myReservation.timeSlot === timeSlot)
			const isFull = slotReservations.length >= MAX_CAPACITY_PER_SLOT

			return `
				<article class="lunch-slot-card${isOwnReservation ? ' is-mine' : ''}${isFull ? ' is-full' : ''}">
					<div class="lunch-slot-top">
						<div>
							<p class="lunch-slot-kicker">Slot obiadowy</p>
							<h3>${escapeHtml(timeSlot)}</h3>
						</div>
						<span class="lunch-slot-pill${isFull ? ' is-full' : ''}">
							${isFull ? 'Pelny' : `${seatsLeft} wolne`}
						</span>
					</div>

					<div class="lunch-seat-meter" aria-hidden="true">
						${buildSeatDotsMarkup(slotReservations.length)}
					</div>

					<p class="lunch-slot-meta">
						Zajetosc: <strong>${slotReservations.length}/${MAX_CAPACITY_PER_SLOT}</strong>
						${isOwnReservation ? ' · to jest Twoj termin' : ''}
					</p>

					<div class="lunch-slot-list-wrap">
						<div class="lunch-slot-list-head">
							<strong>Lista zapisow</strong>
							<span>${slotReservations.length}</span>
						</div>

						<ul class="lunch-attendee-list">
							${
								slotReservations.length > 0
									? slotReservations.map(reservation => buildAttendeeMarkup(reservation, currentUser)).join('')
									: '<li class="lunch-attendee-empty">Brak zapisow na ten termin.</li>'
							}
						</ul>
					</div>

					<button
						type="button"
						class="lunch-slot-action${actionState.action === 'cancel' ? ' is-cancel' : ''}"
						data-slot-action="${escapeHtml(actionState.action)}"
						data-time-slot="${escapeHtml(timeSlot)}"
						${actionState.disabled ? 'disabled' : ''}>
						<span>${escapeHtml(actionState.label)}</span>
					</button>
				</article>
			`
		}).join('')
	}

	function renderSummary(currentUser, reservationsForDate, myReservation) {
		const occupiedSlots = new Set(reservationsForDate.map(reservation => reservation.timeSlot)).size
		daySummary.textContent =
			reservationsForDate.length > 0
				? `${formatDateLabel(selectedDate)} · aktywne rezerwacje: ${reservationsForDate.length}, zajete sloty: ${occupiedSlots}/${TIME_SLOTS.length}.`
				: `${formatDateLabel(selectedDate)} · na ten dzien nie ma jeszcze zadnych rezerwacji obiadowych.`

		renderAuthCallout(currentUser)
		renderMyReservation(currentUser, myReservation)
		renderStats(currentUser, reservationsForDate)
		renderSlots(currentUser, reservationsForDate, myReservation)
	}

	function syncUi() {
		const currentUser = getCurrentUser()
		const reservationsForDate = lunchService.getReservationsForDate(selectedDate)
		const myReservation = currentUser ? lunchService.getUserReservationForDate(selectedDate, currentUser.id) : null

		dateInput.value = selectedDate
		renderSummary(currentUser, reservationsForDate, myReservation)
	}

	async function handleCancelReservation(reservationId) {
		const currentUser = getCurrentUser()
		if (!currentUser) {
			AppUtils.auth.openAuthModal?.('login')
			showFeedbackMessage('Zaloguj sie, aby anulowac swoja rezerwacje.', 'warning')
			return
		}

		const myReservation = lunchService.getUserReservationForDate(selectedDate, currentUser.id)
		if (!myReservation || myReservation.id !== reservationId) {
			showFeedbackMessage('Nie znaleziono Twojej aktywnej rezerwacji na ten dzien.', 'error')
			syncUi()
			return
		}

		const shouldCancel = await AppUtils.confirmDialog({
			title: 'Anulowanie rezerwacji',
			message: `Anulowac Twoja rezerwacje na slot ${myReservation.timeSlot}?`,
			confirmLabel: 'TAK',
			cancelLabel: 'NIE',
		})

		if (!shouldCancel) return

		try {
			lunchService.cancelReservation({
				reservationId: myReservation.id,
				userId: currentUser.id,
			})
			showFeedbackMessage(`Anulowano rezerwacje na ${myReservation.timeSlot}.`, 'success')
			syncUi()
		} catch (error) {
			showFeedbackMessage(error.message || 'Nie udalo sie anulowac rezerwacji.', 'error')
		}
	}

	function handleReserveSlot(timeSlot) {
		const currentUser = getCurrentUser()
		if (!currentUser) {
			AppUtils.auth.openAuthModal?.('login')
			showFeedbackMessage('Zaloguj sie, aby zapisac sie na wybrany termin.', 'warning')
			return
		}

		try {
			lunchService.reserveSlot({
				date: selectedDate,
				timeSlot,
				userId: currentUser.id,
			})
			showFeedbackMessage(`Zarezerwowano slot ${timeSlot} na ${formatDateLabel(selectedDate)}.`, 'success')
			syncUi()
		} catch (error) {
			showFeedbackMessage(error.message || 'Nie udalo sie zapisac rezerwacji.', 'error')
		}
	}

	dateInput.addEventListener('change', () => {
		selectedDate = AppUtils.formatDate(dateInput.value) || getTodayDate()
		syncUi()
	})

	todayBtn.addEventListener('click', () => {
		selectedDate = getTodayDate()
		syncUi()
	})

	authBtn.addEventListener('click', () => {
		if (getCurrentUser()) {
			AppUtils.auth.openProfileModal?.()
			return
		}

		AppUtils.auth.openAuthModal?.('login')
	})

	slotGrid.addEventListener('click', event => {
		const actionButton = event.target.closest('[data-slot-action]')
		if (!actionButton) return

		const action = actionButton.getAttribute('data-slot-action')
		const timeSlot = actionButton.getAttribute('data-time-slot')
		if (!action || !timeSlot) return

		if (action === 'login') {
			AppUtils.auth.openAuthModal?.('login')
			return
		}

		if (action === 'reserve') {
			handleReserveSlot(timeSlot)
			return
		}

		if (action === 'cancel') {
			const currentUser = getCurrentUser()
			const myReservation = currentUser ? lunchService.getUserReservationForDate(selectedDate, currentUser.id) : null
			if (!myReservation) {
				showFeedbackMessage('Nie znaleziono aktywnej rezerwacji do anulowania.', 'error')
				return
			}

			void handleCancelReservation(myReservation.id)
		}
	})

	myReservationBox.addEventListener('click', event => {
		const actionButton = event.target.closest('[data-summary-action="cancel"]')
		if (!actionButton) return

		const reservationId = actionButton.getAttribute('data-reservation-id')
		if (!reservationId) return
		void handleCancelReservation(reservationId)
	})

	document.addEventListener('app-auth-changed', () => {
		syncUi()
	})

	window.addEventListener('storage', event => {
		if (event.key === STORAGE_KEY || event.key === USERS_STORAGE_KEY || event.key === AppUtils.config.STORAGE_KEYS.SESSION) {
			syncUi()
		}
	})

	selectedDate = getTodayDate()
	syncUi()
})
