import { getAppDataSourceMode } from '../../config/dataSource'

import type { DeleteMonitorDeviceResponseDto } from './api-contract'
import * as apiMonitorStorage from './storage.api'
import * as localMonitorStorage from './storage.local'
import type { MonitorDevice, MonitorDeviceDraft } from './types'

type MonitorStorageModule = {
	createMonitorDevice: (draft: MonitorDeviceDraft) => Promise<MonitorDevice>
	deleteMonitorDevice: (deviceId: string) => Promise<DeleteMonitorDeviceResponseDto>
	extendMonitorDevice: (deviceId: string) => Promise<MonitorDevice>
	readMonitorDevices: () => Promise<MonitorDevice[]>
	replaceMonitorDevices: (devices: MonitorDevice[]) => Promise<MonitorDevice[]>
	updateMonitorDevice: (deviceId: string, draft: MonitorDeviceDraft) => Promise<MonitorDevice>
}

const replaceMonitorDevicesUnsupported: MonitorStorageModule['replaceMonitorDevices'] = async () => {
	throw new Error('Import Excel dla urzadzen jest obecnie dostepny tylko w trybie local demo.')
}

const monitorStorage: MonitorStorageModule =
	getAppDataSourceMode() === 'api'
		? { ...apiMonitorStorage, replaceMonitorDevices: replaceMonitorDevicesUnsupported }
		: localMonitorStorage

export const readMonitorDevices = () => monitorStorage.readMonitorDevices()

export const replaceMonitorDevices = (devices: Parameters<MonitorStorageModule['replaceMonitorDevices']>[0]) =>
	monitorStorage.replaceMonitorDevices(devices)

export const createMonitorDevice = (draft: Parameters<MonitorStorageModule['createMonitorDevice']>[0]) =>
	monitorStorage.createMonitorDevice(draft)

export const updateMonitorDevice = (
	deviceId: Parameters<MonitorStorageModule['updateMonitorDevice']>[0],
	draft: Parameters<MonitorStorageModule['updateMonitorDevice']>[1]
) => monitorStorage.updateMonitorDevice(deviceId, draft)

export const extendMonitorDevice = (deviceId: Parameters<MonitorStorageModule['extendMonitorDevice']>[0]) =>
	monitorStorage.extendMonitorDevice(deviceId)

export const deleteMonitorDevice = (deviceId: Parameters<MonitorStorageModule['deleteMonitorDevice']>[0]) =>
	monitorStorage.deleteMonitorDevice(deviceId)
