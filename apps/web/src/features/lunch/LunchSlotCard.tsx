import type { LunchReservation, LunchTeamMember } from './types'
import {
	getReservationForUser,
	getReservationsForSlot,
	getRoleLabel,
	getSeatsLeft,
	getUserInitials,
	LUNCH_MAX_CAPACITY_PER_SLOT,
} from './utils'

type LunchSlotCardProps = {
	timeSlot: string
	reservations: LunchReservation[]
	users: LunchTeamMember[]
	currentUser: LunchTeamMember | null
	onReserve: (timeSlot: string) => void
	onCancel: (reservationId: string) => void
	onRequireUser: () => void
}

export function LunchSlotCard({
	timeSlot,
	reservations,
	users,
	currentUser,
	onReserve,
	onCancel,
	onRequireUser,
}: LunchSlotCardProps) {
	const slotReservations = getReservationsForSlot(reservations, timeSlot)
	const myReservation = currentUser ? getReservationForUser(reservations, currentUser.id) : null
	const isOwnReservation = Boolean(currentUser && slotReservations.some(reservation => reservation.userId === currentUser.id))
	const isFull = slotReservations.length >= LUNCH_MAX_CAPACITY_PER_SLOT
	const hasOtherReservation = Boolean(currentUser && myReservation && myReservation.timeSlot !== timeSlot)

	let actionLabel = 'Zarezerwuj ten termin'
	let actionDisabled = false
	let actionType: 'login' | 'reserve' | 'cancel' = 'reserve'

	if (!currentUser) {
		actionType = 'login'
		actionLabel = isFull ? 'Slot pelny' : 'Wybierz osobe, aby zarezerwowac'
		actionDisabled = isFull
	} else if (isOwnReservation && myReservation) {
		actionType = 'cancel'
		actionLabel = 'Anuluj moja rezerwacje'
	} else if (hasOtherReservation && myReservation) {
		actionLabel = `Masz juz slot ${myReservation.timeSlot}`
		actionDisabled = true
	} else if (isFull) {
		actionLabel = 'Slot pelny'
		actionDisabled = true
	}

	return (
		<article className={`lunch-slot-card${isOwnReservation ? ' is-mine' : ''}${isFull ? ' is-full' : ''}`}>
			<div className="lunch-slot-top">
				<div>
					<p className="lunch-slot-kicker">Slot obiadowy</p>
					<h3>{timeSlot}</h3>
				</div>
				<span className={`lunch-slot-pill${isFull ? ' is-full' : ''}`}>
					{isFull ? 'Pelny' : `${getSeatsLeft(slotReservations.length)} wolne`}
				</span>
			</div>

			<div className="lunch-seat-meter" aria-hidden="true">
				{Array.from({ length: LUNCH_MAX_CAPACITY_PER_SLOT }, (_, index) => (
					<span key={`${timeSlot}-${index}`} className={index < slotReservations.length ? 'lunch-seat-dot is-filled' : 'lunch-seat-dot'} />
				))}
			</div>

			<p className="lunch-slot-meta">
				Zajetosc: <strong>{slotReservations.length}/{LUNCH_MAX_CAPACITY_PER_SLOT}</strong>
				{isOwnReservation ? ' | to jest Twoj termin' : ''}
			</p>

			<div className="lunch-slot-list-wrap">
				<div className="lunch-slot-list-head">
					<strong>Lista zapisow</strong>
					<span>{slotReservations.length}</span>
				</div>

				<ul className="lunch-attendee-list">
					{slotReservations.length > 0 ? (
						slotReservations.map(reservation => {
							const user = users.find(item => item.id === reservation.userId) || null
							const isCurrentUser = currentUser?.id === reservation.userId
							const displayName = user?.fullName || 'Uzytkownik zespolu'
							return (
								<li key={reservation.id} className={isCurrentUser ? 'lunch-attendee is-current-user' : 'lunch-attendee'}>
									<span className="lunch-attendee-avatar">{getUserInitials(displayName)}</span>
									<div className="lunch-attendee-copy">
										<strong>{displayName}</strong>
										<span>{user ? getRoleLabel(user.role) : 'Konto zespolowe'}</span>
									</div>
									{isCurrentUser ? <span className="lunch-attendee-badge">Ty</span> : null}
								</li>
							)
						})
					) : (
						<li className="lunch-attendee-empty">Brak zapisow na ten termin.</li>
					)}
				</ul>
			</div>

			<button
				type="button"
				className={actionType === 'cancel' ? 'lunch-slot-action is-cancel' : 'lunch-slot-action'}
				disabled={actionDisabled}
				onClick={() => {
					if (actionType === 'login') {
						onRequireUser()
						return
					}

					if (actionType === 'cancel' && myReservation) {
						onCancel(myReservation.id)
						return
					}

					onReserve(timeSlot)
				}}>
				<span>{actionLabel}</span>
			</button>
		</article>
	)
}
