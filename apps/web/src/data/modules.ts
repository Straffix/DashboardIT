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
		description: 'Pierwszy realnie przeniesiony modul. CRUD, wyszukiwarka, statusy i drawer juz w React.',
		path: '/dashboard/monitor',
		state: 'ready',
		kicker: 'Gotowe do pracy',
	},
	{
		id: 'exchanges',
		title: 'Wymiana sprzetu',
		description: 'Drugi modul juz dziala w React. Ma miesiac, wyszukiwarke, drawer i finalizacje aktualizujaca monitoring.',
		path: '/dashboard/exchanges',
		state: 'ready',
		kicker: 'Gotowe do pracy',
	},
	{
		id: 'hires',
		title: 'Nowe zatrudnienia',
		description: 'Najwiekszy CRUD dziala juz w React. Ma tabele, miesiac, wyszukiwarke, drawer oraz import i eksport Excel.',
		path: '/dashboard/hires',
		state: 'ready',
		kicker: 'Gotowe do pracy',
	},
	{
		id: 'lunch',
		title: 'Rezerwacja obiadow',
		description: 'Trzeci modul juz dziala w React. Ma sloty, limity miejsc, anulowanie rezerwacji i tymczasowy selector osoby.',
		path: '/dashboard/lunch',
		state: 'ready',
		kicker: 'Gotowe do pracy',
	},
	{
		id: 'notes',
		title: 'Notatnik i chat',
		description: 'Chat zespolowy dziala juz w React. Ma liste wiadomosci, przypiecia, edycje wpisow i aktywne obecnosci.',
		path: '/dashboard/notes',
		state: 'ready',
		kicker: 'Reactowy chat',
	},
]
