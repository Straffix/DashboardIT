import type { ExchangeAccessoryId, ExchangeDraft, ExchangeRecord } from './types'

export const exchangeAccessoryCatalog: Array<{ id: ExchangeAccessoryId; label: string; shortLabel: string }> = [
	{ id: 'mouse', label: 'Myszka', shortLabel: 'Mysz' },
	{ id: 'vertical-mouse', label: 'Mysz wertykalna', shortLabel: 'V-Mysz' },
	{ id: 'keyboard', label: 'Klawiatura', shortLabel: 'Klawiatura' },
	{ id: 'headset', label: 'Sluchawki', shortLabel: 'Headset' },
	{ id: 'monitor', label: 'Monitor', shortLabel: 'Monitor' },
	{ id: 'bag', label: 'Torba / Etui', shortLabel: 'Torba' },
	{ id: 'backpack', label: 'Plecak', shortLabel: 'Plecak' },
	{ id: 'pointer', label: 'Wskaznik', shortLabel: 'Wskaznik' },
	{ id: 'printer', label: 'Drukarka', shortLabel: 'Drukarka' },
	{ id: 'laptop-pad', label: 'Podkladka pod laptopa', shortLabel: 'Podkladka' },
]

const accessoryIds = new Set(exchangeAccessoryCatalog.map(item => item.id))

export function normalizeSerialNumber(value: string) {
	return value.trim().replace(/-/g, '').toUpperCase()
}

export function normalizeExchangeAccessories(accessories: string[]) {
	return Array.from(
		new Set(
			accessories
				.map(item => String(item || '').trim())
				.filter((item): item is ExchangeAccessoryId => accessoryIds.has(item as ExchangeAccessoryId))
		)
	)
}

export function createEmptyExchangeDraft(): ExchangeDraft {
	return {
		name: '',
		plannedDate: '',
		oldSn: '',
		newSn: '',
		notes: '',
		accessories: [],
	}
}

export function normalizeExchangeDraft(draft: ExchangeDraft): ExchangeDraft {
	return {
		name: draft.name.trim().toUpperCase(),
		plannedDate: draft.plannedDate,
		oldSn: normalizeSerialNumber(draft.oldSn),
		newSn: normalizeSerialNumber(draft.newSn),
		notes: draft.notes.trim(),
		accessories: normalizeExchangeAccessories(draft.accessories),
	}
}

export function buildExchangeDuplicateKey(record: Pick<ExchangeRecord, 'name' | 'plannedDate' | 'oldSn' | 'newSn'>) {
	const normalizedName = String(record.name || '').trim().toUpperCase()
	const normalizedDate = String(record.plannedDate || '').trim()
	const normalizedOldSn = normalizeSerialNumber(record.oldSn || '')
	const normalizedNewSn = normalizeSerialNumber(record.newSn || '')

	if (!normalizedName || !normalizedDate) return ''
	return `${normalizedName}::${normalizedDate}::${normalizedOldSn}::${normalizedNewSn}`
}

export function validateExchangeDraft(draft: ExchangeDraft, existingRecords: ExchangeRecord[], editingId?: string) {
	const normalizedDraft = normalizeExchangeDraft(draft)

	if (!normalizedDraft.name || !normalizedDraft.plannedDate) {
		return 'Uzupelnij pracownika i date planowanej wymiany.'
	}

	if (!normalizedDraft.oldSn && !normalizedDraft.newSn) {
		return 'Podaj przynajmniej jeden numer seryjny: zwrot albo wydanie.'
	}

	const duplicate = existingRecords.find(
		record =>
			record.id !== editingId && buildExchangeDuplicateKey(record) === buildExchangeDuplicateKey(normalizedDraft)
	)

	if (duplicate) {
		return 'Taki plan wymiany juz istnieje w bazie.'
	}

	return ''
}

export function matchesExchangeSearch(record: ExchangeRecord, query: string) {
	const normalizedQuery = query.trim().toUpperCase()
	if (!normalizedQuery) return true

	return [record.name, record.plannedDate, record.oldSn, record.newSn, record.notes, ...record.accessories].some(field =>
		String(field ?? '')
			.trim()
			.toUpperCase()
			.includes(normalizedQuery)
	)
}

export function getMonthKey(dateValue: string) {
	return String(dateValue || '').slice(0, 7)
}

export function getCurrentMonthKey() {
	const now = new Date()
	return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export function formatMonthLabel(monthKey: string) {
	const [yearText, monthText] = monthKey.split('-')
	const year = Number(yearText)
	const month = Number(monthText)
	if (!year || !month) return 'Wybrany miesiac'

	return new Date(year, month - 1, 1).toLocaleDateString('pl-PL', {
		month: 'long',
		year: 'numeric',
	})
}

export function getLatestExchangeMonthKey(records: ExchangeRecord[]) {
	const latestRecord = [...records].sort((left, right) => {
		return Date.parse(right.plannedDate || '') - Date.parse(left.plannedDate || '')
	})[0]

	return latestRecord ? getMonthKey(latestRecord.plannedDate) : ''
}

export function sortExchangeRecords(records: ExchangeRecord[]) {
	return [...records].sort((left, right) => {
		if (left.status !== right.status) {
			return left.status === 'pending' ? -1 : 1
		}

		const leftDate = Date.parse(left.plannedDate || '') || 0
		const rightDate = Date.parse(right.plannedDate || '') || 0
		if (leftDate !== rightDate) {
			return leftDate - rightDate
		}

		return left.name.localeCompare(right.name, 'pl')
	})
}

export function getAccessoryLabel(accessoryId: ExchangeAccessoryId) {
	return exchangeAccessoryCatalog.find(item => item.id === accessoryId)?.shortLabel || accessoryId
}
