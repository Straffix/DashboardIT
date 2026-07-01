import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { cancelLunchReservation, readLunchReservationsForDate, reserveLunchSlot } from './storage'

export function useLunchReservationsQuery(date: string) {
	return useQuery({
		queryKey: ['lunch-reservations', date],
		queryFn: () => readLunchReservationsForDate(date),
	})
}

export function useReserveLunchSlotMutation(date: string) {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: ({ timeSlot, userId }: { timeSlot: string; userId: string }) => reserveLunchSlot({ date, timeSlot, userId }),
		onSuccess: reservations => {
			queryClient.setQueryData(['lunch-reservations', date], reservations)
		},
	})
}

export function useCancelLunchReservationMutation(date: string) {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: ({ reservationId, userId }: { reservationId: string; userId: string }) =>
			cancelLunchReservation({ date, reservationId, userId }),
		onSuccess: reservations => {
			queryClient.setQueryData(['lunch-reservations', date], reservations)
		},
	})
}
