import type { AppSessionUser } from './types'

export const demoUsers: AppSessionUser[] = [
	{
		id: 'lunch-user-1',
		fullName: 'Alicja Nowak',
		login: 'alicja.nowak',
		role: 'admin',
		bookmarkDefaultColor: '#94a3b8',
		profileAccentColor: '#c8102e',
		profileTitle: 'Lider operacyjny IT',
	},
	{
		id: 'lunch-user-2',
		fullName: 'Mateusz Zielinski',
		login: 'mateusz.zielinski',
		role: 'user',
		bookmarkDefaultColor: '#5b8def',
		profileAccentColor: '#2563eb',
		profileTitle: 'Wsparcie stanowisk i onboarding',
	},
	{
		id: 'lunch-user-3',
		fullName: 'Joanna Krawczyk',
		login: 'joanna.krawczyk',
		role: 'user',
		bookmarkDefaultColor: '#10b981',
		profileAccentColor: '#0f9f64',
		profileTitle: 'Koordynacja notatek i lunchu',
	},
	{
		id: 'lunch-user-4',
		fullName: 'Kamil Wrobel',
		login: 'kamil.wrobel',
		role: 'user',
		bookmarkDefaultColor: '#f97316',
		profileAccentColor: '#ea580c',
		profileTitle: 'Rotacje sprzetowe i domena',
	},
]
