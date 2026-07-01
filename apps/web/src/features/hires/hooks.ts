import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { createHire, deleteHire, readHires, replaceHires, saveHireRecord, updateHire } from './storage'
import type { HireDraft, HireRecord } from './types'

const hiresQueryKey = ['hire-records']

export function useHiresQuery() {
	return useQuery({
		queryKey: hiresQueryKey,
		queryFn: readHires,
	})
}

export function useCreateHireMutation() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (draft: HireDraft) => createHire(draft),
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: hiresQueryKey })
		},
	})
}

export function useReplaceHiresMutation() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: replaceHires,
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: hiresQueryKey })
		},
	})
}

export function useUpdateHireMutation() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: ({ recordId, draft }: { recordId: string; draft: HireDraft }) => updateHire(recordId, draft),
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: hiresQueryKey })
		},
	})
}

export function useDeleteHireMutation() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (recordId: string) => deleteHire(recordId),
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: hiresQueryKey })
		},
	})
}

export function useSaveHireRecordMutation() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (record: HireRecord) => saveHireRecord(record),
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: hiresQueryKey })
		},
	})
}
