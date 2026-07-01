import type { HireAccessoryFlags, HireAccessoryId, HireDraft, HireInlineEditableField, HireRecord } from './types'
import { hireAccessoryIds } from './types'

export const hireAccessoryCatalog: Array<{
	id: HireAccessoryId
	label: string
	shortLabel: string
}> = [
	{ id: 'monitorDock', label: 'Monitor', shortLabel: 'Monitor' },
	{ id: 'mouse', label: 'Mysz', shortLabel: 'Mysz' },
	{ id: 'keyboard', label: 'Klawiatura', shortLabel: 'Klawiatura' },
	{ id: 'yealink', label: 'Yealink', shortLabel: 'Yealink' },
	{ id: 'logiZoneVibe', label: 'Logi Zone Vibe', shortLabel: 'Logi Zone' },
	{ id: 'lenovo', label: 'Lenovo', shortLabel: 'Lenovo' },
	{ id: 'bag', label: 'Torba', shortLabel: 'Torba' },
	{ id: 'backpack', label: 'Plecak', shortLabel: 'Plecak' },
	{ id: 'laptopStand', label: 'Podstawka pod laptop', shortLabel: 'Podstawka' },
	{ id: 'presenter', label: 'Prezenter', shortLabel: 'Prezenter' },
	{ id: 'printer', label: 'Drukarka', shortLabel: 'Drukarka' },
]

export const preparedByOptions = [
	'A. BISKUPSKA',
	'A. LISIECKI',
	'B. BRODA',
	'E. LAKOMY',
	'G. HADLO',
	'J. GAUZE',
	'K. FERENC',
	'K. GRABOWSKA',
	'K. KOWALSKI',
	'K. KOZAKIEWICZ',
	'K. NARUK',
	'L. DZIKIEWICZ',
	'L. MAJDA',
	'M. BAZAN',
	'M. PAWSKI',
	'M. PEDZIWIATR',
	'M. WOJTAL',
	'O. ADAMSKA',
	'P. CZERSKI',
	'P. LASKOWSKA',
	'P. SKIBA',
	'R. GLINSKI',
	'R. PLACZEK',
	'S. WALINOWICZ',
] as const

export const laptopStatusOptions = [
	'W trakcie',
	'Gotowy do wydania',
	'Wydany',
	'Nie zostal odebrany w terminie',
	'Do ponownej dystrybucji',
] as const

export const warehouseStatusOptions = [
	'Brak konta',
	'Dokument wystawiony, do potwierdzenia',
	'Dokument potwierdzony',
] as const

export const monitorStatusOptions = [
	'W trakcie / czekamy na dostawe',
	'Gotowy do wydania',
	'Wydany',
	'Nie zostal odebrany w terminie',
	'Do ponownej dystrybucji',
	'Nie byl zamowiony',
] as const

const legacyAccessoryToField: Record<string, HireAccessoryId> = {
	monitor: 'monitorDock',
	keyboard: 'keyboard',
	mouse: 'mouse',
	'vertical-mouse': 'mouse',
	headset: 'yealink',
	bag: 'bag',
	backpack: 'backpack',
	pointer: 'presenter',
	printer: 'printer',
	'laptop-pad': 'laptopStand',
}

function normalizeText(value: unknown) {
	return String(value ?? '').trim()
}

function normalizeLookup(value: unknown) {
	return normalizeText(value)
		.toLowerCase()
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/[^a-z0-9]+/g, ' ')
		.trim()
}

function normalizeDateValue(value: unknown) {
	const normalizedValue = normalizeText(value)
	if (!normalizedValue) return ''

	const directMatch = normalizedValue.match(/^(\d{4})-(\d{2})-(\d{2})$/)
	if (directMatch) return normalizedValue

	const parsedDate = new Date(normalizedValue)
	if (Number.isNaN(parsedDate.getTime())) return ''

	return formatDate(parsedDate)
}

function normalizeFlagValue(value: unknown) {
	if (typeof value === 'boolean') return value
	if (typeof value === 'number') return value === 1

	const normalizedValue = normalizeLookup(value)
	return ['1', 'true', 'tak', 'yes', 'y', 'x', 'zamowione', 'ordered'].includes(normalizedValue)
}

function createAccessoryFlags(): HireAccessoryFlags {
	return Object.fromEntries(hireAccessoryIds.map(accessoryId => [accessoryId, false])) as HireAccessoryFlags
}

