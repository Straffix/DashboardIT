import type { SpreadsheetRow } from '../../lib/spreadsheet'
import {
	createSpreadsheetRowLookup,
	normalizeSpreadsheetDate,
	normalizeSpreadsheetLookup,
	readSpreadsheetValue,
} from '../../lib/spreadsheet'

import type { MonitorDevice } from './types'
import { createDefaultDomainDate, normalizeSerialNumber } from './utils'

const monitorImportAliases = {
	date: ['Data waznosci domeny'],
	deviceType: ['Typ urzadzenia', 'Typ'],
	name: ['Nazwa uzytkownika', 'Nazwa uzytkownika / komputer', 'Nazwa'],
	ru: ['Dzial / RU', 'RU', 'Dzial'],
	sn: ['Numer Seryjny', 'Numer seryjny', 'SN'],
} as const

function normalizeMonitorText(value: unknown) {
	return String(value ?? '').trim()
}

function getMonitorDuplicateKey(device: Pick<MonitorDevice, 'ru' | 'sn'>) {
	const ru = normalizeMonitorText(device.ru).replace(/[^0-9]/g, '')
	const sn = normalizeSerialNumber(String(device.sn || ''))
	if (!ru || !sn) return ''
	return `${ru}::${sn}`
}

function normalizeMonitorDeviceType(value: unknown, date: string) {
	const normalizedValue = normalizeSpreadsheetLookup(value)

	if (['new', 'nowe', 'nowy', 'n', 'fresh'].includes(normalizedValue)) {
		return 'new' as const
	}

	if (['old', 'stare', 'stary', 'uzywane', 'used', 'o'].includes(normalizedValue)) {
		return 'old' as const
	}

	return date ? ('old' as const) : ('new' as const)
}

export function buildMonitorExportRows(devices: MonitorDevice[]): SpreadsheetRow[] {
	return devices.map(device => ({
		'Nazwa uzytkownika': device.name,
		'Dzial / RU': device.ru,
		'Numer Seryjny': device.sn,
		'Data waznosci domeny': device.date,
		'Typ urzadzenia': device.deviceType === 'new' ? 'Nowe' : 'Stare',
	}))
}

export function prepareImportedMonitorDevices(rows: SpreadsheetRow[], existingDevices: MonitorDevice[]) {
	const importedAt = new Date().toISOString()
	const existingKeys = new Set(existingDevices.map(device => getMonitorDuplicateKey(device)).filter(Boolean))
	const importedKeys = new Set<string>()
	const importedDevices: MonitorDevice[] = []
	let skippedCount = 0

	rows.forEach((row, index) => {
		const lookup = createSpreadsheetRowLookup(row)
		const name = normalizeMonitorText(readSpreadsheetValue(lookup, [...monitorImportAliases.name])).toUpperCase()
		const ru = normalizeMonitorText(readSpreadsheetValue(lookup, [...monitorImportAliases.ru])).replace(/[^0-9]/g, '')
		const sn = normalizeSerialNumber(String(readSpreadsheetValue(lookup, [...monitorImportAliases.sn]) || ''))
		const importedDate = normalizeSpreadsheetDate(readSpreadsheetValue(lookup, [...monitorImportAliases.date]))
		const deviceType = normalizeMonitorDeviceType(readSpreadsheetValue(lookup, [...monitorImportAliases.deviceType]), importedDate)
		const date = importedDate || (deviceType === 'new' ? createDefaultDomainDate() : '')

		if (!name || !ru || !sn) {
			skippedCount += 1
			return
		}

		const nextDevice: MonitorDevice = {
			id: `monitor-import-${Date.now()}-${index}`,
			name,
			ru,
			sn,
			deviceType,
			date,
			lastExtendedOn: '',
			createdAt: importedAt,
			updatedAt: importedAt,
		}

		const duplicateKey = getMonitorDuplicateKey(nextDevice)
		if (duplicateKey && (existingKeys.has(duplicateKey) || importedKeys.has(duplicateKey))) {
			skippedCount += 1
			return
		}

		if (duplicateKey) {
			importedKeys.add(duplicateKey)
		}

		importedDevices.push(nextDevice)
	})

	return {
		importedDevices,
		skippedCount,
	}
}
