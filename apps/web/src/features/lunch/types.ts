import type { AppSessionUser, AppSessionUserRole } from '../session/types'

export type LunchUserRole = AppSessionUserRole

export type LunchReservationStatus = 'active' | 'cancelled'

export type LunchTeamMember = AppSessionUser

export type LunchReservation = {
	id: string
	date: string
	timeSlot: string
	userId: string
	createdAt: string
	updatedAt: string
	status: LunchReservationStatus
}
