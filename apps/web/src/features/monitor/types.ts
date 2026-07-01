export type MonitorDeviceType = 'new' | 'old'

export type MonitorDevice = {
	id: string
	name: string
	ru: string
	sn: string
	deviceType: MonitorDeviceType
	date: string
	lastExtendedOn: string
	createdAt: string
	updatedAt: string
}

export type MonitorDeviceDraft = {
	name: string
	ru: string
	sn: string
	deviceType: MonitorDeviceType
	date: string
}

export type MonitorDeviceStatus = 'active' | 'warning' | 'expired'
