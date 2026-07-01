import { getAppDataSourceMode } from '../../config/dataSource'

import * as apiLunchStorage from './storage.api'
import * as localLunchStorage from './storage.local'

type LunchStorageModule = Pick<
	typeof localLunchStorage,
	'cancelLunchReservation' | 'readLunchReservationsForDate' | 'reserveLunchSlot'
>

const lunchStorage: LunchStorageModule = getAppDataSourceMode() === 'api' ? apiLunchStorage : localLunchStorage

export const readLunchReservationsForDate = (date: Parameters<LunchStorageModule['readLunchReservationsForDate']>[0]) =>
	lunchStorage.readLunchReservationsForDate(date)

export const reserveLunchSlot = (input: Parameters<LunchStorageModule['reserveLunchSlot']>[0]) =>
	lunchStorage.reserveLunchSlot(input)

export const cancelLunchReservation = (input: Parameters<LunchStorageModule['cancelLunchReservation']>[0]) =>
	lunchStorage.cancelLunchReservation(input)