function getNormalizedAccessoryFlags(source: unknown): HireAccessoryFlags {
	const rawRecord = source && typeof source === 'object' ? source : {}
	const accessoryFlags = createAccessoryFlags()
	const record = rawRecord as Record<string, unknown>
	const rawAccessories = Array.isArray(record.accessories)
		? record.accessories
		: typeof record.accessories === 'string'
			? record.accessories.split(',')
			: []

	rawAccessories.forEach(accessory => {
		const normalizedAccessory = legacyAccessoryToField[normalizeText(accessory)]
		if (normalizedAccessory) {
			accessoryFlags[normalizedAccessory] = true
		}
	})

	hireAccessoryIds.forEach(accessoryId => {
		if (Object.prototype.hasOwnProperty.call(record, accessoryId)) {
			accessoryFlags[accessoryId] = normalizeFlagValue(record[accessoryId])
		}
	})

	if (normalizeFlagValue(record.keyboardMouseSet)) {
		accessoryFlags.mouse = true
		accessoryFlags.keyboard = true
	}

	return accessoryFlags
}

function normalizePreparedAccessories(value: unknown, accessoryFlags: HireAccessoryFlags) {
	const rawPreparedAccessories = Array.isArray(value)
		? value
		: typeof value === 'string'
			? value.split(',')
			: []

	const activeAccessoryIds = new Set(hireAccessoryIds.filter(accessoryId => accessoryFlags[accessoryId]))
	const preparedAccessoryIds = new Set<HireAccessoryId>()

	rawPreparedAccessories.forEach(entry => {
		const rawValue = normalizeText(entry)
		if (!rawValue) return

		const normalizedAccessoryId = (legacyAccessoryToField[rawValue] || rawValue) as HireAccessoryId
		if (!hireAccessoryIds.includes(normalizedAccessoryId)) return
		if (!activeAccessoryIds.has(normalizedAccessoryId)) return

		preparedAccessoryIds.add(normalizedAccessoryId)
	})

	return hireAccessoryIds.filter(accessoryId => preparedAccessoryIds.has(accessoryId))
}

function createStableId(source: Record<string, unknown>) {
	const key = [
		normalizeText(source.purchaseRequest),
		normalizeText(source.targetUser || source.name),
		normalizeDateValue(source.startDate || source.date),
		normalizeText(source.laptopRu || source.ru),
		normalizeText(source.laptopModel || source.sn),
	]
		.filter(Boolean)
		.join('::')

	if (!key) {
		return `hire-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`
	}

	let hash = 0
	for (let index = 0; index < key.length; index += 1) {
		hash = (hash << 5) - hash + key.charCodeAt(index)
		hash |= 0
	}

	return `hire-${Math.abs(hash)}`
}

export function createEmptyHireDraft(): HireDraft {
	return {
		purchaseRequest: '',
		targetUser: '',
		startDate: '',
		laptopModel: '',
		laptopRu: '',
		laptopStatus: '',
		laptopWarehouse: '',
		monitorRu: '',
		monitorStatus: '',
		monitorWarehouse: '',
		preparedBy: '',
		deliveryLocation: '',
		peripheralNotes: '',
		...createAccessoryFlags(),
	}
}

export function normalizeHireDraft(draft: HireDraft): HireDraft {
	return {
		purchaseRequest: normalizeText(draft.purchaseRequest),
		targetUser: normalizeText(draft.targetUser),
		startDate: normalizeDateValue(draft.startDate),
		laptopModel: normalizeText(draft.laptopModel).toUpperCase(),
		laptopRu: normalizeText(draft.laptopRu).toUpperCase(),
		laptopStatus: normalizeText(draft.laptopStatus),
		laptopWarehouse: normalizeText(draft.laptopWarehouse),
		monitorRu: normalizeText(draft.monitorRu).toUpperCase(),
		monitorStatus: normalizeText(draft.monitorStatus),
		monitorWarehouse: normalizeText(draft.monitorWarehouse),
		preparedBy: normalizeText(draft.preparedBy),
		deliveryLocation: normalizeText(draft.deliveryLocation),
		peripheralNotes: normalizeText(draft.peripheralNotes),
		...hireAccessoryIds.reduce<HireAccessoryFlags>((flags, accessoryId) => {
			flags[accessoryId] = Boolean(draft[accessoryId])
			return flags
		}, createAccessoryFlags()),
	}
}

