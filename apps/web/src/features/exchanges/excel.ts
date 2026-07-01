import type { SpreadsheetRow } from '../../lib/spreadsheet'
import {
	createSpreadsheetRowLookup,
	normalizeSpreadsheetDate,
	normalizeSpreadsheetLookup,
	readSpreadsheetValue,
	splitSpreadsheetList,
} from '../../lib/spreadsheet'

import type { ExchangeRecord } from './types'
import {
	buildExchangeDuplicateKey,
	normalizeExchangeAccessories,
	normalizeSerialNumber,
	sortExchangeRecords,
} from './utils'

const exchangeImportAliases = {
	accessories: ['Akcesoria'],
	name: ['Pracownik', 'Uzytkownik'],
	newSn: ['Nowy SN', 'SN do wydania'],
	notes: ['Uwagi', 'Notatka', 'Notatki'],
	oldSn: ['Stary SN', 'SN do zwrotu'],
	plannedDate: ['Data', 'Data planowanej wymiany'],
	status: ['Status'],
} as const

function normalizeExchangeText(value: unknown) {
	return String(value ?? '').trim()
}

function normalizeExchangeStatus(value: unknown) {
	const normalizedValue = normalizeSpreadsheetLookup(value)
	return ['done', 'zakonczono', 'zakonczona', 'completed'].includes(normalizedValue) ? 'done' : 'pending'
}

export function buildExchangeExportRows(records: ExchangeRecord[]): SpreadsheetRow[] {
	return records.map(record => ({
		Pracownik: record.name,
		Data: record.plannedDate,
		'Stary SN': record.oldSn,
		'Nowy SN': record.newSn,
		Akcesoria: record.accessories.join(', '),
		Status: record.status === 'done' ? 'Zakonczono' : 'Planowana',
		Uwagi: record.notes,
	}))
}

export function prepareImportedExchangeRecords(rows: SpreadsheetRow[], existingRecords: ExchangeRecord[]) {
	const importedAt = new Date().toISOString()
	const existingKeys = new Set(existingRecords.map(record => buildExchangeDuplicateKey(record)).filter(Boolean))
	const importedKeys = new Set<string>()
	const importedRecords: ExchangeRecord[] = []
	let skippedCount = 0

	rows.forEach((row, index) => {
		const lookup = createSpreadsheetRowLookup(row)
		const nextRecord: ExchangeRecord = {
			id: `exchange-import-${Date.now()}-${index}`,
			name: normalizeExchangeText(readSpreadsheetValue(lookup, [...exchangeImportAliases.name])).toUpperCase(),
			plannedDate: normalizeSpreadsheetDate(readSpreadsheetValue(lookup, [...exchangeImportAliases.plannedDate])),
			oldSn: normalizeSerialNumber(String(readSpreadsheetValue(lookup, [...exchangeImportAliases.oldSn]) || '')),
			newSn: normalizeSerialNumber(String(readSpreadsheetValue(lookup, [...exchangeImportAliases.newSn]) || '')),
			notes: normalizeExchangeText(readSpreadsheetValue(lookup, [...exchangeImportAliases.notes])),
			accessories: normalizeExchangeAccessories(
				splitSpreadsheetList(readSpreadsheetValue(lookup, [...exchangeImportAliases.accessories]))
			),
			status: normalizeExchangeStatus(readSpreadsheetValue(lookup, [...exchangeImportAliases.status])),
			createdAt: importedAt,
			updatedAt: importedAt,
		}

		if (!nextRecord.name || !nextRecord.plannedDate) {
			skippedCount += 1
			return
		}

		const duplicateKey = buildExchangeDuplicateKey(nextRecord)
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
		mergedRecords: sortExchangeRecords([...existingRecords, ...importedRecords]),
		skippedCount,
	}
}
