import { demoUsers } from '../session/demoUsers'
import type { LunchReservation, LunchTeamMember, LunchUserRole } from './types'

export const LUNCH_TIME_SLOTS = ['11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30']
export const LUNCH_MAX_CAPACITY_PER_SLOT = 4

export const lunchTeamMembers: LunchTeamMember[] = demoUsers

export function formatDateKey(value: Date | string) {
	const parsedDate = value instanceof Date ? new Date(value.getTime()) : new Date(value)
	if (Number.isNaN(parsedDate.getTime())) return ''

	const year = parsedDate.getFullYear()
	const month = String(parsedDate.getMonth() + 1).padStart(2, '0')
	const day = String(parsedDate.getDate()).padStart(2, '0')
	return `${year}-${month}-${day}`
}

export function getTodayDateKey() {
	return formatDateKey(new Date())
}

export function formatLunchDateLabel(dateKey: string) {
	const parsedDate = new Date(dateKey)
	if (Number.isNaN(parsedDate.getTime())) return dateKey

	return parsedDate.toLocaleDateString('pl-PL', {
		weekday: 'long',
		day: 'numeric',
		month: 'long',
		year: 'numeric',
	})
}

export function normalizeReservationRecord(record: Partial<LunchReservation>): LunchReservation {
	return {
		id: String(record.id || ''),
		date: String(record.date || '').trim(),
		timeSlot: LUNCH_TIME_SLOTS.includes(String(record.timeSlot || '')) ? String(record.timeSlot) : '',
		userId: String(record.userId || '').trim(),
		createdAt: String(record.createdAt || new Date().toISOString()),
		updatedAt: String(record.updatedAt || record.createdAt || new Date().toISOString()),
		status: record.status === 'cancelled' ? 'cancelled' : 'active',
	}
}

export function getUserInitials(fullName: string) {
	const words = String(fullName || '')
		.trim()
		.split(/\s+/)
		.filter(Boolean)
		.slice(0, 2)

	if (words.length === 0) return 'IT'
	return words.map(word => word[0]).join('').toUpperCase()
}

export function getRoleLabel(role: LunchUserRole) {
	return role === 'admin' ? 'Lider' : 'Pracownik'
}

export function getReservationsForSlot(reservations: LunchReservation[], timeSlot: string) {
	return reservations.filter(reservation => reservation.timeSlot === timeSlot)
}

export function getReservationForUser(reservations: LunchReservation[], userId: string) {
	return reservations.find(reservation => reservation.userId === userId) || null
}

export function getSeatsLeft(count: number) {
	return Math.max(0, LUNCH_MAX_CAPACITY_PER_SLOT - count)
}
