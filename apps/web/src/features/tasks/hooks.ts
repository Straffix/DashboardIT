import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'

import { createDashboardTask, deleteDashboardTask, readDashboardTasks } from './storage'
import { TASKS_LEGACY_STORAGE_KEY, TASKS_REACT_STORAGE_KEY, TASKS_REFRESH_INTERVAL_MS } from './utils'

const dashboardTasksQueryKey = ['dashboard-tasks']

export function useDashboardTasksQuery() {
	const queryClient = useQueryClient()

	useEffect(() => {
		if (typeof window === 'undefined') return

		const handleStorage = (event: StorageEvent) => {
			if (![TASKS_REACT_STORAGE_KEY, TASKS_LEGACY_STORAGE_KEY].includes(String(event.key || ''))) {
				return
			}

			void queryClient.invalidateQueries({ queryKey: dashboardTasksQueryKey })
		}

		window.addEventListener('storage', handleStorage)
		return () => {
			window.removeEventListener('storage', handleStorage)
		}
	}, [queryClient])

	return useQuery({
		queryKey: dashboardTasksQueryKey,
		queryFn: readDashboardTasks,
		refetchInterval: TASKS_REFRESH_INTERVAL_MS,
	})
}

export function useCreateDashboardTaskMutation() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: createDashboardTask,
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: dashboardTasksQueryKey })
		},
	})
}

export function useDeleteDashboardTaskMutation() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: deleteDashboardTask,
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: dashboardTasksQueryKey })
		},
	})
}
