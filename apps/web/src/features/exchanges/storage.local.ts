import { readMonitorDevices, replaceMonitorDevices } from '../monitor/storage.local'
import type { MonitorDevice } from '../monitor/types'
import { createDefaultDomainDate, formatDate } from '../monitor/utils'

import type { ExchangeDraft, ExchangeRecord } from './types'
import {
	buildExchangeDuplicateKey,
	getCurrentMonthKey,
	normalizeExchangeDraft,
	normalizeSerialNumber,
	sortExchangeRecords,
} from './utils'

const STORAGE_KEY = 'dashboardit.react.exchanges.records'

function ensureWindow() {
	return typeof window !== 'undefined'
}

function createRelativeDate(daysFromToday: number) {
	const date = new Date()
	date.setHours(0, 0, 0, 0)
	date.setDate(date.getDate() + daysFromToday)
	return formatDate(date)
}

const demoRecords: ExchangeRecord[] = sortExchangeRecords([
	{
		id: 'exchange-1',
		name: 'REKRUTACJA746',
		plannedDate: createRelativeDate(2),
		oldSn: 'PF928402',
		newSn: 'NEW667722',
		notes: 'Wydanie z nowa torba i myszka.',
		accessories: ['mouse', 'bag'],
		status: 'pending',
		createdAt: '2026-06-14T09:00:00.000Z',
		updatedAt: '2026-06-14T09:00:00.000Z',
	},
	{
		id: 'exchange-2',
		name: 'OPS321',
		plannedDate: createRelativeDate(9),
		oldSn: 'AB774411',
		newSn: 'OPS992100',
		notes: 'Do wydania tez monitor i klawiatura.',
		accessories: ['monitor', 'keyboard'],
		status: 'pending',
		createdAt: '2026-06-16T11:30:00.000Z',
		updatedAt: '2026-06-16T11:30:00.000Z',
	},
	{
		id: 'exchange-3',
		name: 'MARKETING512',
		plannedDate: `${getCurrentMonthKey()}-05`,
		oldSn: 'MK100221',
		newSn: 'LT100220',
		notes: '',
		accessories: ['headset'],
		status: 'done',
		createdAt: '2026-06-02T10:15:00.000Z',
		updatedAt: '2026-06-08T13:40:00.000Z',
	},
])

function normalizeExchangeRecord(record: Partial<ExchangeRecord>): ExchangeRecord {
	return {
		id: String(record.id || ''),
		name: String(record.name || '').trim().toUpperCase(),
		plannedDate: String(record.plannedDate || '').trim(),
		oldSn: normalizeSerialNumber(String(record.oldSn || '')),
		newSn: normalizeSerialNumber(String(record.newSn || '')),
		notes: String(record.notes || '').trim(),
		accessories: Array.isArray(record.accessories) ? record.accessories.filter(Boolean) : [],
		status: record.status === 'done' ? 'done' : 'pending',
		createdAt: String(record.createdAt || ''),
		updatedAt: String(record.updatedAt || record.createdAt || ''),
	}
}

async function writeExchangeRecords(records: ExchangeRecord[]) {
	if (!ensureWindow()) return
	window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sortExchangeRecords(records)))
}

export async function replaceExchangeRecords(records: ExchangeRecord[]) {
	const nextRecords = sortExchangeRecords(records.map(record => normalizeExchangeRecord(record)))
	await writeExchangeRecords(nextRecords)
	return nextRecords
}

