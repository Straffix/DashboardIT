import type { AppSessionUser } from './types'

export const demoUsers: AppSessionUser[] = [
	{ id: 'lunch-user-1', fullName: 'Alicja Nowak', login: 'alicja.nowak', role: 'admin' },
	{ id: 'lunch-user-2', fullName: 'Mateusz Zielinski', login: 'mateusz.zielinski', role: 'user' },
	{ id: 'lunch-user-3', fullName: 'Joanna Krawczyk', login: 'joanna.krawczyk', role: 'user' },
	{ id: 'lunch-user-4', fullName: 'Kamil Wrobel', login: 'kamil.wrobel', role: 'user' },
]
