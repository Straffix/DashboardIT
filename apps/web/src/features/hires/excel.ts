import type { SpreadsheetRow } from '../../lib/spreadsheet'
import {
	createSpreadsheetRowLookup,
	normalizeSpreadsheetDate,
	normalizeSpreadsheetFlag,
	normalizeSpreadsheetLookup,
	readSpreadsheetValue,
	splitSpreadsheetList,
} from '../../lib/spreadsheet'

import type { HireAccessoryId, HireRecord } from './types'
import { hireAccessoryIds } from './types'
import { getHireDuplicateKey, hireAccessoryCatalog, normalizeHireRecord, sortHires } from './utils'

type HireExportColumn =
	| { key: keyof HireRecord; header: string; type?: 'text' | 'flag' }
	| { key: 'preparedAccessories'; header: string; type: 'prepared' }

const legacyAccessoryToField: Record<string, HireAccessoryId> = {
	monitor: 'monitorDock',
	keyboard: 'keyboard',
	mouse: 'mouse',
	'vertical mouse': 'mouse',
	headset: 'yealink',
	bag: 'bag',
	backpack: 'backpack',
	pointer: 'presenter',
	printer: 'printer',
	'laptop pad': 'laptopStand',
}

const hireExportColumns: HireExportColumn[] = [
	{ key: 'purchaseRequest', header: 'Service Desk' },
	{ key: 'targetUser', header: 'Uzytkownik' },
	{ key: 'startDate', header: 'Data rozpoczecia pracy' },
	{ key: 'laptopModel', header: 'Laptop - model' },
	{ key: 'laptopRu', header: 'Laptop - RU' },
	{ key: 'laptopStatus', header: 'Laptop - Status' },
	{ key: 'laptopWarehouse', header: 'Laptop - eMagazyn' },
	{ key: 'monitorRu', header: 'Monitor - RU' },
	{ key: 'monitorStatus', header: 'Monitor - Status' },
	{ key: 'monitorWarehouse', header: 'Monitor - eMagazyn' },
	{ key: 'preparedBy', header: 'Przygotowal/a' },
	{ key: 'deliveryLocation', header: 'Lokalizacja' },
	{ key: 'peripheralNotes', header: 'Uwagi' },
	...hireAccessoryCatalog.map<HireExportColumn>(accessory => ({
		key: accessory.id,
		header: accessory.label,
		type: 'flag',
	})),
	{ key: 'preparedAccessories', header: 'Przygotowane akcesoria', type: 'prepared' },
]

const hireImportAliases = {
	bag: ['Torba'],
	backpack: ['Plecak'],
	deliveryLocation: ['Lokalizacja', 'Lokalizacja do wydania'],
	keyboard: ['Klawiatura'],
	laptopModel: ['Laptop - model', 'Laptop model', 'Sprzet SN', 'SN sprzetu', 'Sprzet / SN'],
	laptopRu: ['Laptop - RU', 'Laptop RU', 'RU laptopa', 'Dzial stanowisko', 'Sekcja'],
	laptopStand: ['Podstawka pod laptop', 'Podstawka pod laptopa', 'Podkladka pod laptopa'],
	laptopStatus: ['Laptop - Status', 'Laptop Status'],
	laptopWarehouse: ['Laptop - eMagazyn', 'Laptop eMagazyn', 'Laptop e magazyn'],
	legacyAccessories: ['Akcesoria'],
	lenovo: ['Lenovo'],
	logiZoneVibe: ['Logi Zone Vibe'],
	monitorDock: ['Monitor'],
	monitorRu: ['Monitor - RU', 'Monitor RU'],
	monitorStatus: ['Monitor - Status', 'Monitor Status'],
	monitorWarehouse: ['Monitor - eMagazyn', 'Monitor eMagazyn', 'Monitor e magazyn'],
	mouse: ['Mysz'],
	peripheralNotes: [
		'Uwagi',
		'Uwagi do peryferiow',
		'Uwagi dot. peryferiow',
		'Komentarz',
		'Prosze o wpisanie w kolumnach obok',
	],
	preparedAccessories: ['Przygotowane akcesoria', 'Prepared accessories'],
	preparedBy: ['Przygotowal/a', 'Przygotowal'],
	presenter: ['Prezenter'],
	printer: ['Drukarka'],
	purchaseRequest: ['Service Desk', 'Zgloszenie na zakup sprzetu', 'Zakup sprzetu', 'Zakup'],
	startDate: ['Data rozpoczecia pracy', 'Data rozpoczecia', 'Start'],
	targetUser: ['Uzytkownik', 'Uzytkownik docelowy', 'Imie i nazwisko'],
	yealink: ['Yealink'],
} as const

function normalizeHireText(value: unknown) {
	return String(value ?? '').trim()
}

