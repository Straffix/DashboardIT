import { apiRequest } from '../../lib/http'

import type { LunchReservation } from './types'

export function readLunchReservationsForDate(date: string) {
	return apiRequest<LunchReservation[]>('/lunch/reservations', {
		searchParams: { date },
	})
}

export function reserveLunchSlot({ date, timeSlot, userId }: { date: string; timeSlot: string; userId: string }) {
	return apiRequest<LunchReservation[]>('/lunch/reservations', {
		body: { date, timeSlot, userId },
		method: 'POST',
	})
}

export function cancelLunchReservation({
	date,
	reservationId,
	userId,
}: {
	date: string
	reservationId: string
	userId: string
}) {
	return apiRequest<LunchReservation[]>(`/lunch/reservations/${reservationId}/cancel`, {
		body: { date, userId },
		method: 'POST',
	})
}
