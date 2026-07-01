import { apiRequest } from '../../lib/http'

import {
	mapMonitorDeviceDtoToModel,
	mapMonitorDevicesListDtoToModel,
	mapMonitorDraftToUpsertRequest,
	type DeleteMonitorDeviceResponseDto,
	type MonitorDeviceResponseDto,
	type MonitorDevicesListResponseDto,
} from './api-contract'
import type { MonitorDeviceDraft } from './types'

export async function readMonitorDevices() {
	const response = await apiRequest<MonitorDevicesListResponseDto>('/monitor/devices')
	return mapMonitorDevicesListDtoToModel(response)
}

export async function createMonitorDevice(draft: MonitorDeviceDraft) {
	const response = await apiRequest<MonitorDeviceResponseDto>('/monitor/devices', {
		body: mapMonitorDraftToUpsertRequest(draft),
		method: 'POST',
	})

	return mapMonitorDeviceDtoToModel(response.item)
}

export async function updateMonitorDevice(deviceId: string, draft: MonitorDeviceDraft) {
	const response = await apiRequest<MonitorDeviceResponseDto>(`/monitor/devices/${deviceId}`, {
		body: mapMonitorDraftToUpsertRequest(draft),
		method: 'PATCH',
	})

	return mapMonitorDeviceDtoToModel(response.item)
}

export async function extendMonitorDevice(deviceId: string) {
	const response = await apiRequest<MonitorDeviceResponseDto>(`/monitor/devices/${deviceId}/extend`, {
		method: 'POST',
	})

	return mapMonitorDeviceDtoToModel(response.item)
}

export function deleteMonitorDevice(deviceId: string) {
	return apiRequest<DeleteMonitorDeviceResponseDto>(`/monitor/devices/${deviceId}`, {
		method: 'DELETE',
	})
}
