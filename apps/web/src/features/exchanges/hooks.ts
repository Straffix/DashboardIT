import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
	completeExchangeRecord,
	createExchangeRecord,
	deleteExchangeRecord,
	readExchangeRecords,
	replaceExchangeRecords,
	updateExchangeRecord,
} from './storage'
import type { ExchangeDraft } from './types'

const exchangeQueryKey = ['exchange-records']

export function useExchangeRecordsQuery() {
	return useQuery({
		queryKey: exchangeQueryKey,
		queryFn: readExchangeRecords,
	})
}

export function useCreateExchangeRecordMutation() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (draft: ExchangeDraft) => createExchangeRecord(draft),
		onSuccess: records => {
			queryClient.setQueryData(exchangeQueryKey, records)
			void queryClient.invalidateQueries({ queryKey: ['monitor-devices'] })
		},
	})
}

export function useReplaceExchangeRecordsMutation() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: replaceExchangeRecords,
		onSuccess: records => {
			queryClient.setQueryData(exchangeQueryKey, records)
		},
	})
}

export function useUpdateExchangeRecordMutation() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: ({ recordId, draft }: { recordId: string; draft: ExchangeDraft }) =>
			updateExchangeRecord(recordId, draft),
		onSuccess: records => {
			queryClient.setQueryData(exchangeQueryKey, records)
		},
	})
}

export function useCompleteExchangeRecordMutation() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (recordId: string) => completeExchangeRecord(recordId),
		onSuccess: records => {
			queryClient.setQueryData(exchangeQueryKey, records)
			void queryClient.invalidateQueries({ queryKey: ['monitor-devices'] })
		},
	})
}

export function useDeleteExchangeRecordMutation() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (recordId: string) => deleteExchangeRecord(recordId),
		onSuccess: records => {
			queryClient.setQueryData(exchangeQueryKey, records)
		},
	})
}
