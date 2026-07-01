import type { HireDraft, HireRecord } from './types'
import { buildHireRecordFromDraft, dedupeHires, normalizeHireRecord, sortHires } from './utils'

const STORAGE_KEY = 'dashboardit.react.hires.records'
const LEGACY_STORAGE_KEY = 'nowe_zatrudnienia_dane'

const demoRecords: HireRecord[] = sortHires([
	normalizeHireRecord({
		id: 'hire-1',
		purchaseRequest: 'SD-2026-018',
		targetUser: 'Jan Kowalski',
		startDate: '2026-07-03',
		laptopModel: 'T14G5-PL-101',
		laptopRu: 'RU123456',
		laptopStatus: 'Gotowy do wydania',
		laptopWarehouse: 'Dokument potwierdzony',
		monitorRu: 'MON220144',
		monitorStatus: 'Wydany',
		monitorWarehouse: 'Dokument potwierdzony',
		preparedBy: 'A. LISIECKI',
		deliveryLocation: 'Warszawa / Centrala',
		peripheralNotes: 'Laptop i monitor do wydania pierwszego dnia.',
		monitorDock: true,
		mouse: true,
		keyboard: true,
		bag: true,
		createdAt: '2026-06-22T09:00:00.000Z',
		updatedAt: '2026-06-24T14:00:00.000Z',
	}),
	normalizeHireRecord({
		id: 'hire-2',
		purchaseRequest: 'SD-2026-024',
		targetUser: 'Anna Zielinska',
		startDate: '2026-07-15',
		laptopModel: 'E14G6-PL-204',
		laptopRu: 'RU123998',
		laptopStatus: 'W trakcie',
		laptopWarehouse: 'Dokument wystawiony, do potwierdzenia',
		monitorRu: 'MON220145',
		monitorStatus: 'W trakcie / czekamy na dostawe',
		monitorWarehouse: 'Brak konta',
		preparedBy: 'B. BRODA',
		deliveryLocation: 'Lodz / Biuro regionalne',
		peripheralNotes: 'Do przygotowania jeszcze sluchawki.',
		mouse: true,
		keyboard: true,
		yealink: true,
		backpack: true,
		createdAt: '2026-06-25T08:30:00.000Z',
		updatedAt: '2026-06-25T08:30:00.000Z',
	}),
	normalizeHireRecord({
		id: 'hire-3',
		purchaseRequest: 'SD-2026-031',
		targetUser: 'Mateusz Brozek',
		startDate: '2026-08-04',
		laptopModel: 'L14-PL-412',
		laptopRu: 'RU124221',
		laptopStatus: 'W trakcie',
		laptopWarehouse: '',
		monitorRu: '',
		monitorStatus: 'Nie byl zamowiony',
		monitorWarehouse: '',
		preparedBy: 'K. FERENC',
		deliveryLocation: 'Poznan',
		peripheralNotes: 'Bez monitora, tylko mobilny setup.',
		mouse: true,
		bag: true,
		laptopStand: true,
		createdAt: '2026-06-28T10:00:00.000Z',
		updatedAt: '2026-06-28T10:00:00.000Z',
	}),
])

type DeleteHireResult = {
	id: string
	success: boolean
}

function ensureWindow() {
	return typeof window !== 'undefined'
}

function readRawRecords(storageKey: string) {
	if (!ensureWindow()) return null

	const rawValue = window.localStorage.getItem(storageKey)
	if (!rawValue) return null

	try {
		const parsedValue = JSON.parse(rawValue) as unknown
		return Array.isArray(parsedValue) ? parsedValue : null
	} catch {
		return null
	}
}

function writeRecords(records: HireRecord[]) {
	if (!ensureWindow()) return
	window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records))
}

function parseRecords(records: unknown[]) {
	return dedupeHires(records.map(record => normalizeHireRecord(record)))
}

export async function readHires() {
	if (!ensureWindow()) return demoRecords

	const reactRecords = readRawRecords(STORAGE_KEY)
	if (reactRecords) {
		return parseRecords(reactRecords)
	}

	const legacyRecords = readRawRecords(LEGACY_STORAGE_KEY)
	if (legacyRecords) {
		const normalizedRecords = parseRecords(legacyRecords)
		writeRecords(normalizedRecords)
		return normalizedRecords
	}

	writeRecords(demoRecords)
	return demoRecords
}

export async function createHire(draft: HireDraft) {
	const records = await readHires()
	const nextRecord = buildHireRecordFromDraft(draft)
	const nextRecords = sortHires([...records, nextRecord])
	writeRecords(nextRecords)
	return nextRecord
}

export async function updateHire(recordId: string, draft: HireDraft) {
	const records = await readHires()
	const existingRecord = records.find(record => record.id === recordId)
	if (!existingRecord) {
		throw new Error('Nie znaleziono wpisu do aktualizacji.')
	}

	const nextRecord = buildHireRecordFromDraft(draft, existingRecord)
	const nextRecords = sortHires(records.map(record => (record.id === recordId ? nextRecord : record)))
	writeRecords(nextRecords)
	return nextRecord
}

export async function saveHireRecord(record: HireRecord) {
	const records = await readHires()
	const nextRecord = normalizeHireRecord(record)
	const hasExistingRecord = records.some(existingRecord => existingRecord.id === nextRecord.id)
	const nextRecords = hasExistingRecord
		? sortHires(records.map(existingRecord => (existingRecord.id === nextRecord.id ? nextRecord : existingRecord)))
		: sortHires([...records, nextRecord])

	writeRecords(nextRecords)
	return nextRecord
}

export async function replaceHires(records: HireRecord[]) {
	const nextRecords = parseRecords(records)
	writeRecords(nextRecords)
	return nextRecords
}

export async function deleteHire(recordId: string): Promise<DeleteHireResult> {
	const records = await readHires()
	const nextRecords = records.filter(record => record.id !== recordId)
	writeRecords(nextRecords)
	return {
		id: recordId,
		success: true,
	}
}
