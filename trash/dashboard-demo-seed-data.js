(function initializeDashboardDemoSeedData() {
	const encodePassword = password => {
		try {
			return btoa(unescape(encodeURIComponent(String(password || ''))))
		} catch (error) {
			return String(password || '')
		}
	}

	const padNumber = value => String(value).padStart(2, '0')

	const formatDate = date => {
		const year = date.getFullYear()
		const month = padNumber(date.getMonth() + 1)
		const day = padNumber(date.getDate())
		return `${year}-${month}-${day}`
	}

	const createRelativeDate = ({ days = 0, hours = 9, minutes = 0 } = {}) => {
		const date = new Date()
		date.setDate(date.getDate() + days)
		date.setHours(hours, minutes, 0, 0)
		return date
	}

	const toIso = options => createRelativeDate(options).toISOString()
	const toDateValue = days => formatDate(createRelativeDate({ days, hours: 12, minutes: 0 }))

	const buildSeedPayload = () => {
		const permissionIds = ['it_support', 'network', 'printers', 'rooms']
		const users = [
			{
				id: 'demo-admin',
				fullName: 'Arkadiusz Test',
				login: 'demo.admin',
				passwordHash: encodePassword('admin123'),
				role: 'admin',
				permissions: permissionIds,
				avatarId: 'blue',
				avatarImage: '',
				createdAt: toIso({ days: -45, hours: 8, minutes: 10 }),
				updatedAt: toIso({ days: -2, hours: 9, minutes: 20 }),
			},
			{
				id: 'demo-user-1',
				fullName: 'Katarzyna Nowak',
				login: 'k.nowak',
				passwordHash: encodePassword('demo123'),
				role: 'user',
				permissions: ['it_support', 'network'],
				avatarId: 'emerald',
				avatarImage: '',
				createdAt: toIso({ days: -31, hours: 10, minutes: 5 }),
				updatedAt: toIso({ days: -1, hours: 16, minutes: 40 }),
			},
			{
				id: 'demo-user-2',
				fullName: 'Michal Zielinski',
				login: 'm.zielinski',
				passwordHash: encodePassword('demo123'),
				role: 'user',
				permissions: ['it_support'],
				avatarId: 'amber',
				avatarImage: '',
				createdAt: toIso({ days: -28, hours: 11, minutes: 15 }),
				updatedAt: toIso({ days: -3, hours: 13, minutes: 25 }),
			},
			{
				id: 'demo-user-3',
				fullName: 'Ola Borkowska',
				login: 'o.borkowska',
				passwordHash: encodePassword('demo123'),
				role: 'user',
				permissions: ['printers'],
				avatarId: 'rose',
				avatarImage: '',
				createdAt: toIso({ days: -18, hours: 9, minutes: 45 }),
				updatedAt: toIso({ days: -4, hours: 15, minutes: 5 }),
			},
		]

		const actorById = Object.fromEntries(
			users.map(user => [
				user.id,
				{
					id: user.id,
					fullName: user.fullName,
					login: user.login,
					role: user.role,
					avatarId: user.avatarId,
				},
			])
		)

		return {
			credentials: {
				login: 'demo.admin',
				password: 'admin123',
			},
			users,
			session: {
				userId: 'demo-admin',
				loginAt: toIso({ days: 0, hours: 8, minutes: 5 }),
			},
			hires: [
				{
					name: 'MARTA ZIELINSKA',
					ru: 'Service Desk',
					sn: 'LTM20260311',
					date: toDateValue(2),
					accessories: ['mouse', 'keyboard', 'headset'],
					createdBy: actorById['demo-admin'],
					updatedBy: actorById['demo-admin'],
					createdAt: toIso({ days: -8, hours: 9, minutes: 30 }),
					updatedAt: toIso({ days: -2, hours: 11, minutes: 45 }),
				},
				{
					name: 'PIOTR KUREK',
					ru: 'Infra / Network',
					sn: 'LTM20260327',
					date: toDateValue(5),
					accessories: ['mouse', 'monitor', 'bag'],
					createdBy: actorById['demo-admin'],
					updatedBy: actorById['demo-user-1'],
					createdAt: toIso({ days: -6, hours: 10, minutes: 20 }),
					updatedAt: toIso({ days: -1, hours: 14, minutes: 10 }),
				},
				{
					name: 'KLAUDIA WISNIEWSKA',
					ru: 'Security Ops',
					sn: 'LTM20260402',
					date: toDateValue(9),
					accessories: ['mouse', 'keyboard'],
					createdBy: actorById['demo-user-1'],
					updatedBy: actorById['demo-user-1'],
					createdAt: toIso({ days: -4, hours: 8, minutes: 50 }),
					updatedAt: toIso({ days: -4, hours: 8, minutes: 50 }),
				},
			],
			monitor: [
				{
					name: 'LAP-WSOBOL',
					ru: '45012',
					sn: 'SNAX91PL1',
					date: toDateValue(48),
					lastExtendedOn: toDateValue(-10),
					createdBy: actorById['demo-admin'],
					updatedBy: actorById['demo-admin'],
					createdAt: toIso({ days: -22, hours: 8, minutes: 35 }),
					updatedAt: toIso({ days: -10, hours: 9, minutes: 15 }),
				},
				{
					name: 'LAP-KNOWAK',
					ru: '45077',
					sn: 'SNAX91PL2',
					date: toDateValue(9),
					lastExtendedOn: toDateValue(-21),
					createdBy: actorById['demo-user-1'],
					updatedBy: actorById['demo-user-1'],
					createdAt: toIso({ days: -30, hours: 11, minutes: 10 }),
					updatedAt: toIso({ days: -21, hours: 12, minutes: 30 }),
				},
				{
					name: 'LAP-PMAJEWSKI',
					ru: '45103',
					sn: 'SNAX91PL3',
					date: toDateValue(-4),
					lastExtendedOn: toDateValue(-61),
					createdBy: actorById['demo-admin'],
					updatedBy: actorById['demo-admin'],
					createdAt: toIso({ days: -70, hours: 7, minutes: 45 }),
					updatedAt: toIso({ days: -61, hours: 8, minutes: 50 }),
				},
				{
					name: 'LAP-OBORKOWSKA',
					ru: '45125',
					sn: 'SNAX91PL4',
					date: toDateValue(16),
					lastExtendedOn: toDateValue(-5),
					createdBy: actorById['demo-user-2'],
					updatedBy: actorById['demo-user-2'],
					createdAt: toIso({ days: -14, hours: 10, minutes: 40 }),
					updatedAt: toIso({ days: -5, hours: 15, minutes: 25 }),
				},
			],
			exchanges: [
				{
					name: 'JUSTYNA KROL',
					plannedDate: toDateValue(1),
					oldSn: 'OLD7781PL',
					newSn: 'NEW9012PL',
					notes: 'Priorytet CFO, przekazanie przed 10:00.',
					accessories: ['mouse', 'keyboard', 'bag'],
					status: 'pending',
					createdBy: actorById['demo-admin'],
					updatedBy: actorById['demo-admin'],
					createdAt: toIso({ days: -6, hours: 9, minutes: 5 }),
					updatedAt: toIso({ days: -2, hours: 12, minutes: 0 }),
				},
				{
					name: 'MICHAL OLEJNIK',
					plannedDate: toDateValue(4),
					oldSn: 'OLD8121PL',
					newSn: 'NEW4566PL',
					notes: 'Wymiana po awarii baterii i slabej kondycji zasilacza.',
					accessories: ['mouse', 'headset'],
					status: 'pending',
					createdBy: actorById['demo-user-1'],
					updatedBy: actorById['demo-user-1'],
					createdAt: toIso({ days: -5, hours: 13, minutes: 15 }),
					updatedAt: toIso({ days: -1, hours: 9, minutes: 55 }),
				},
				{
					name: 'KAROLINA BANAS',
					plannedDate: toDateValue(-2),
					oldSn: 'OLD6443PL',
					newSn: 'NEW2219PL',
					notes: 'Zakonczone i potwierdzone przez HR.',
					accessories: ['mouse', 'monitor'],
					status: 'done',
					createdBy: actorById['demo-admin'],
					updatedBy: actorById['demo-admin'],
					createdAt: toIso({ days: -9, hours: 10, minutes: 25 }),
					updatedAt: toIso({ days: -2, hours: 16, minutes: 5 }),
				},
			],
			bookmarks: [
				{
					id: 'bookmark-demo-1',
					userId: 'demo-admin',
					label: 'Raport wymian',
					url: 'https://intranet.example.local/raporty/wymiany',
					description: 'Szybki podglad statusu wymian sprzetu.',
					createdAt: toIso({ days: -8, hours: 8, minutes: 20 }),
					updatedAt: toIso({ days: -1, hours: 10, minutes: 45 }),
				},
				{
					id: 'bookmark-demo-2',
					userId: 'demo-admin',
					label: 'Checklist onboarding',
					url: '\\\\serwer-it\\onboarding\\checklista.xlsx',
					description: 'Arkusz przygotowania stanowisk dla nowych osob.',
					createdAt: toIso({ days: -7, hours: 9, minutes: 50 }),
					updatedAt: toIso({ days: -3, hours: 15, minutes: 10 }),
				},
				{
					id: 'bookmark-demo-3',
					userId: 'demo-user-1',
					label: 'CMDB',
					url: 'https://cmdb.example.local',
					description: 'Prywatny skrot operatora do ewidencji sprzetu.',
					createdAt: toIso({ days: -6, hours: 11, minutes: 5 }),
					updatedAt: toIso({ days: -2, hours: 8, minutes: 35 }),
				},
			],
			lunchReservations: [
				{
					id: 'lunch-demo-1',
					date: toDateValue(0),
					timeSlot: '12:30',
					userId: 'demo-admin',
					createdAt: toIso({ days: 0, hours: 8, minutes: 3 }),
					updatedAt: toIso({ days: 0, hours: 8, minutes: 3 }),
					status: 'active',
				},
				{
					id: 'lunch-demo-2',
					date: toDateValue(0),
					timeSlot: '12:00',
					userId: 'demo-user-1',
					createdAt: toIso({ days: 0, hours: 8, minutes: 6 }),
					updatedAt: toIso({ days: 0, hours: 8, minutes: 6 }),
					status: 'active',
				},
				{
					id: 'lunch-demo-3',
					date: toDateValue(0),
					timeSlot: '12:00',
					userId: 'demo-user-2',
					createdAt: toIso({ days: 0, hours: 8, minutes: 12 }),
					updatedAt: toIso({ days: 0, hours: 8, minutes: 12 }),
					status: 'active',
				},
				{
					id: 'lunch-demo-4',
					date: toDateValue(0),
					timeSlot: '13:00',
					userId: 'demo-user-3',
					createdAt: toIso({ days: 0, hours: 8, minutes: 18 }),
					updatedAt: toIso({ days: 0, hours: 8, minutes: 18 }),
					status: 'active',
				},
				{
					id: 'lunch-demo-5',
					date: toDateValue(1),
					timeSlot: '11:30',
					userId: 'demo-user-1',
					createdAt: toIso({ days: -1, hours: 14, minutes: 5 }),
					updatedAt: toIso({ days: -1, hours: 14, minutes: 5 }),
					status: 'active',
				},
			],
			announcements: [
				{
					id: 'announcement-demo-1',
					title: 'Okno serwisowe w piatek',
					content: 'Od 18:00 do 19:30 planowany jest restart VPN oraz kontrolerow wydruku. Dzial obslugi ma byc pod telefonem.',
					authorId: 'demo-admin',
					createdAt: toIso({ days: -1, hours: 9, minutes: 10 }),
					updatedAt: toIso({ days: -1, hours: 9, minutes: 10 }),
					isPinned: true,
				},
				{
					id: 'announcement-demo-2',
					title: 'Nowa pula laptopow Dell',
					content: 'Do magazynu dotarla nowa partia urzadzen. Prosze zuzywac ja najpierw do onboardingow planowanych na biezacy i przyszly tydzien.',
					authorId: 'demo-user-1',
					createdAt: toIso({ days: -3, hours: 15, minutes: 20 }),
					updatedAt: toIso({ days: -2, hours: 8, minutes: 50 }),
					isPinned: true,
				},
			],
			notes: [
				{
					id: 'note-demo-1',
					content: 'Na stanowisku w sali B3 nadal trzeba podmienic zasilacz do monitora konferencyjnego.',
					authorId: 'demo-user-2',
					createdAt: toIso({ days: -2, hours: 11, minutes: 35 }),
					updatedAt: toIso({ days: -2, hours: 11, minutes: 35 }),
					isPinned: false,
				},
				{
					id: 'note-demo-2',
					content: 'HR potwierdzil start onboardingu Marty Zielinskiej na jutro. Plecak i headset juz sa odlozone.',
					authorId: 'demo-admin',
					createdAt: toIso({ days: -1, hours: 13, minutes: 10 }),
					updatedAt: toIso({ days: -1, hours: 13, minutes: 10 }),
					isPinned: false,
				},
				{
					id: 'note-demo-3',
					content: 'Po testach drukarki w recepcji trzeba jeszcze wgrac finalny sterownik do stanowiska kierownika zmiany.',
					authorId: 'demo-user-3',
					createdAt: toIso({ days: -4, hours: 16, minutes: 45 }),
					updatedAt: toIso({ days: -3, hours: 9, minutes: 5 }),
					isPinned: false,
				},
			],
			noteTasks: [
				{
					id: 'task-demo-1',
					title: 'Zweryfikuj pule docking station',
					description: 'Sprawdz magazyn i oznacz dwie kompletne sztuki pod onboarding z przyszlego tygodnia.',
					assignedToUserId: 'demo-user-1',
					createdBy: 'demo-admin',
					updatedBy: 'demo-admin',
					createdAt: toIso({ days: -2, hours: 9, minutes: 0 }),
					updatedAt: toIso({ days: -1, hours: 10, minutes: 20 }),
					status: 'todo',
					priority: 'high',
				},
				{
					id: 'task-demo-2',
					title: 'Domknij wymiane dla Karoliny Banas',
					description: 'Zarchiwizuj potwierdzenie odbioru starego urzadzenia i zaktualizuj wpis w zestawieniu HR.',
					assignedToUserId: 'demo-user-2',
					createdBy: 'demo-admin',
					updatedBy: 'demo-user-2',
					createdAt: toIso({ days: -5, hours: 12, minutes: 40 }),
					updatedAt: toIso({ days: -1, hours: 16, minutes: 10 }),
					status: 'in_progress',
					priority: 'medium',
				},
				{
					id: 'task-demo-3',
					title: 'Spisz licencje z sal konferencyjnych',
					description: 'Potrzebna lista aktualnych wersji Teams Rooms i numerow seryjnych tabletow sterujacych.',
					assignedToUserId: 'demo-user-3',
					createdBy: 'demo-admin',
					updatedBy: 'demo-admin',
					createdAt: toIso({ days: -7, hours: 14, minutes: 25 }),
					updatedAt: toIso({ days: -3, hours: 8, minutes: 15 }),
					status: 'done',
					priority: 'low',
				},
			],
			plannerTasks: [
				{
					id: 'planner-demo-1',
					title: 'Przeglad ticketow VIP',
					date: toDateValue(0),
					time: '09:15',
					priority: 'high',
					description: 'Szybkie sprawdzenie ticketow z eskalacji i priorytetow CFO.',
				},
				{
					id: 'planner-demo-2',
					title: 'Przekazanie laptopa dla Marty',
					date: toDateValue(0),
					time: '12:45',
					priority: 'medium',
					description: 'Onboarding room 2, przygotowac plecak, zasilacz i login startowy.',
				},
				{
					id: 'planner-demo-3',
					title: 'Kontrola monitoringu domeny',
					date: toDateValue(1),
					time: '08:30',
					priority: 'low',
					description: 'Zweryfikowac urzadzenia z terminem wygasniecia do 14 dni.',
				},
			],
			plannerReminders: [],
			plannerAutoclear: false,
		}
	}

	window.DashboardDemoSeedData = {
		buildSeedPayload,
	}
})()
