export type SpreadsheetRow = Record<string, unknown>

function createDateFromParts(year: number, month: number, day: number) {
	const parsedDate = new Date(year, month - 1, day)
	if (Number.isNaN(parsedDate.getTime())) return null
	if (parsedDate.getFullYear() !== year || parsedDate.getMonth() !== month - 1 || parsedDate.getDate() !== day) {
		return null
	}

	return parsedDate
}

export function parseSpreadsheetDate(value: unknown) {
	if (value instanceof Date) {
		const parsedDate = new Date(value.getTime())
		return Number.isNaN(parsedDate.getTime()) ? null : parsedDate
	}

	if (typeof value === 'number' && Number.isFinite(value)) {
		const excelDate = new Date(Date.UTC(1899, 11, 30) + value * 86_400_000)
		return createDateFromParts(excelDate.getUTCFullYear(), excelDate.getUTCMonth() + 1, excelDate.getUTCDate())
	}

	const stringValue = String(value ?? '').trim()
	if (!stringValue) return null

	if (/^\d+(\.\d+)?$/.test(stringValue)) {
		return parseSpreadsheetDate(Number(stringValue))
	}

	const isoDateMatch = stringValue.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
	if (isoDateMatch) {
		return createDateFromParts(Number(isoDateMatch[1]), Number(isoDateMatch[2]), Number(isoDateMatch[3]))
	}

	const isoDateTimeMatch = stringValue.match(/^(\d{4})-(\d{1,2})-(\d{1,2})T/)
	if (isoDateTimeMatch) {
		return createDateFromParts(Number(isoDateTimeMatch[1]), Number(isoDateTimeMatch[2]), Number(isoDateTimeMatch[3]))
	}

	const localDateMatch = stringValue.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/)
	if (localDateMatch) {
		return createDateFromParts(Number(localDateMatch[3]), Number(localDateMatch[2]), Number(localDateMatch[1]))
	}

	const parsedDate = new Date(stringValue)
	return Number.isNaN(parsedDate.getTime()) ? null : parsedDate
}

export function formatSpreadsheetDate(value: unknown) {
	const parsedDate = parseSpreadsheetDate(value)
	if (!parsedDate) return ''

	const year = parsedDate.getFullYear()
	const month = String(parsedDate.getMonth() + 1).padStart(2, '0')
	const day = String(parsedDate.getDate()).padStart(2, '0')
	return `${year}-${month}-${day}`
}

export function normalizeSpreadsheetDate(value: unknown) {
	return formatSpreadsheetDate(value)
}

export function normalizeSpreadsheetLookup(value: unknown) {
	return String(value ?? '')
		.trim()
		.toLowerCase()
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/[^a-z0-9]+/g, ' ')
		.trim()
}

export function createSpreadsheetRowLookup(row: SpreadsheetRow) {
	const lookup = new Map<string, unknown>()

	for (const [key, value] of Object.entries(row || {})) {
		lookup.set(normalizeSpreadsheetLookup(key), value)
	}

	return lookup
}

export function readSpreadsheetValue(lookup: Map<string, unknown>, aliases: string[]) {
	const normalizedAliases = aliases.map(alias => normalizeSpreadsheetLookup(alias)).filter(Boolean)

	for (const alias of normalizedAliases) {
		if (lookup.has(alias)) {
			return lookup.get(alias)
		}
	}

	for (const [lookupKey, lookupValue] of lookup.entries()) {
		if (normalizedAliases.some(alias => lookupKey.includes(alias))) {
			return lookupValue
		}
	}

	return ''
}

export function splitSpreadsheetList(value: unknown) {
	return String(value ?? '')
		.split(',')
		.map(entry => String(entry || '').trim())
		.filter(Boolean)
}

export function normalizeSpreadsheetFlag(value: unknown) {
	if (typeof value === 'boolean') return value
	if (typeof value === 'number') return value === 1

	const normalizedValue = normalizeSpreadsheetLookup(value)
	return ['1', 'true', 'tak', 'yes', 'y', 'x', 'zamowione', 'ordered'].includes(normalizedValue)
}
