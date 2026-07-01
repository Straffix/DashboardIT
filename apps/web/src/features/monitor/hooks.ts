import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
	createMonitorDevice,
	deleteMonitorDevice,
	extendMonitorDevice,
	readMonitorDevices,
	replaceMonitorDevices,
	updateMonitorDevice,
} from './storage'
import type { MonitorDeviceDraft } from './types'

const monitorQueryKey = ['monitor-devices']

export function useMonitorDevicesQuery() {
	return useQuery({
		queryKey: monitorQueryKey,
		queryFn: readMonitorDevices,
	})
}

export function useCreateMonitorDeviceMutation() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (draft: MonitorDeviceDraft) => createMonitorDevice(draft),
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: monitorQueryKey })
		},
	})
}

export function useReplaceMonitorDevicesMutation() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: replaceMonitorDevices,
		onSuccess: devices => {
			queryClient.setQueryData(monitorQueryKey, devices)
		},
	})
}

export function useUpdateMonitorDeviceMutation() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: ({ deviceId, draft }: { deviceId: string; draft: MonitorDeviceDraft }) =>
			updateMonitorDevice(deviceId, draft),
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: monitorQueryKey })
		},
	})
}

export function useExtendMonitorDeviceMutation() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (deviceId: string) => extendMonitorDevice(deviceId),
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: monitorQueryKey })
		},
	})
}

export function useDeleteMonitorDeviceMutation() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (deviceId: string) => deleteMonitorDevice(deviceId),
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: monitorQueryKey })
		},
	})
}