export function normalizeHireRecord(source: unknown): HireRecord {
	const rawRecord = source && typeof source === 'object' ? source : {}
	const record = rawRecord as Record<string, unknown>
	const details = record.details && typeof record.details === 'object' ? (record.details as Record<string, unknown>) : {}
	const mergedRecord = { ...record, ...details }
	const accessoryFlags = getNormalizedAccessoryFlags(mergedRecord)

	return {
		id: normalizeText(mergedRecord.id) || createStableId(mergedRecord),
		purchaseRequest: normalizeText(mergedRecord.purchaseRequest),
		targetUser: normalizeText(mergedRecord.targetUser || mergedRecord.name),
		startDate: normalizeDateValue(mergedRecord.startDate || mergedRecord.date),
		laptopModel: normalizeText(mergedRecord.laptopModel || mergedRecord.sn).toUpperCase(),
		laptopRu: normalizeText(mergedRecord.laptopRu || mergedRecord.ru).toUpperCase(),
		laptopStatus: normalizeText(mergedRecord.laptopStatus),
		laptopWarehouse: normalizeText(mergedRecord.laptopWarehouse),
		monitorRu: normalizeText(mergedRecord.monitorRu).toUpperCase(),
		monitorStatus: normalizeText(mergedRecord.monitorStatus),
		monitorWarehouse: normalizeText(mergedRecord.monitorWarehouse),
		preparedBy: normalizeText(mergedRecord.preparedBy),
		deliveryLocation: normalizeText(mergedRecord.deliveryLocation),
		peripheralNotes: normalizeText(mergedRecord.peripheralNotes || mergedRecord.notes),
		preparedAccessories: normalizePreparedAccessories(mergedRecord.preparedAccessories, accessoryFlags),
		createdAt: normalizeText(mergedRecord.createdAt),
		updatedAt: normalizeText(mergedRecord.updatedAt || mergedRecord.createdAt),
		...accessoryFlags,
	}
}

