import type { DeleteMonitorDeviceResponseDto } from './api-contract'
import type { MonitorDevice, MonitorDeviceDraft } from './types'
import { createDefaultDomainDate, normalizeMonitorDraft } from './utils'

const STORAGE_KEY = 'dashboardit.react.monitor.devices'

const demoDevices: MonitorDevice[] = [
	{
		id: 'monitor-1',
		name: 'REKRUTACJA746',
		ru: '746',
		sn: 'PF928402',
		deviceType: 'old',
		date: '2026-07-09',
		lastExtendedOn: '',
		createdAt: '2026-06-01T09:00:00.000Z',
		updatedAt: '2026-06-01T09:00:00.000Z',
	},
	{
		id: 'monitor-2',
		name: 'MARKETING512',
		ru: '512',
		sn: 'LT100220',
		deviceType: 'new',
		date: createDefaultDomainDate(),
		lastExtendedOn: '',
		createdAt: '2026-06-12T08:30:00.000Z',
		updatedAt: '2026-06-12T08:30:00.000Z',
	},
	{
		id: 'monitor-3',
		name: 'OPS321',
		ru: '321',
		sn: 'AB774411',
		deviceType: 'old',
		date: '2026-06-20',
		lastExtendedOn: '',
		createdAt: '2026-05-16T12:10:00.000Z',
		updatedAt: '2026-05-16T12:10:00.000Z',
	},
]

function ensureWindow() {
	return typeof window !== 'undefined'
}

export async function readMonitorDevices() {
	if (!ensureWindow()) return demoDevices

	const rawValue = window.localStorage.getItem(STORAGE_KEY)
	if (!rawValue) {
		window.localStorage.setItem(STORAGE_KEY, JSON.stringify(demoDevices))
		return demoDevices
	}

	try {
		const parsedValue = JSON.parse(rawValue) as MonitorDevice[]
		return Array.isArray(parsedValue) ? parsedValue : demoDevices
	} catch {
		window.localStorage.setItem(STORAGE_KEY, JSON.stringify(demoDevices))
		return demoDevices
	}
}

async function writeMonitorDevices(devices: MonitorDevice[]) {
	if (!ensureWindow()) return
	window.localStorage.setItem(STORAGE_KEY, JSON.stringify(devices))
}

export async function replaceMonitorDevices(devices: MonitorDevice[]) {
	await writeMonitorDevices(devices)
	return devices
}

export async function createMonitorDevice(draft: MonitorDeviceDraft): Promise<MonitorDevice> {
	const devices = await readMonitorDevices()
	const normalizedDraft = normalizeMonitorDraft(draft)
	const now = new Date().toISOString()

	const nextDevice: MonitorDevice = {
		id: `monitor-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
		name: normalizedDraft.name,
		ru: normalizedDraft.ru,
		sn: normalizedDraft.sn,
		deviceType: normalizedDraft.deviceType,
		date: normalizedDraft.deviceType === 'new' ? createDefaultDomainDate() : normalizedDraft.date,
		lastExtendedOn: '',
		createdAt: now,
		updatedAt: now,
	}

	const nextDevices = [nextDevice, ...devices]
	await writeMonitorDevices(nextDevices)
	return nextDevice
}

export async function updateMonitorDevice(deviceId: string, draft: MonitorDeviceDraft): Promise<MonitorDevice> {
	const devices = await readMonitorDevices()
	const normalizedDraft = normalizeMonitorDraft(draft)
	const now = new Date().toISOString()

	let updatedDevice: MonitorDevice | null = null
	const nextDevices = devices.map(device => {
		if (device.id !== deviceId) return device

		updatedDevice = {
			...device,
			name: normalizedDraft.name,
			ru: normalizedDraft.ru,
			sn: normalizedDraft.sn,
			deviceType: normalizedDraft.deviceType,
			date: normalizedDraft.deviceType === 'new' ? createDefaultDomainDate() : normalizedDraft.date,
			updatedAt: now,
		}

		return updatedDevice
	})

	await writeMonitorDevices(nextDevices)
	if (!updatedDevice) {
		throw new Error('Nie znaleziono urzadzenia do aktualizacji.')
	}

	return updatedDevice
}

export async function extendMonitorDevice(deviceId: string): Promise<MonitorDevice> {
	const devices = await readMonitorDevices()
	const today = new Date()
	today.setHours(0, 0, 0, 0)

	let extendedDevice: MonitorDevice | null = null
	const nextDevices = devices.map(device => {
		if (device.id !== deviceId) return device

		const currentExpiry = device.date ? new Date(device.date) : new Date(today)
		currentExpiry.setHours(0, 0, 0, 0)

		const baseDate = Number.isNaN(currentExpiry.getTime()) || currentExpiry < today ? new Date(today) : currentExpiry
		baseDate.setDate(baseDate.getDate() + 60)

		extendedDevice = {
			...device,
			date: `${baseDate.getFullYear()}-${String(baseDate.getMonth() + 1).padStart(2, '0')}-${String(baseDate.getDate()).padStart(2, '0')}`,
			lastExtendedOn: `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`,
			updatedAt: new Date().toISOString(),
		}

		return extendedDevice
	})

	await writeMonitorDevices(nextDevices)
	if (!extendedDevice) {
		throw new Error('Nie znaleziono urzadzenia do przedluzenia domeny.')
	}

	return extendedDevice
}

export async function deleteMonitorDevice(deviceId: string): Promise<DeleteMonitorDeviceResponseDto> {
	const devices = await readMonitorDevices()
	const nextDevices = devices.filter(device => device.id !== deviceId)
	await writeMonitorDevices(nextDevices)
	return {
		id: deviceId,
		success: true,
	}
}
