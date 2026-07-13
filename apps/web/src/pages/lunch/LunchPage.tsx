import { useState } from 'react'

import { PageIntro } from '../../components/PageIntro'
import { useCancelLunchReservationMutation, useLunchReservationsQuery, useReserveLunchSlotMutation } from '../../features/lunch/hooks'
import { LunchSlotCard } from '../../features/lunch/LunchSlotCard'
import { useAppSession } from '../../features/session/AppSessionProvider'
import { formatLunchDateLabel, getReservationForUser, getTodayDateKey, LUNCH_MAX_CAPACITY_PER_SLOT, LUNCH_TIME_SLOTS } from '../../features/lunch/utils'

export function LunchPage() {
	const todayDate = getTodayDateKey()
	const { data: reservations = [], isLoading } = useLunchReservationsQuery(todayDate)
	const reserveMutation = useReserveLunchSlotMutation(todayDate)
	const cancelMutation = useCancelLunchReservationMutation(todayDate)
	const { activeUser, activeUserId, setActiveUserId, clearActiveUser, users } = useAppSession()

	const [feedback, setFeedback] = useState('')
	const myReservation = activeUser ? getReservationForUser(reservations, activeUser.id) : null
	const totalSeats = LUNCH_TIME_SLOTS.length * LUNCH_MAX_CAPACITY_PER_SLOT
	const reservedSeats = reservations.length
	const freeSeats = totalSeats - reservedSeats

	return (
		<div className="page-stack">
			<PageIntro
				eyebrow="Modul operacyjny"
				title="Rezerwacja obiadow"
				description="Modul lunch obsluguje sloty, limity miejsc i anulowanie rezerwacji. Sesja robocza pozwala pracowac w kontekscie wybranej osoby."
				actions={
					<div className="page-actions">
						<label className="search-input">
							<span>Sesja robocza</span>
							<select
								value={activeUserId}
								onChange={event => {
									const nextUserId = event.target.value
									if (nextUserId) {
										setActiveUserId(nextUserId)
									} else {
										clearActiveUser()
									}
									setFeedback('')
								}}>
								<option value="">Bez aktywnej osoby</option>
								{users.map(user => (
									<option key={user.id} value={user.id}>
										{user.fullName}
									</option>
								))}
							</select>
						</label>
					</div>
				}
			/>

			<section className="lunch-summary-grid">
				<article className="stat-card">
					<p>Dzien</p>
					<strong>{formatLunchDateLabel(todayDate)}</strong>
				</article>
				<article className="stat-card stat-card--warning">
					<p>Rezerwacje</p>
					<strong>{reservedSeats}</strong>
				</article>
				<article className="stat-card stat-card--active">
					<p>Wolne miejsca</p>
					<strong>{freeSeats}</strong>
				</article>
				<article className="stat-card">
					<p>Twoj termin</p>
					<strong>{myReservation?.timeSlot || 'Brak'}</strong>
				</article>
			</section>

			<section className="data-card lunch-context-card">
				<p className="month-summary-card__label">Kontekst modulu</p>
				<strong>{activeUser ? `Aktywna sesja: ${activeUser.fullName}` : 'Brak aktywnej osoby roboczej'}</strong>
				<span>
					{activeUser
						? 'Mozesz rezerwowac i anulowac sloty dla wybranej osoby z poziomu jednego ekranu.'
						: 'Wybierz osobe robocza, aby zapisac lub anulowac rezerwacje.'}
				</span>
				{feedback ? <p className="helper-note is-warning">{feedback}</p> : null}
			</section>

			{isLoading ? (
				<section className="data-card data-card--empty">
					<h3>Ladowanie</h3>
					<p>Pobieram dzisiejsze rezerwacje obiadowe.</p>
				</section>
			) : (
				<section className="lunch-slot-grid" aria-label="Dostepne sloty obiadowe">
					{LUNCH_TIME_SLOTS.map(timeSlot => (
						<LunchSlotCard
							key={timeSlot}
							timeSlot={timeSlot}
							reservations={reservations}
							users={users}
							currentUser={activeUser}
							onRequireUser={() => {
								setFeedback('Wybierz osobe robocza, aby zarezerwowac lub anulowac slot.')
							}}
							onReserve={async nextTimeSlot => {
								if (!activeUser) {
									setFeedback('Wybierz osobe robocza, aby zarezerwowac slot.')
									return
								}

								try {
									setFeedback('')
									await reserveMutation.mutateAsync({ timeSlot: nextTimeSlot, userId: activeUser.id })
								} catch (error) {
									setFeedback(error instanceof Error ? error.message : 'Nie udalo sie zapisac rezerwacji.')
								}
							}}
							onCancel={async reservationId => {
								if (!activeUser) {
									setFeedback('Wybierz osobe robocza, aby anulowac rezerwacje.')
									return
								}

								const shouldCancel = window.confirm('Anulowac rezerwacje dla wybranego slotu?')
								if (!shouldCancel) return

								try {
									setFeedback('')
									await cancelMutation.mutateAsync({ reservationId, userId: activeUser.id })
								} catch (error) {
									setFeedback(error instanceof Error ? error.message : 'Nie udalo sie anulowac rezerwacji.')
								}
							}}
						/>
					))}
				</section>
			)}
		</div>
	)
}
