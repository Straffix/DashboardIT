import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { PropsWithChildren } from 'react'

import { AppSessionProvider } from '../features/session/AppSessionProvider'

const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			refetchOnWindowFocus: false,
			staleTime: 10_000,
		},
	},
})

export function AppProviders({ children }: PropsWithChildren) {
	return (
		<QueryClientProvider client={queryClient}>
			<AppSessionProvider>{children}</AppSessionProvider>
		</QueryClientProvider>
	)
}
