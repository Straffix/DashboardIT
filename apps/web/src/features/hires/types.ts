export const hireAccessoryIds = [
	'monitorDock',
	'mouse',
	'keyboard',
	'yealink',
	'logiZoneVibe',
	'lenovo',
	'bag',
	'backpack',
	'laptopStand',
	'presenter',
	'printer',
] as const

export type HireAccessoryId = (typeof hireAccessoryIds)[number]

export const hireInlineEditableFields = [
	'laptopStatus',
	'laptopWarehouse',
	'monitorStatus',
	'monitorWarehouse',
] as const

export type HireInlineEditableField = (typeof hireInlineEditableFields)[number]

export type HireAccessoryFlags = Record<HireAccessoryId, boolean>

export type HireRecord = HireAccessoryFlags & {
	id: string
	purchaseRequest: string
	targetUser: string
	startDate: string
	laptopModel: string
	laptopRu: string
	laptopStatus: string
	laptopWarehouse: string
	monitorRu: string
	monitorStatus: string
	monitorWarehouse: string
	preparedBy: string
	deliveryLocation: string
	peripheralNotes: string
	preparedAccessories: HireAccessoryId[]
	createdAt: string
	updatedAt: string
}

export type HireDraft = HireAccessoryFlags & {
	purchaseRequest: string
	targetUser: string
	startDate: string
	laptopModel: string
	laptopRu: string
	laptopStatus: string
	laptopWarehouse: string
	monitorRu: string
	monitorStatus: string
	monitorWarehouse: string
	preparedBy: string
	deliveryLocation: string
	peripheralNotes: string
}