function mapAccessoryValueToId(value: unknown) {
	const normalizedValue = normalizeSpreadsheetLookup(value)
	if (!normalizedValue) return null

	if (legacyAccessoryToField[normalizedValue]) {
		return legacyAccessoryToField[normalizedValue]
	}

	const directMatch = hireAccessoryIds.find(accessoryId => normalizeSpreadsheetLookup(accessoryId) === normalizedValue)
	if (directMatch) return directMatch

	const labelMatch = hireAccessoryCatalog.find(
		accessory =>
			normalizeSpreadsheetLookup(accessory.label) === normalizedValue ||
			normalizeSpreadsheetLookup(accessory.shortLabel) === normalizedValue
	)

	return labelMatch?.id || null
}

function createEmptyAccessoryFlags() {
	return Object.fromEntries(hireAccessoryIds.map(accessoryId => [accessoryId, false])) as Record<HireAccessoryId, boolean>
}

export function buildHireExportRows(records: HireRecord[]): SpreadsheetRow[] {
	return records.map(record => {
		const row: SpreadsheetRow = {}

		hireExportColumns.forEach(column => {
			if (column.type === 'flag') {
				row[column.header] = record[column.key as HireAccessoryId] ? 1 : 0
				return
			}

			if (column.type === 'prepared') {
				row[column.header] = record.preparedAccessories.join(', ')
				return
			}

			row[column.header] = record[column.key] || ''
		})

		return row
	})
}

export function prepareImportedHires(rows: SpreadsheetRow[], existingRecords: HireRecord[]) {
	const importedAt = new Date().toISOString()
	const existingKeys = new Set(existingRecords.map(record => getHireDuplicateKey(record)).filter(Boolean))
	const importedKeys = new Set<string>()
	const importedRecords: HireRecord[] = []
	let skippedCount = 0

	rows.forEach(row => {
		const lookup = createSpreadsheetRowLookup(row)
		const accessoryFlags = createEmptyAccessoryFlags()

		hireAccessoryIds.forEach(accessoryId => {
			accessoryFlags[accessoryId] = normalizeSpreadsheetFlag(readSpreadsheetValue(lookup, [...hireImportAliases[accessoryId]]))
		})

		splitSpreadsheetList(readSpreadsheetValue(lookup, [...hireImportAliases.legacyAccessories])).forEach(entry => {
			const mappedAccessoryId = mapAccessoryValueToId(entry)
			if (mappedAccessoryId) {
				accessoryFlags[mappedAccessoryId] = true
			}
		})

		const preparedAccessories = splitSpreadsheetList(
			readSpreadsheetValue(lookup, [...hireImportAliases.preparedAccessories])
		)
			.map(entry => mapAccessoryValueToId(entry))
			.filter((accessoryId): accessoryId is HireAccessoryId => Boolean(accessoryId && accessoryFlags[accessoryId]))

		const nextRecord = normalizeHireRecord({
			purchaseRequest: normalizeHireText(readSpreadsheetValue(lookup, [...hireImportAliases.purchaseRequest])),
			targetUser: normalizeHireText(readSpreadsheetValue(lookup, [...hireImportAliases.targetUser])),
			startDate: normalizeSpreadsheetDate(readSpreadsheetValue(lookup, [...hireImportAliases.startDate])),
			laptopModel: normalizeHireText(readSpreadsheetValue(lookup, [...hireImportAliases.laptopModel])).toUpperCase(),
			laptopRu: normalizeHireText(readSpreadsheetValue(lookup, [...hireImportAliases.laptopRu])).toUpperCase(),
			laptopStatus: normalizeHireText(readSpreadsheetValue(lookup, [...hireImportAliases.laptopStatus])),
			laptopWarehouse: normalizeHireText(readSpreadsheetValue(lookup, [...hireImportAliases.laptopWarehouse])),
			monitorRu: normalizeHireText(readSpreadsheetValue(lookup, [...hireImportAliases.monitorRu])).toUpperCase(),
			monitorStatus: normalizeHireText(readSpreadsheetValue(lookup, [...hireImportAliases.monitorStatus])),
			monitorWarehouse: normalizeHireText(readSpreadsheetValue(lookup, [...hireImportAliases.monitorWarehouse])),
			preparedBy: normalizeHireText(readSpreadsheetValue(lookup, [...hireImportAliases.preparedBy])),
			deliveryLocation: normalizeHireText(readSpreadsheetValue(lookup, [...hireImportAliases.deliveryLocation])),
			peripheralNotes: normalizeHireText(readSpreadsheetValue(lookup, [...hireImportAliases.peripheralNotes])),
			preparedAccessories,
			createdAt: importedAt,
			updatedAt: importedAt,
			...accessoryFlags,
		})

		if (!nextRecord.targetUser || !nextRecord.startDate) {
			skippedCount += 1
			return
		}

		const duplicateKey = getHireDuplicateKey(nextRecord)
		if (duplicateKey && (existingKeys.has(duplicateKey) || importedKeys.has(duplicateKey))) {
			skippedCount += 1
			return
		}

		if (duplicateKey) {
			importedKeys.add(duplicateKey)
		}

		importedRecords.push(nextRecord)
	})

	return {
		importedRecords,
		mergedRecords: sortHires([...existingRecords, ...importedRecords]),
		skippedCount,
	}
}