export function buildHireRecordFromDraft(draft: HireDraft, existingRecord?: HireRecord | null): HireRecord {
	const normalizedDraft = normalizeHireDraft(draft)
	const now = new Date().toISOString()
	const preparedAccessories = existingRecord
		? existingRecord.preparedAccessories.filter(accessoryId => normalizedDraft[accessoryId])
		: []

	return {
		id: existingRecord?.id || `hire-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
		createdAt: existingRecord?.createdAt || now,
		updatedAt: now,
		preparedAccessories,
		...normalizedDraft,
	}
}

export function createHireDraftFromRecord(record: HireRecord): HireDraft {
	return {
		purchaseRequest: record.purchaseRequest,
		targetUser: record.targetUser,
		startDate: record.startDate,
		laptopModel: record.laptopModel,
		laptopRu: record.laptopRu,
		laptopStatus: record.laptopStatus,
		laptopWarehouse: record.laptopWarehouse,
		monitorRu: record.monitorRu,
		monitorStatus: record.monitorStatus,
		monitorWarehouse: record.monitorWarehouse,
		preparedBy: record.preparedBy,
		deliveryLocation: record.deliveryLocation,
		peripheralNotes: record.peripheralNotes,
		...hireAccessoryIds.reduce<HireAccessoryFlags>((flags, accessoryId) => {
			flags[accessoryId] = record[accessoryId]
			return flags
		}, createAccessoryFlags()),
	}
}

export function getHireDuplicateKey(record: Partial<HireRecord> | Partial<HireDraft>) {
	const purchaseRequest = normalizeLookup(record.purchaseRequest)
	const targetUser = normalizeLookup(record.targetUser)
	const startDate = normalizeDateValue(record.startDate)
	const laptopRu = normalizeLookup(record.laptopRu)
	const laptopModel = normalizeLookup(record.laptopModel)

	if (!targetUser && !purchaseRequest) return ''
	return [purchaseRequest || '-', targetUser || '-', startDate || '-', laptopRu || '-', laptopModel || '-'].join('::')
}

export function sortHires(records: HireRecord[]) {
	return [...records].sort((left, right) => {
		const leftDate = Date.parse(left.startDate) || 0
		const rightDate = Date.parse(right.startDate) || 0
		if (leftDate !== rightDate) return leftDate - rightDate

		return left.targetUser.localeCompare(right.targetUser, 'pl')
	})
}

export function dedupeHires(records: HireRecord[]) {
	const seenKeys = new Set<string>()
	const deduplicatedRecords: HireRecord[] = []

	records.forEach(record => {
		const key = getHireDuplicateKey(record)
		if (key && seenKeys.has(key)) return
		if (key) {
			seenKeys.add(key)
		}
		deduplicatedRecords.push(record)
	})

	return sortHires(deduplicatedRecords)
}

export function getMonthKey(value: string) {
	return value.slice(0, 7)
}

export function getCurrentMonthKey() {
	return formatDate(new Date()).slice(0, 7)
}

export function getLatestHireMonthKey(records: HireRecord[]) {
	const latestRecord = [...records].sort(
		(left, right) => (Date.parse(right.startDate) || 0) - (Date.parse(left.startDate) || 0)
	)[0]

	return latestRecord?.startDate.slice(0, 7)
}

export function formatMonthLabel(monthKey: string) {
	if (!monthKey) return 'Brak miesiaca'

	const parsedDate = new Date(`${monthKey}-01T00:00:00`)
	if (Number.isNaN(parsedDate.getTime())) return monthKey

	return parsedDate.toLocaleDateString('pl-PL', {
		month: 'long',
		year: 'numeric',
	})
}

export function formatDate(value: Date | string) {
	const parsedDate = value instanceof Date ? new Date(value.getTime()) : new Date(value)
	if (Number.isNaN(parsedDate.getTime())) return ''

	const year = parsedDate.getFullYear()
	const month = String(parsedDate.getMonth() + 1).padStart(2, '0')
	const day = String(parsedDate.getDate()).padStart(2, '0')
	return `${year}-${month}-${day}`
}

export function getActiveAccessoryIds(record: HireRecord) {
	return hireAccessoryIds.filter(accessoryId => record[accessoryId])
}

export function getAccessoryLabel(accessoryId: HireAccessoryId) {
	return hireAccessoryCatalog.find(accessory => accessory.id === accessoryId)?.shortLabel || accessoryId
}

export function getAccessoryProgress(record: HireRecord) {
	const activeAccessoryIds = getActiveAccessoryIds(record)
	const preparedCount = record.preparedAccessories.filter(accessoryId => activeAccessoryIds.includes(accessoryId)).length

	return {
		total: activeAccessoryIds.length,
		prepared: preparedCount,
	}
}

export function matchesHireSearch(record: HireRecord, query: string) {
	const normalizedQuery = normalizeLookup(query)
	if (!normalizedQuery) return true

	const searchValues = [
		record.purchaseRequest,
		record.targetUser,
		record.startDate,
		record.laptopModel,
		record.laptopRu,
		record.laptopStatus,
		record.laptopWarehouse,
		record.monitorRu,
		record.monitorStatus,
		record.monitorWarehouse,
		record.preparedBy,
		record.deliveryLocation,
		record.peripheralNotes,
		...getActiveAccessoryIds(record).map(accessoryId => getAccessoryLabel(accessoryId)),
	]

	return searchValues.some(value => normalizeLookup(value).includes(normalizedQuery))
}

export function getHireStatusTone(value: string) {
	const normalizedValue = normalizeLookup(value)
	if (!normalizedValue) return 'neutral'

	if (normalizedValue.includes('wydany') || normalizedValue.includes('potwierdzony') || normalizedValue.includes('gotowy do wydania')) {
		return 'active'
	}

	if (
		normalizedValue.includes('do ponownej dystrybucji') ||
		normalizedValue.includes('nie zostal odebrany') ||
		normalizedValue.includes('brak konta')
	) {
		return 'expired'
	}

	if (
		normalizedValue.includes('w trakcie') ||
		normalizedValue.includes('czekamy') ||
		normalizedValue.includes('do potwierdzenia') ||
		normalizedValue.includes('nie byl zamowiony')
	) {
		return 'warning'
	}

	return 'neutral'
}

export function getInlineEditOptions(fieldId: HireInlineEditableField) {
	switch (fieldId) {
		case 'laptopStatus':
			return laptopStatusOptions
		case 'laptopWarehouse':
			return warehouseStatusOptions
		case 'monitorStatus':
			return monitorStatusOptions
		case 'monitorWarehouse':
			return warehouseStatusOptions
	}
}

export function formatAuditDateTime(value: string) {
	if (!value) return 'Brak'

	const parsedDate = new Date(value)
	if (Number.isNaN(parsedDate.getTime())) return value

	return parsedDate.toLocaleString('pl-PL', {
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
	})
}

export function validateHireDraft(draft: HireDraft, records: HireRecord[], editingId?: string) {
	const normalizedDraft = normalizeHireDraft(draft)

	if (!normalizedDraft.targetUser || !normalizedDraft.startDate) {
		return 'Uzupelnij uzytkownika i date rozpoczecia pracy.'
	}

	const duplicateKey = getHireDuplicateKey(normalizedDraft)
	if (!duplicateKey) return ''

	const duplicate = records.find(record => record.id !== editingId && getHireDuplicateKey(record) === duplicateKey)
	if (duplicate) {
		return 'Taki onboarding juz istnieje. Otworz istniejacy wpis albo zmien dane.'
	}

	return ''
}