function syncMonitorDevicesAfterCompletion(exchange: ExchangeRecord, monitorDevices: MonitorDevice[]) {
	const now = new Date().toISOString()
	let nextDevices = [...monitorDevices]

	if (exchange.oldSn) {
		const normalizedOldSn = normalizeSerialNumber(exchange.oldSn)
		nextDevices = nextDevices.filter(device => normalizeSerialNumber(device.sn) !== normalizedOldSn)
	}

	if (exchange.newSn) {
		const normalizedNewSn = normalizeSerialNumber(exchange.newSn)
		nextDevices = nextDevices.filter(device => normalizeSerialNumber(device.sn) !== normalizedNewSn)
		nextDevices.unshift({
			id: `monitor-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
			name: exchange.name,
			ru: 'WYMIANA',
			sn: normalizedNewSn,
			deviceType: 'new',
			date: createDefaultDomainDate(),
			lastExtendedOn: '',
			createdAt: now,
			updatedAt: now,
		})
	}

	return nextDevices
}

export async function readExchangeRecords() {
	if (!ensureWindow()) return demoRecords

	const rawValue = window.localStorage.getItem(STORAGE_KEY)
	if (!rawValue) {
		window.localStorage.setItem(STORAGE_KEY, JSON.stringify(demoRecords))
		return demoRecords
	}

	try {
		const parsedValue = JSON.parse(rawValue) as ExchangeRecord[]
		if (!Array.isArray(parsedValue)) {
			window.localStorage.setItem(STORAGE_KEY, JSON.stringify(demoRecords))
			return demoRecords
		}

		const normalizedRecords = parsedValue.map(record => normalizeExchangeRecord(record))
		const deduplicated = Array.from(
			new Map(
				normalizedRecords
					.map(record => [buildExchangeDuplicateKey(record) || record.id, record] as const)
					.filter((entry): entry is readonly [string, ExchangeRecord] => Boolean(entry[0]))
			).values()
		)

		return sortExchangeRecords(deduplicated)
	} catch {
		window.localStorage.setItem(STORAGE_KEY, JSON.stringify(demoRecords))
		return demoRecords
	}
}

export async function createExchangeRecord(draft: ExchangeDraft) {
	const records = await readExchangeRecords()
	const normalizedDraft = normalizeExchangeDraft(draft)
	const now = new Date().toISOString()

	const nextRecord: ExchangeRecord = {
		id: `exchange-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
		name: normalizedDraft.name,
		plannedDate: normalizedDraft.plannedDate,
		oldSn: normalizedDraft.oldSn,
		newSn: normalizedDraft.newSn,
		notes: normalizedDraft.notes,
		accessories: normalizedDraft.accessories,
		status: 'pending',
		createdAt: now,
		updatedAt: now,
	}

	const nextRecords = sortExchangeRecords([nextRecord, ...records])
	await writeExchangeRecords(nextRecords)
	return nextRecords
}

export async function updateExchangeRecord(recordId: string, draft: ExchangeDraft) {
	const records = await readExchangeRecords()
	const normalizedDraft = normalizeExchangeDraft(draft)
	const now = new Date().toISOString()

	const nextRecords = sortExchangeRecords(
		records.map(record =>
			record.id === recordId
				? {
						...record,
						name: normalizedDraft.name,
						plannedDate: normalizedDraft.plannedDate,
						oldSn: normalizedDraft.oldSn,
						newSn: normalizedDraft.newSn,
						notes: normalizedDraft.notes,
						accessories: normalizedDraft.accessories,
						updatedAt: now,
					}
				: record
		)
	)

	await writeExchangeRecords(nextRecords)
	return nextRecords
}

export async function completeExchangeRecord(recordId: string) {
	const records = await readExchangeRecords()
	const targetRecord = records.find(record => record.id === recordId)
	if (!targetRecord || targetRecord.status === 'done') {
		return records
	}

	const now = new Date().toISOString()
	const nextRecords = sortExchangeRecords(
		records.map(record =>
			record.id === recordId
				? {
						...record,
						status: 'done',
						updatedAt: now,
					}
				: record
		)
	)

	await writeExchangeRecords(nextRecords)

	const monitorDevices = await readMonitorDevices()
	const completedRecord = nextRecords.find(record => record.id === recordId)
	if (completedRecord) {
		const nextMonitorDevices = syncMonitorDevicesAfterCompletion(completedRecord, monitorDevices)
		await replaceMonitorDevices(nextMonitorDevices)
	}

	return nextRecords
}

export async function deleteExchangeRecord(recordId: string) {
	const records = await readExchangeRecords()
	const nextRecords = sortExchangeRecords(records.filter(record => record.id !== recordId))
	await writeExchangeRecords(nextRecords)
	return nextRecords
}
