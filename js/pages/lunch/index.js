(function initializeLunchPage() {
	const pageScope = window.AppPageRuntime?.createScope?.('rezerwacja_obiadow.html') || null
	const runWhenReady = callback => {
		if (typeof pageScope?.runWhenReady === 'function') {
			pageScope.runWhenReady(callback)
			return
		}

		if (document.readyState === 'loading') {
			document.addEventListener('DOMContentLoaded', callback, { once: true })
			return
		}

		callback()
	}
	const listen = (target, type, listener, options = undefined) => {
		if (!target?.addEventListener) return
		const nextOptions = pageScope?.signal ? { ...(options || {}), signal: pageScope.signal } : options
		target.addEventListener(type, listener, nextOptions)
	}

	runWhenReady(() => {
	const lunchDomainConfig = window.AppServices?.lunchDomainConfig
	const TIME_SLOTS = Array.isArray(lunchDomainConfig?.TIME_SLOTS) ? lunchDomainConfig.TIME_SLOTS : []
	const MAX_CAPACITY_PER_SLOT = Number(lunchDomainConfig?.MAX_CAPACITY_PER_SLOT || 0)
	const STORAGE_KEY = AppUtils.config.STORAGE_KEYS.LUNCH
	const usersService = window.AppServices?.usersService
	const lunchService = window.AppServices?.lunchService
	const getInitials = AppUtils.getInitials
	const escapeHtml = AppUtils.escapeHtml

	const slotGrid = document.getElementById('lunch-slot-grid')

	if (!slotGrid) {
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

	function notifyLunch(message, type = 'info', title = '') {
		if (!message || type === 'success' || typeof AppUtils.notify !== 'function') return
		AppUtils.notify({ message, type, title })
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
		renderSlots(currentUser, reservationsForDate, myReservation)
	}

	function syncUi() {
		selectedDate = getTodayDate()
		const currentUser = getCurrentUser()
		const reservationsForDate = lunchService.getReservationsForDate(selectedDate)
		const myReservation = currentUser ? lunchService.getUserReservationForDate(selectedDate, currentUser.id) : null

		renderSummary(currentUser, reservationsForDate, myReservation)
	}

	async function handleCancelReservation(reservationId) {
		const currentUser = getCurrentUser()
		if (!currentUser) {
			AppUtils.auth.openAuthModal?.('login')
			notifyLunch('Zaloguj się, aby anulować swoją rezerwację.', 'warning', 'Tylko podgląd')
			return
		}

		const myReservation = lunchService.getUserReservationForDate(selectedDate, currentUser.id)
		if (!myReservation || myReservation.id !== reservationId) {
			notifyLunch('Nie znaleziono Twojej aktywnej rezerwacji na ten dzień.', 'error', 'Brak rezerwacji')
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
			syncUi()
		} catch (error) {
			notifyLunch(error.message || 'Nie udało się anulować rezerwacji.', 'error', 'Błąd rezerwacji')
		}
	}

	function handleReserveSlot(timeSlot) {
		const currentUser = getCurrentUser()
		if (!currentUser) {
			AppUtils.auth.openAuthModal?.('login')
			notifyLunch('Zaloguj się, aby zapisać się na wybrany termin.', 'warning', 'Tylko podgląd')
			return
		}

		try {
			lunchService.reserveSlot({
				date: selectedDate,
				timeSlot,
				userId: currentUser.id,
			})
			syncUi()
		} catch (error) {
			notifyLunch(error.message || 'Nie udało się zapisać rezerwacji.', 'error', 'Błąd rezerwacji')
		}
	}

	listen(slotGrid, 'click', event => {
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
				notifyLunch('Nie znaleziono aktywnej rezerwacji do anulowania.', 'error', 'Brak rezerwacji')
				return
			}

			void handleCancelReservation(myReservation.id)
		}
	})

	listen(document, 'app-auth-changed', () => {
		syncUi()
	})

	listen(window, 'storage', event => {
		if (event.key === STORAGE_KEY || event.key === AppUtils.config.STORAGE_KEYS.USERS || event.key === AppUtils.config.STORAGE_KEYS.SESSION) {
			syncUi()
		}
	})

	selectedDate = getTodayDate()
	syncUi()
})
})()
