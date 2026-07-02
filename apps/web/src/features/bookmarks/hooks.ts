import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { createBookmark, deleteBookmark, readBookmarksForUser, updateBookmark } from './storage'
import type { BookmarkDraft } from './types'

const bookmarksQueryKey = (userId: string) => ['bookmarks', userId || 'guest']

export function useBookmarksQuery(userId: string) {
	return useQuery({
		queryKey: bookmarksQueryKey(userId),
		queryFn: () => readBookmarksForUser(userId),
	})
}

export function useCreateBookmarkMutation(userId: string) {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: (draft: BookmarkDraft) => createBookmark(userId, draft),
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: bookmarksQueryKey(userId) })
		},
	})
}

export function useUpdateBookmarkMutation(userId: string) {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: ({ bookmarkId, draft }: { bookmarkId: string; draft: BookmarkDraft }) => updateBookmark(bookmarkId, draft),
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: bookmarksQueryKey(userId) })
		},
	})
}

export function useDeleteBookmarkMutation(userId: string) {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: (bookmarkId: string) => deleteBookmark(bookmarkId),
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: bookmarksQueryKey(userId) })
		},
	})
}
