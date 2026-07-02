import { useEffect, useMemo, useState } from 'react'

import {
	buildOrderedModuleList,
	isDashboardMenuOrderStorageKey,
	normalizeDashboardMenuOrder,
	readDashboardMenuOrder,
	writeDashboardMenuOrder,
} from './utils'

export function useDashboardModuleOrder<T extends { id: string }>(items: T[], activeUserId: string) {
	const allowedIds = useMemo(() => items.map(item => item.id), [items])
	const allowedIdsKey = useMemo(() => allowedIds.join('::'), [allowedIds])
	const [storedOrder, setStoredOrder] = useState<string[]>(() => readDashboardMenuOrder(activeUserId, allowedIds))

	useEffect(() => {
		setStoredOrder(readDashboardMenuOrder(activeUserId, allowedIds))
	}, [activeUserId, allowedIds, allowedIdsKey])

	useEffect(() => {
		if (typeof window === 'undefined') return

		const handleStorage = (event: StorageEvent) => {
			if (!isDashboardMenuOrderStorageKey(String(event.key || ''))) return
			setStoredOrder(readDashboardMenuOrder(activeUserId, allowedIds))
		}

		window.addEventListener('storage', handleStorage)
		return () => {
			window.removeEventListener('storage', handleStorage)
		}
	}, [activeUserId, allowedIds, allowedIdsKey])

	const orderedItems = useMemo(() => buildOrderedModuleList(items, storedOrder), [items, storedOrder])

	const persistOrder = (nextOrder: string[]) => {
		const normalizedOrder = normalizeDashboardMenuOrder(nextOrder, allowedIds)
		writeDashboardMenuOrder(activeUserId, normalizedOrder)
		setStoredOrder(normalizedOrder)
	}

	return {
		orderedItems,
		persistOrder,
		storedOrder,
	}
}
