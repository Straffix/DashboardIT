export type AppSessionUserRole = 'admin' | 'user'

export type AppSessionUser = {
	id: string
	fullName: string
	login: string
	role: AppSessionUserRole
}
