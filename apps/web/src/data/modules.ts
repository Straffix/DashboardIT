export type MigrationState = 'ready' | 'in-progress' | 'planned'

export type AppModuleDefinition = {
	id: string
	title: string
	description: string
	path: string
	state: MigrationState
	kicker: string
}

export const appModules: AppModuleDefinition[] = [
	{
		id: 'monitor',
		title: 'Urzadzenia w domenie',
		description: 'CRUD urzadzen, wyszukiwarka, statusy domeny i drawer do szybkiej obslugi wpisow.',
		path: '/dashboard/monitor',
		state: 'ready',
		kicker: 'Monitoring domeny',
	},
	{
		id: 'exchanges',
		title: 'Wymiana sprzetu',
		description: 'Plan wymian ma filtr miesiaca, wyszukiwarke, drawer i finalizacje aktualizujaca monitoring.',
		path: '/dashboard/exchanges',
		state: 'ready',
		kicker: 'Plan wymian',
	},
	{
		id: 'hires',
		title: 'Nowe zatrudnienia',
		description: 'Onboarding IT ma tabele, filtr miesiaca, wyszukiwarke, drawer oraz import i eksport Excel.',
		path: '/dashboard/hires',
		state: 'ready',
		kicker: 'Onboarding IT',
	},
	{
		id: 'lunch',
		title: 'Rezerwacja obiadow',
		description: 'Sloty, limity miejsc i anulowanie rezerwacji sa dostepne z jednego ekranu dla wybranej osoby.',
		path: '/dashboard/lunch',
		state: 'ready',
		kicker: 'Sloty lunchowe',
	},
	{
		id: 'notes',
		title: 'Notatnik i chat',
		description: 'Chat zespolowy ma liste wiadomosci, przypiecia, edycje wpisow i aktywne obecnosci.',
		path: '/dashboard/notes',
		state: 'ready',
		kicker: 'Komunikacja zespolu',
	},
]
