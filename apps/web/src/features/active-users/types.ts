import type { AppSessionUserRole } from '../session/types'

export type DashboardActiveUserRecord = {
	tabId: string
	userId: string
	login: string
	fullName: string
	role: AppSessionUserRole
	lastSeenAt: string
	avatarId: string
	avatarImage: string
	profileAccentColor: string
	profileCoverImage: string
	profileTitle: string
}
