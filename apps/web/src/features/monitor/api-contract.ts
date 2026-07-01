import type { MonitorDevice, MonitorDeviceDraft, MonitorDeviceType } from './types'
import { normalizeMonitorDraft, normalizeSerialNumber } from './utils'

export const monitorApiContract = {
	listDevices: {
		method: 'GET',
		path: '/monitor/devices',
	},
	createDevice: {
		method: 'POST',
		path: '/monitor/devices',
	},
	updateDevice: {
		method: 'PATCH',
		path: '/monitor/devices/:deviceId',
	},
	extendDevice: {
		method: 'POST',
		path: '/monitor/devices/:deviceId/extend',
	},
	deleteDevice: {
		method: 'DELETE',
		path: '/monitor/devices/:deviceId',
	},
} as const

export type MonitorDeviceDto = {
	id: string
	name: string
	ru: string
	serialNumber: string
	deviceType: MonitorDeviceType
	domainExpiryDate: string | null
	lastExtendedOn: string | null
	createdAt: string
	updatedAt: string
}

export type MonitorDevicesListResponseDto = {
	items: MonitorDeviceDto[]
}

export type MonitorDeviceResponseDto = {
	item: MonitorDeviceDto
}

export type DeleteMonitorDeviceResponseDto = {
	id: string
	success: boolean
}

export type UpsertMonitorDeviceRequestDto = {
	name: string
	ru: string
	serialNumber: string
	deviceType: MonitorDeviceType
	domainExpiryDate: string | null
}

function normalizeMonitorDeviceType(value: unknown): MonitorDeviceType {
	return value === 'old' ? 'old' : 'new'
}

function normalizeOptionalDate(value: unknown) {
	return typeof value === 'string' ? value.trim() : ''
}

export function mapMonitorDeviceDtoToModel(dto: Partial<MonitorDeviceDto>): MonitorDevice {
	return {
		id: String(dto.id || ''),
		name: String(dto.name || '').trim().toUpperCase(),
		ru: String(dto.ru || '').replace(/[^0-9]/g, ''),
		sn: normalizeSerialNumber(String(dto.serialNumber || '')),
		deviceType: normalizeMonitorDeviceType(dto.deviceType),
		date: normalizeOptionalDate(dto.domainExpiryDate),
		lastExtendedOn: normalizeOptionalDate(dto.lastExtendedOn),
		createdAt: String(dto.createdAt || ''),
		updatedAt: String(dto.updatedAt || dto.createdAt || ''),
	}
}

export function mapMonitorDevicesListDtoToModel(dto: Partial<MonitorDevicesListResponseDto> | MonitorDeviceDto[]) {
	const items = Array.isArray(dto) ? dto : Array.isArray(dto.items) ? dto.items : []
	return items.map(item => mapMonitorDeviceDtoToModel(item))
}

export function mapMonitorDraftToUpsertRequest(draft: MonitorDeviceDraft): UpsertMonitorDeviceRequestDto {
	const normalizedDraft = normalizeMonitorDraft(draft)

	return {
		name: normalizedDraft.name,
		ru: normalizedDraft.ru,
		serialNumber: normalizedDraft.sn,
		deviceType: normalizedDraft.deviceType,
		domainExpiryDate: normalizedDraft.deviceType === 'old' ? normalizedDraft.date : null,
	}
}
