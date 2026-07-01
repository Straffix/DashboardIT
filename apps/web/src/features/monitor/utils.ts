import type { MonitorDevice, MonitorDeviceDraft, MonitorDeviceStatus } from './types'

export function normalizeSerialNumber(value: string) {
	return value.trim().replace(/-/g, '').toUpperCase()
}

export function normalizeMonitorDraft(draft: MonitorDeviceDraft): MonitorDeviceDraft {
	return {
		name: draft.name.trim().toUpperCase(),
		ru: draft.ru.replace(/[^0-9]/g, ''),
		sn: normalizeSerialNumber(draft.sn),
		deviceType: draft.deviceType,
		date: draft.deviceType === 'new' ? '' : draft.date,
	}
}

export function createDefaultDomainDate() {
	const nextDate = new Date()
	nextDate.setHours(0, 0, 0, 0)
	nextDate.setDate(nextDate.getDate() + 60)
	return formatDate(nextDate)
}

export function createEmptyMonitorDraft(): MonitorDeviceDraft {
	return {
		name: '',
		ru: '',
		sn: '',
		deviceType: 'new',
		date: '',
	}
}

export function formatDate(value: Date | string) {
	const parsedDate = value instanceof Date ? new Date(value.getTime()) : new Date(value)
	if (Number.isNaN(parsedDate.getTime())) return ''

	const year = parsedDate.getFullYear()
	const month = String(parsedDate.getMonth() + 1).padStart(2, '0')
	const day = String(parsedDate.getDate()).padStart(2, '0')
	return `${year}-${month}-${day}`
}

export function getMonitorDeviceStatus(device: MonitorDevice): { label: string; tone: MonitorDeviceStatus; daysLeft: number | null } {
	if (!device.date) {
		return {
			label: 'Brak daty',
			tone: 'warning',
			daysLeft: null,
		}
	}

	const today = new Date()
	today.setHours(0, 0, 0, 0)

	const expiry = new Date(device.date)
	expiry.setHours(0, 0, 0, 0)

	if (Number.isNaN(expiry.getTime())) {
		return {
			label: 'Brak daty',
			tone: 'warning',
			daysLeft: null,
		}
	}

	const daysLeft = Math.ceil((expiry.getTime() - today.getTime()) / 86_400_000)

	if (daysLeft < 0) {
		return {
			label: 'Wypadl z domeny',
			tone: 'expired',
			daysLeft,
		}
	}

	if (daysLeft <= 14) {
		return {
			label: device.date,
			tone: 'warning',
			daysLeft,
		}
	}

	return {
		label: device.date,
		tone: 'active',
		daysLeft,
	}
}

export function matchesMonitorSearch(device: MonitorDevice, query: string) {
	const normalizedQuery = query.trim().toUpperCase()
	if (!normalizedQuery) return true

	return [device.name, device.ru, device.sn, device.date].some(field =>
		String(field ?? '')
			.trim()
			.toUpperCase()
			.includes(normalizedQuery)
	)
}

export function validateMonitorDraft(draft: MonitorDeviceDraft, existingDevices: MonitorDevice[], editingId?: string) {
	const normalizedDraft = normalizeMonitorDraft(draft)

	if (!normalizedDraft.name || !normalizedDraft.ru || !normalizedDraft.sn) {
		return 'Uzupelnij nazwe, RU i numer seryjny.'
	}

	if (normalizedDraft.deviceType === 'old' && !normalizedDraft.date) {
		return 'Dla starego urzadzenia uzupelnij date waznosci domeny.'
	}

	const duplicate = existingDevices.find(
		device => device.id !== editingId && device.ru === normalizedDraft.ru && normalizeSerialNumber(device.sn) === normalizedDraft.sn
	)

	if (duplicate) {
		return 'Takie polaczenie RU i numeru seryjnego juz istnieje.'
	}

	return ''
}
