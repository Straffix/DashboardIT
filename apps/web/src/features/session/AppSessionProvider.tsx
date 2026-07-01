import type { PropsWithChildren } from 'react'
import { createContext, useContext, useEffect, useState } from 'react'

import { demoUsers } from './demoUsers'
import type { AppSessionUser } from './types'

const ACTIVE_USER_STORAGE_KEY = 'dashboardit.react.session.active-user'

type AppSessionContextValue = {
	activeUser: AppSessionUser | null
	activeUserId: string
	users: AppSessionUser[]
	setActiveUserId: (userId: string) => void
	clearActiveUser: () => void
}

const AppSessionContext = createContext<AppSessionContextValue | null>(null)

export function AppSessionProvider({ children }: PropsWithChildren) {
	const [activeUserId, setActiveUserIdState] = useState('')

	useEffect(() => {
		if (typeof window === 'undefined') return
		setActiveUserIdState(window.localStorage.getItem(ACTIVE_USER_STORAGE_KEY) || '')
	}, [])

	const setActiveUserId = (userId: string) => {
		const normalizedUserId = String(userId || '').trim()
		setActiveUserIdState(normalizedUserId)
		if (typeof window !== 'undefined') {
			window.localStorage.setItem(ACTIVE_USER_STORAGE_KEY, normalizedUserId)
		}
	}

	const clearActiveUser = () => {
		setActiveUserIdState('')
		if (typeof window !== 'undefined') {
			window.localStorage.removeItem(ACTIVE_USER_STORAGE_KEY)
		}
	}

	const activeUser = demoUsers.find(user => user.id === activeUserId) || null

	return (
		<AppSessionContext.Provider
			value={{
				activeUser,
				activeUserId,
				users: demoUsers,
				setActiveUserId,
				clearActiveUser,
			}}>
			{children}
		</AppSessionContext.Provider>
	)
}

export function useAppSession() {
	const context = useContext(AppSessionContext)
	if (!context) {
		throw new Error('useAppSession must be used within AppSessionProvider.')
	}

	return context
}
