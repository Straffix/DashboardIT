export type AppSessionUserRole = 'admin' | 'user'

export type AppSessionUser = {
	id: string
	fullName: string
	login: string
	role: AppSessionUserRole
	bookmarkDefaultColor: string
	avatarId?: string
	avatarImage?: string
	profileAccentColor?: string
	profileCoverImage?: string
	profileTitle?: string
}
