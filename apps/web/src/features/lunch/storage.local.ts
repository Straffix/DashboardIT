import type { LunchReservation } from './types'
import {
	formatDateKey,
	getTodayDateKey,
	LUNCH_MAX_CAPACITY_PER_SLOT,
	LUNCH_TIME_SLOTS,
	normalizeReservationRecord,
} from './utils'

const STORAGE_KEY = 'dashboardit.react.lunch.reservations'

function ensureWindow() {
	return typeof window !== 'undefined'
}

const todayDate = getTodayDateKey()

const demoReservations: LunchReservation[] = [
	{
		id: 'lunch-1',
		date: todayDate,
		timeSlot: '12:00',
		userId: 'lunch-user-1',
		createdAt: '2026-06-28T08:00:00.000Z',
		updatedAt: '2026-06-28T08:00:00.000Z',
		status: 'active',
	},
	{
		id: 'lunch-2',
		date: todayDate,
		timeSlot: '12:00',
		userId: 'lunch-user-2',
		createdAt: '2026-06-28T08:10:00.000Z',
		updatedAt: '2026-06-28T08:10:00.000Z',
		status: 'active',
	},
	{
		id: 'lunch-3',
		date: todayDate,
		timeSlot: '13:30',
		userId: 'lunch-user-3',
		createdAt: '2026-06-28T08:20:00.000Z',
		updatedAt: '2026-06-28T08:20:00.000Z',
		status: 'active',
	},
]

function readAllReservationsSync() {
	if (!ensureWindow()) return demoReservations

	const rawValue = window.localStorage.getItem(STORAGE_KEY)
	if (!rawValue) {
		window.localStorage.setItem(STORAGE_KEY, JSON.stringify(demoReservations))
		return demoReservations
	}

	try {
		const parsedValue = JSON.parse(rawValue) as LunchReservation[]
		return Array.isArray(parsedValue) ? parsedValue.map(record => normalizeReservationRecord(record)) : demoReservations
	} catch {
		window.localStorage.setItem(STORAGE_KEY, JSON.stringify(demoReservations))
		return demoReservations
	}
}

function writeAllReservations(reservations: LunchReservation[]) {
	if (!ensureWindow()) return
	window.localStorage.setItem(STORAGE_KEY, JSON.stringify(reservations))
}

function getActiveReservationsForDate(reservations: LunchReservation[], date: string) {
	return reservations
		.filter(reservation => reservation.status === 'active' && reservation.date === date)
		.sort((left, right) => {
			const leftSlotIndex = LUNCH_TIME_SLOTS.indexOf(left.timeSlot)
			const rightSlotIndex = LUNCH_TIME_SLOTS.indexOf(right.timeSlot)
			if (leftSlotIndex !== rightSlotIndex) return leftSlotIndex - rightSlotIndex

			const leftCreatedAt = Date.parse(left.createdAt) || 0
			const rightCreatedAt = Date.parse(right.createdAt) || 0
			return leftCreatedAt - rightCreatedAt
		})
}

export async function readLunchReservationsForDate(date: string) {
	const normalizedDate = formatDateKey(date)
	return getActiveReservationsForDate(readAllReservationsSync(), normalizedDate)
}

export async function reserveLunchSlot({ date, timeSlot, userId }: { date: string; timeSlot: string; userId: string }) {
	const normalizedDate = formatDateKey(date)
	const normalizedUserId = String(userId || '').trim()
	const todayKey = getTodayDateKey()

	if (!normalizedUserId) {
		throw new Error('Wybierz osobe, ktora rezerwuje obiad.')
	}

	if (!normalizedDate || normalizedDate !== todayKey) {
		throw new Error('Rezerwacje obiadowe sa dostepne tylko na dzisiejszy dzien.')
	}

	if (!LUNCH_TIME_SLOTS.includes(timeSlot)) {
		throw new Error('Wybrany slot nie istnieje w harmonogramie.')
	}

	const reservations = readAllReservationsSync()
	const activeReservations = getActiveReservationsForDate(reservations, normalizedDate)
	const existingReservation = activeReservations.find(reservation => reservation.userId === normalizedUserId)

	if (existingReservation) {
		if (existingReservation.timeSlot === timeSlot) {
			throw new Error(`Ta osoba ma juz aktywna rezerwacje na ${timeSlot}.`)
		}

		throw new Error(`Ta osoba ma juz aktywna rezerwacje na ${existingReservation.timeSlot}.`)
	}

	const activeSlotReservations = activeReservations.filter(reservation => reservation.timeSlot === timeSlot)
	if (activeSlotReservations.length >= LUNCH_MAX_CAPACITY_PER_SLOT) {
		throw new Error(`Slot ${timeSlot} jest juz pelny.`)
	}

	const now = new Date().toISOString()
	const nextReservation: LunchReservation = {
		id: `lunch-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
		date: normalizedDate,
		timeSlot,
		userId: normalizedUserId,
		createdAt: now,
		updatedAt: now,
		status: 'active',
	}

	reservations.push(nextReservation)
	writeAllReservations(reservations)
	return getActiveReservationsForDate(reservations, normalizedDate)
}

export async function cancelLunchReservation({
	date,
	reservationId,
	userId,
}: {
	date: string
	reservationId: string
	userId: string
}) {
	const normalizedDate = formatDateKey(date)
	const normalizedReservationId = String(reservationId || '').trim()
	const normalizedUserId = String(userId || '').trim()

	const reservations = readAllReservationsSync()
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

	writeAllReservations(reservations)
	return getActiveReservationsForDate(reservations, normalizedDate)
}
