const LEGACY_DASHBOARD_MENU_ORDER_KEY = 'dashboard-menu-order'
const DASHBOARD_MENU_ORDER_GUEST_KEY = `${LEGACY_DASHBOARD_MENU_ORDER_KEY}::guest`
const DASHBOARD_MENU_ORDER_USER_KEY_PREFIX = `${LEGACY_DASHBOARD_MENU_ORDER_KEY}::user::`

function ensureWindow() {
	return typeof window !== 'undefined'
}

function readRawOrder(storageKey: string) {
	if (!ensureWindow()) return null

	try {
		const rawValue = window.localStorage.getItem(storageKey)
		if (!rawValue) return null

		const parsedValue = JSON.parse(rawValue) as unknown
		return Array.isArray(parsedValue) ? parsedValue : null
	} catch {
		return null
	}
}

export function getDashboardMenuOrderStorageKey(activeUserId: string) {
	const normalizedUserId = String(activeUserId || '').trim()
	return normalizedUserId ? `${DASHBOARD_MENU_ORDER_USER_KEY_PREFIX}${normalizedUserId}` : DASHBOARD_MENU_ORDER_GUEST_KEY
}

export function normalizeDashboardMenuOrder(order: string[], allowedIds: string[]) {
	const allowedIdSet = new Set(allowedIds.map(id => String(id || '').trim()).filter(Boolean))

	return [...new Set((Array.isArray(order) ? order : []).map(id => String(id || '').trim()).filter(id => allowedIdSet.has(id)))]
}

export function readDashboardMenuOrder(activeUserId: string, allowedIds: string[]) {
	const scopedStorageKey = getDashboardMenuOrderStorageKey(activeUserId)
	const scopedOrder = readRawOrder(scopedStorageKey)
	if (scopedOrder) {
		return normalizeDashboardMenuOrder(scopedOrder.map(value => String(value || '')), allowedIds)
	}

	if (String(activeUserId || '').trim()) {
		return []
	}

	const legacyGuestOrder = readRawOrder(LEGACY_DASHBOARD_MENU_ORDER_KEY)
	if (!legacyGuestOrder) return []

	const normalizedOrder = normalizeDashboardMenuOrder(legacyGuestOrder.map(value => String(value || '')), allowedIds)
	writeDashboardMenuOrder(activeUserId, normalizedOrder)
	return normalizedOrder
}

export function writeDashboardMenuOrder(activeUserId: string, order: string[]) {
	if (!ensureWindow()) return

	window.localStorage.setItem(getDashboardMenuOrderStorageKey(activeUserId), JSON.stringify([...new Set(order.filter(Boolean))]))
}

export function buildOrderedModuleList<T extends { id: string }>(items: T[], storedOrder: string[]) {
	const itemsById = new Map(items.map(item => [item.id, item] as const))
	const orderedItems: T[] = []

	storedOrder.forEach(itemId => {
		const matchedItem = itemsById.get(itemId)
		if (!matchedItem) return

		orderedItems.push(matchedItem)
		itemsById.delete(itemId)
	})

	return [...orderedItems, ...itemsById.values()]
}

export function isDashboardMenuOrderStorageKey(storageKey: string) {
	const normalizedStorageKey = String(storageKey || '').trim()
	if (!normalizedStorageKey) return false

	return (
		normalizedStorageKey === LEGACY_DASHBOARD_MENU_ORDER_KEY ||
		normalizedStorageKey === DASHBOARD_MENU_ORDER_GUEST_KEY ||
		normalizedStorageKey.startsWith(DASHBOARD_MENU_ORDER_USER_KEY_PREFIX)
	)
}
