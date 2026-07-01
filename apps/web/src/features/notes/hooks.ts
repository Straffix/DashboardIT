import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'

import {
	createNotesMessage,
	deleteNotesMessage,
	readNotesMessages,
	setNotesMessagePinned,
	updateNotesMessage,
} from './storage'
import {
	NOTES_LEGACY_STORAGE_KEY,
	NOTES_REACT_STORAGE_KEY,
	NOTES_REFRESH_INTERVAL_MS,
} from './utils'

const notesMessagesQueryKey = ['notes-messages']

export function useNotesMessagesQuery() {
	const queryClient = useQueryClient()

	useEffect(() => {
		if (typeof window === 'undefined') return

		const handleStorage = (event: StorageEvent) => {
			if (![NOTES_REACT_STORAGE_KEY, NOTES_LEGACY_STORAGE_KEY].includes(String(event.key || ''))) {
				return
			}

			void queryClient.invalidateQueries({ queryKey: notesMessagesQueryKey })
		}

		window.addEventListener('storage', handleStorage)
		return () => {
			window.removeEventListener('storage', handleStorage)
		}
	}, [queryClient])

	return useQuery({
		queryKey: notesMessagesQueryKey,
		queryFn: readNotesMessages,
		refetchInterval: NOTES_REFRESH_INTERVAL_MS,
	})
}

export function useCreateNotesMessageMutation() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: createNotesMessage,
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: notesMessagesQueryKey })
		},
	})
}

export function useUpdateNotesMessageMutation() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: updateNotesMessage,
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: notesMessagesQueryKey })
		},
	})
}

export function useDeleteNotesMessageMutation() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: deleteNotesMessage,
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: notesMessagesQueryKey })
		},
	})
}

export function useSetNotesMessagePinnedMutation() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: setNotesMessagePinned,
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: notesMessagesQueryKey })
		},
	})
}
