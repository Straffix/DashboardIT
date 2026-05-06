document.addEventListener('DOMContentLoaded', () => {
	const lunchDomainConfig = window.AppServices?.lunchDomainConfig
	const TIME_SLOTS = Array.isArray(lunchDomainConfig?.TIME_SLOTS) ? lunchDomainConfig.TIME_SLOTS : []
	const MAX_CAPACITY_PER_SLOT = Number(lunchDomainConfig?.MAX_CAPACITY_PER_SLOT || 0)
	const STORAGE_KEY = AppUtils.config.STORAGE_KEYS.LUNCH
	const usersService = window.AppServices?.usersService
	const lunchService = window.AppServices?.lunchService
	const getInitials = AppUtils.getInitials
	const escapeHtml = AppUtils.escapeHtml

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

	if (
		!lunchService ||
		TIME_SLOTS.length === 0 ||
		MAX_CAPACITY_PER_SLOT <= 0 ||
		typeof getInitials !== 'function' ||
		typeof escapeHtml !== 'function'
	) {
		console.error('Lunch module is missing required domain services or config.')
		return
	}

	let selectedDate = getTodayDate()
	let feedbackTimeoutId = null

	function getTodayDate() {
		return AppUtils.formatDate(new Date())
	}

	function getCurrentUser() {
		return AppUtils.auth.getCurrentUser()
	}

	function loadUsers() {
		return (usersService?.getAll?.() || [])
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
			authTitle.textContent = `Pracujesz jako ${String(currentUser.fullName || '').trim() || 'użytkownik zespołu'}`
			authText.textContent =
				'Możesz zapisać się na jeden slot dziennie, anulować własną rezerwację i podejrzeć zajętość wszystkich godzin.'
			authBtn.innerHTML = '<i class="app-icon user-gear-solid-full"></i><span>Otwórz profil</span>'
			return
		}

		authCallout.classList.remove('is-active-user')
		authTitle.textContent = 'Podgląd slotów jest dostępny dla wszystkich'
		authText.textContent =
			'Zaloguj się z paska statusu u góry, aby zapisać się na wybraną godzinę albo anulować swoją rezerwację.'
		authBtn.innerHTML = '<i class="app-icon right-to-bracket-solid-full"></i><span>Zaloguj się</span>'
	}

	function buildSeatDotsMarkup(count) {
		return Array.from({ length: MAX_CAPACITY_PER_SLOT }, (_, index) => {
			const isFilled = index < count
			return `<span class="lunch-seat-dot${isFilled ? ' is-filled' : ''}"></span>`
		}).join('')
	}

	function buildAttendeeMarkup(reservation, currentUser) {
		const user = getUserById(reservation.userId)
		const displayName = String(user?.fullName || '').trim() || 'Użytkownik'
		const secondaryLabel = user
			? AppUtils.auth.getRoleLabel?.(user.role) || (user.role === 'admin' ? 'Lider' : 'Pracownik')
			: 'Konto zespołowe'
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
				label: isFull ? 'Slot pełny' : 'Zaloguj się, aby zarezerwować',
				disabled: isFull,
			}
		}

		if (isOwnReservation) {
			return {
				action: 'cancel',
				label: 'Anuluj moją rezerwację',
				disabled: false,
			}
		}

		if (hasOtherReservation) {
			return {
				action: 'reserve',
				label: `Masz już slot ${myReservation.timeSlot}`,
				disabled: true,
			}
		}

		if (isFull) {
			return {
				action: 'reserve',
				label: 'Slot pełny',
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
				<strong>Nie jesteś zalogowany</strong>
				<p>Zaloguj się z paska statusu u góry, aby wybrać godzinę obiadu dla swojego konta.</p>
			`
			return
		}

		if (!myReservation) {
			myReservationBox.innerHTML = `
				<strong>Brak aktywnej rezerwacji</strong>
				<p>Na dzień ${escapeHtml(formatDateLabel(selectedDate))} nie masz jeszcze wybranego slotu obiadowego.</p>
			`
			return
		}

		myReservationBox.innerHTML = `
			<strong>${escapeHtml(myReservation.timeSlot)} | ${escapeHtml(formatDateLabel(selectedDate))}</strong>
			<p>Twój lunch jest zapisany w tym slocie. Możesz go anulować z tej karty albo bezpośrednio z siatki terminów.</p>
			<button type="button" class="lunch-summary-btn" data-summary-action="cancel" data-reservation-id="${escapeHtml(
				myReservation.id
			)}">
				<i class="app-icon ban-solid-full"></i>
				<span>Anuluj rezerwację</span>
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
		userStat.textContent = currentUser ? String(currentUser.fullName || '').trim() || 'Użytkownik zespołu' : 'Gość'
		userMetaStat.textContent = currentUser
			? `${AppUtils.auth.getRoleLabel?.(currentUser.role) || (currentUser.role === 'admin' ? 'Lider' : 'Członek')} | konto aktywne`
			: 'Podgląd bez możliwości zapisu'
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
							${isFull ? 'Pełny' : `${seatsLeft} wolne`}
						</span>
					</div>

					<div class="lunch-seat-meter" aria-hidden="true">
						${buildSeatDotsMarkup(slotReservations.length)}
					</div>

					<p class="lunch-slot-meta">
						Zajętość: <strong>${slotReservations.length}/${MAX_CAPACITY_PER_SLOT}</strong>
						${isOwnReservation ? ' | to jest Twój termin' : ''}
					</p>

					<div class="lunch-slot-list-wrap">
						<div class="lunch-slot-list-head">
							<strong>Lista zapisów</strong>
							<span>${slotReservations.length}</span>
						</div>

						<ul class="lunch-attendee-list">
							${
								slotReservations.length > 0
									? slotReservations.map(reservation => buildAttendeeMarkup(reservation, currentUser)).join('')
									: '<li class="lunch-attendee-empty">Brak zapisów na ten termin.</li>'
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
				? `${formatDateLabel(selectedDate)} | aktywne rezerwacje: ${reservationsForDate.length}, zajęte sloty: ${occupiedSlots}/${TIME_SLOTS.length}.`
				: `${formatDateLabel(selectedDate)} | na ten dzień nie ma jeszcze żadnych rezerwacji obiadowych.`

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
			showFeedbackMessage('Zaloguj się, aby anulować swoją rezerwację.', 'warning')
			return
		}

		const myReservation = lunchService.getUserReservationForDate(selectedDate, currentUser.id)
		if (!myReservation || myReservation.id !== reservationId) {
			showFeedbackMessage('Nie znaleziono Twojej aktywnej rezerwacji na ten dzień.', 'error')
			syncUi()
			return
		}

		const shouldCancel = await AppUtils.confirmDialog({
			title: 'Anulowanie rezerwacji',
			message: `Anulować Twoją rezerwację na slot ${myReservation.timeSlot}?`,
			confirmLabel: 'TAK',
			cancelLabel: 'NIE',
		})

		if (!shouldCancel) return

		try {
			lunchService.cancelReservation({
				reservationId: myReservation.id,
				userId: currentUser.id,
			})
			showFeedbackMessage(`Anulowano rezerwację na ${myReservation.timeSlot}.`, 'success')
			syncUi()
		} catch (error) {
			showFeedbackMessage(error.message || 'Nie udało się anulować rezerwacji.', 'error')
		}
	}

	function handleReserveSlot(timeSlot) {
		const currentUser = getCurrentUser()
		if (!currentUser) {
			AppUtils.auth.openAuthModal?.('login')
			showFeedbackMessage('Zaloguj się, aby zapisać się na wybrany termin.', 'warning')
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
			showFeedbackMessage(error.message || 'Nie udało się zapisać rezerwacji.', 'error')
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
		if (event.key === STORAGE_KEY || event.key === AppUtils.config.STORAGE_KEYS.USERS || event.key === AppUtils.config.STORAGE_KEYS.SESSION) {
			syncUi()
		}
	})

	selectedDate = getTodayDate()
	syncUi()
})
