(function initializeDashboardDemoSeedBulkData() {
	const encodePassword = password => {
		try {
			return btoa(unescape(encodeURIComponent(String(password || ''))))
		} catch (error) {
			return String(password || '')
		}
	}

	const padNumber = value => String(value).padStart(2, '0')
	const formatDate = date => `${date.getFullYear()}-${padNumber(date.getMonth() + 1)}-${padNumber(date.getDate())}`
	const createCalendarDate = (year, month, day, hours = 9, minutes = 0) => new Date(year, month - 1, day, hours, minutes, 0, 0)

	const shiftDate = (date, dayOffset = 0, hours = date.getHours(), minutes = date.getMinutes()) => {
		const nextDate = new Date(date.getTime())
		nextDate.setDate(nextDate.getDate() + dayOffset)
		nextDate.setHours(hours, minutes, 0, 0)
		return nextDate
	}

	const createDeterministicRandom = seed => {
		let state = seed >>> 0
		return () => {
			state = (state * 1664525 + 1013904223) >>> 0
			return state / 4294967296
		}
	}

	const getDaysInMonth = (year, month) => new Date(year, month, 0).getDate()

	const createNameSequence = ({ total, uppercase = false, startOffset = 0 } = {}) => {
		const firstNames = [
			'Nina', 'Dariusz', 'Patrycja', 'Mateusz', 'Weronika', 'Rafal', 'Monika', 'Pawel',
			'Agnieszka', 'Bartosz', 'Kamila', 'Lukasz', 'Zuzanna', 'Adam', 'Oliwia', 'Sebastian',
			'Kinga', 'Dawid', 'Julia', 'Piotr', 'Emilia', 'Karol', 'Marta', 'Michal',
			'Paulina', 'Robert', 'Sylwia', 'Konrad', 'Dominika', 'Igor', 'Sandra', 'Tomasz',
			'Ewa', 'Joanna', 'Natalia', 'Patryk', 'Renata', 'Damian', 'Iza', 'Marcin',
		]
		const lastNames = [
			'Adamczyk', 'Kozak', 'Kruk', 'Orlowski', 'Lisowska', 'Madej', 'Ciesla', 'Kania',
			'Malinowska', 'Rutkowski', 'Gorska', 'Kubiak', 'Bialas', 'Pietrzak', 'Witkowska', 'Kaczmarek',
			'Krawczyk', 'Sikora', 'Majewska', 'Bednarek', 'Chmielewska', 'Kurek', 'Mroz', 'Staniszewski',
			'Dabrowski', 'Glowacka', 'Krause', 'Tomczak', 'Zalewski', 'Bartosik', 'Nowicki', 'Sobczak',
			'Skiba', 'Jasinski', 'Rogala', 'Wojtas', 'Krynska', 'Dudzik', 'Krupa', 'Walczak',
		]
		const names = []

		for (let index = 0; index < total; index += 1) {
			const sequenceIndex = index + startOffset
			const firstName = firstNames[sequenceIndex % firstNames.length]
			const lastName = lastNames[Math.floor(sequenceIndex / firstNames.length) % lastNames.length]
			const fullName = `${firstName} ${lastName}`
			names.push(uppercase ? fullName.toUpperCase() : fullName)
		}

		return names
	}

	const toIso = date => date.toISOString()

	const buildSeedPayload = () => {
		const seedYear = 2026
		const currentMonth = 3
		const currentDay = 25
		const permissionIds = ['it_support', 'network', 'printers', 'rooms']
		const ownerCycle = ['demo-admin', 'demo-user-1', 'demo-user-2', 'demo-user-3', 'demo-user-4', 'demo-user-5']
		const hireDepartments = [
			'Service Desk', 'Infra / Network', 'Security Ops', 'HR Systems', 'BI / Data', 'Retail Apps',
			'Workplace Support', 'Finance IT', 'Logistics IT', 'Compliance', 'Support 2nd Line', 'Onsite Katowice',
		]
		const accessorySets = [
			['mouse', 'keyboard'],
			['mouse', 'headset', 'bag'],
			['mouse', 'keyboard', 'monitor'],
			['mouse', 'bag'],
			['keyboard', 'headset'],
			['mouse', 'keyboard', 'headset', 'monitor'],
			['mouse'],
			['mouse', 'keyboard', 'bag'],
		]
		const monitorAliases = [
			'AKOWALSKA', 'BNOWAK', 'CKRUK', 'DWROBEL', 'EGORSKA', 'FKANIA', 'GLIS', 'HKUBIAK',
			'IKUREK', 'JMADEJ', 'KBANACH', 'LMROZ', 'MPIETRZAK', 'NOWITKOWSKA', 'OZALEWSKI', 'PKACZMAREK',
			'QSTANISZEWSKI', 'RMAJEWSKA', 'SSIKORA', 'TBIALAS', 'UKRAUSE', 'VCHMIELEWSKA', 'WKANIA', 'XADAMCZYK',
		]
		const exchangeNotes = [
			'Priorytet dla kierownika zmiany, przekazanie do 10:00.',
			'Wymiana po awarii baterii i spadku wydajnosci.',
			'Zestaw z nowa stacja dokujaca i adapterem HDMI.',
			'Do zamkniecia po podpisie protokolu przez HR.',
			'Stary laptop wraca do magazynu po czyszczeniu danych.',
			'Wydanie razem z monitorem i klawiatura numeryczna.',
		]
		const hireMonthlyVolumes = [30, 10, 35, 3, 18, 7, 22, 5, 16, 27, 9, 14]
		const exchangeMonthlyVolumes = [18, 6, 24, 4, 11, 5, 15, 7, 13, 20, 8, 10]

		const users = [
			['demo-admin', 'Arek Tester', 'demoarek', 'demo123', 'admin', permissionIds, 'blue'],
			['demo-user-1', 'Katarzyna Nowak', 'k.nowak', 'demo123', 'user', ['it_support', 'network'], 'emerald'],
			['demo-user-2', 'Michal Zielinski', 'm.zielinski', 'demo123', 'user', ['it_support'], 'amber'],
			['demo-user-3', 'Ola Borkowska', 'o.borkowska', 'demo123', 'user', ['printers'], 'rose'],
			['demo-user-4', 'Piotr Kurek', 'p.kurek', 'demo123', 'user', ['network', 'rooms'], 'slate'],
			['demo-user-5', 'Ewa Sobczak', 'e.sobczak', 'demo123', 'user', ['it_support', 'printers'], 'violet'],
			['demo-user-6', 'Tomasz Wrobel', 't.wrobel', 'demo123', 'user', ['rooms'], 'blue'],
			['demo-user-7', 'Sandra Lis', 's.lis', 'demo123', 'user', ['network'], 'emerald'],
			['demo-user-8', 'Marcin Banach', 'm.banach', 'demo123', 'user', ['it_support', 'rooms'], 'amber'],
		].map(([id, fullName, login, password, role, permissions, avatarId], index) => ({
			id,
			fullName,
			login,
			passwordHash: encodePassword(password),
			role,
			permissions,
			avatarId,
			avatarImage: '',
			createdAt: toIso(createCalendarDate(seedYear, index < 5 ? 1 : 2, 6 + index * 2, 8 + (index % 3), 10)),
			updatedAt: toIso(createCalendarDate(seedYear, 3, 17 + index, 9 + (index % 2), 20)),
		}))

		const actorById = Object.fromEntries(
			users.map(user => [user.id, { id: user.id, fullName: user.fullName, login: user.login, role: user.role, avatarId: user.avatarId }])
		)

		const createAudit = (sourceDate, createdById, updatedById = createdById, createdShiftDays = -14, updatedShiftDays = -3) => ({
			createdBy: actorById[createdById],
			updatedBy: actorById[updatedById],
			createdAt: toIso(shiftDate(sourceDate, createdShiftDays, 8 + Math.abs(createdShiftDays % 3), 10)),
			updatedAt: toIso(shiftDate(sourceDate, updatedShiftDays, 14 + Math.abs(updatedShiftDays % 2), 30)),
		})

		const hireNames = createNameSequence({
			total: hireMonthlyVolumes.reduce((sum, count) => sum + count, 0),
			uppercase: true,
		})

		const hires = []
		let hireIndex = 0

		hireMonthlyVolumes.forEach((count, monthIndex) => {
			const month = monthIndex + 1
			const monthRandom = createDeterministicRandom(seedYear * 100 + month * 17 + count)

			for (let indexInMonth = 0; indexInMonth < count; indexInMonth += 1) {
				const daysInMonth = getDaysInMonth(seedYear, month)
				const distributedDay = Math.floor(((indexInMonth + 1) * (daysInMonth - 2)) / (count + 1)) + 1
				const jitter = Math.floor(monthRandom() * 5) - 2
				const day = Math.min(daysInMonth, Math.max(1, distributedDay + jitter))
				const sourceDate = createCalendarDate(seedYear, month, day, 12, 0)
				const monthCluster = Math.floor(indexInMonth / Math.max(1, Math.ceil(count / 4)))

				hires.push({
					name: hireNames[hireIndex],
					ru: hireDepartments[(hireIndex + monthIndex) % hireDepartments.length],
					sn: `LTM${seedYear}${padNumber(month)}${padNumber(hireIndex + 11)}`,
					date: formatDate(sourceDate),
					accessories: accessorySets[(hireIndex + monthCluster) % accessorySets.length],
					...createAudit(
						sourceDate,
						ownerCycle[hireIndex % ownerCycle.length],
						ownerCycle[(hireIndex + 1) % ownerCycle.length],
						-24 + monthCluster,
						-2 - (indexInMonth % 3)
					),
				})

				hireIndex += 1
			}
		})

		const monitor = monitorAliases.map((alias, index) => {
			const expiryOffsets = [64, 52, 41, 28, 15, 8, 2, -3, 72, 55, 36, 19, 11, 6, -7, 48, 27, 16, 5, -12, 81, 44, 23, 9]
			const expiryDate = shiftDate(createCalendarDate(seedYear, currentMonth, currentDay, 12, 0), expiryOffsets[index], 12, 0)
			return {
				name: `LAP-${alias}`,
				ru: String(45010 + index * 7),
				sn: `SN26MON${padNumber(index + 1)}PL`,
				date: formatDate(expiryDate),
				lastExtendedOn: formatDate(shiftDate(expiryDate, -58 + (index % 5), 12, 0)),
				createdBy: actorById[ownerCycle[index % ownerCycle.length]],
				updatedBy: actorById[ownerCycle[(index + 2) % ownerCycle.length]],
				createdAt: toIso(shiftDate(expiryDate, -72 - (index % 4) * 6, 9, 10)),
				updatedAt: toIso(shiftDate(expiryDate, -8 + (index % 4), 15, 20)),
			}
		})

		const exchangeNames = createNameSequence({
			total: exchangeMonthlyVolumes.reduce((sum, count) => sum + count, 0),
			uppercase: true,
			startOffset: 57,
		})

		const exchanges = []
		let exchangeIndex = 0

		exchangeMonthlyVolumes.forEach((count, monthIndex) => {
			const month = monthIndex + 1
			const monthRandom = createDeterministicRandom(seedYear * 100 + month * 29 + count)

			for (let indexInMonth = 0; indexInMonth < count; indexInMonth += 1) {
				const daysInMonth = getDaysInMonth(seedYear, month)
				const distributedDay = Math.floor(((indexInMonth + 1) * (daysInMonth - 4)) / (count + 1)) + 2
				const jitter = Math.floor(monthRandom() * 7) - 3
				const day = Math.min(daysInMonth, Math.max(1, distributedDay + jitter))
				const sourceDate = createCalendarDate(seedYear, month, day, 12, 0)
				const isDone = month < currentMonth || (month === currentMonth && indexInMonth < Math.ceil(count * 0.35))
				const monthCluster = Math.floor(indexInMonth / Math.max(1, Math.ceil(count / 3)))

				exchanges.push({
					name: exchangeNames[exchangeIndex],
					plannedDate: formatDate(sourceDate),
					oldSn: `OLD26${padNumber(month)}${padNumber(exchangeIndex + 31)}PL`,
					newSn: `NEW26${padNumber(month)}${padNumber(exchangeIndex + 61)}PL`,
					notes: exchangeNotes[(exchangeIndex + monthCluster) % exchangeNotes.length],
					accessories: accessorySets[(exchangeIndex + 2 + monthCluster) % accessorySets.length],
					status: isDone ? 'done' : 'pending',
					...createAudit(
						sourceDate,
						ownerCycle[(exchangeIndex + 1) % ownerCycle.length],
						ownerCycle[(exchangeIndex + 3) % ownerCycle.length],
						-20 + monthCluster,
						isDone ? -1 : -4 - (indexInMonth % 2)
					),
				})

				exchangeIndex += 1
			}
		})

		const bookmarks = [
			['bookmark-demo-7', 'demo-admin', 'Google', 'https://www.google.com', 'Przykladowa zakladka do wyszukiwarki Google.'],
			['bookmark-demo-8', 'demo-admin', 'Office', 'https://www.office.com', 'Szybkie przejscie do pakietu Microsoft 365.'],
			['bookmark-demo-9', 'demo-admin', 'Apple', 'https://www.apple.com', 'Przykladowy zewnetrzny link firmowy do Apple.'],
			['bookmark-demo-3', 'demo-user-1', 'CMDB', 'https://cmdb.example.local', 'Prywatny skrot operatora do ewidencji sprzetu.'],
			['bookmark-demo-4', 'demo-user-2', 'Plan dyzurow', '\\\\serwer-it\\grafik\\dyzury_marzec.xlsx', 'Grafik zmian i awaryjnych dyzurow zespolu.'],
			['bookmark-demo-5', 'demo-user-3', 'Drukarki retail', 'https://print.example.local/retail', 'Panel sledzenia zgloszen drukarkowych.'],
			['bookmark-demo-6', 'demo-user-4', 'Lista salek', 'https://rooms.example.local', 'Konfiguracja urządzeń Teams Rooms i tabletów.'],
		].map(([id, userId, label, url, description], index) => ({
			id,
			userId,
			label,
			url,
			description,
			createdAt: toIso(createCalendarDate(seedYear, 3, 3 + index, 8 + (index % 3), 20)),
			updatedAt: toIso(createCalendarDate(seedYear, 3, 19 + index, 10 + (index % 2), 35)),
		}))

		const lunchSeedBaseDate = createCalendarDate(seedYear, currentMonth, currentDay, 12, 0)
		const lunchReservationPlan = [
			[-1, '11:30', 'demo-user-1'], [-1, '11:30', 'demo-user-5'], [-1, '12:00', 'demo-user-2'],
			[-1, '12:00', 'demo-user-6'], [-1, '12:30', 'demo-user-3'], [-1, '13:00', 'demo-user-4'],
			[0, '11:30', 'demo-admin'], [0, '11:30', 'demo-user-8'], [0, '12:00', 'demo-user-7'],
			[0, '12:30', 'demo-user-1'], [0, '13:00', 'demo-user-2'], [0, '13:30', 'demo-user-6'],
			[1, '11:00', 'demo-user-3'], [1, '11:00', 'demo-user-4'], [1, '12:00', 'demo-admin'],
			[1, '12:30', 'demo-user-5'], [1, '13:30', 'demo-user-7'], [2, '11:30', 'demo-user-8'],
			[2, '12:00', 'demo-user-1'], [2, '12:30', 'demo-user-2'], [2, '13:00', 'demo-user-5'],
		]
		const lunchReservations = lunchReservationPlan.map(([dayOffset, timeSlot, userId], index) => {
			const reservationDate = shiftDate(lunchSeedBaseDate, dayOffset, 12, 0)
			const stamp = shiftDate(reservationDate, -1, 8 + (index % 4), 5 + (index % 3) * 7)
			return {
				id: `lunch-demo-${index + 1}`,
				date: formatDate(reservationDate),
				timeSlot,
				userId,
				createdAt: toIso(stamp),
				updatedAt: toIso(stamp),
				status: 'active',
			}
		})

		const announcements = [
			['announcement-demo-1', 'Okno serwisowe w piątek', 'Od 18:00 do 19:30 planowany jest restart VPN oraz kontrolerów wydruku. Dział obsługi ma być pod telefonem.', 'demo-admin', 24],
			['announcement-demo-2', 'Nowa pula laptopów Dell', 'Do magazynu dotarła nowa partia urządzeń. Proszę zużywać ją najpierw do onboardingów planowanych na kwiecień i maj.', 'demo-user-1', 22],
			['announcement-demo-3', 'Audyt sal konferencyjnych', 'Do końca miesiąca trzeba potwierdzić wersje Teams Rooms, aktywne mikrofony i dostępność zapasowych pilotów.', 'demo-user-4', 20],
			['announcement-demo-4', 'Wydania na start kwartału', 'Największe obciążenie onboardingowe przypada na kwiecień i maj. Zarezerwujcie czas na przygotowanie monitorów i stacji dokujących.', 'demo-admin', 18],
		].map(([id, title, content, authorId, day], index) => ({
			id,
			title,
			content,
			authorId,
			createdAt: toIso(createCalendarDate(seedYear, 3, day, 9 + index, 10)),
			updatedAt: toIso(createCalendarDate(seedYear, 3, day + (index % 2), 10 + index, 15)),
			isPinned: true,
		}))

		const notes = [
			['note-demo-1', 'Na stanowisku w sali B3 nadal trzeba podmienić zasilacz do monitora konferencyjnego.', 'demo-user-2', 23],
			['note-demo-2', 'HR potwierdził start onboardingów na kwiecień. W magazynie trzeba odłożyć 4 komplety: laptop, mysz, headset, torba.', 'demo-admin', 24],
			['note-demo-3', 'Po testach drukarki w recepcji trzeba jeszcze wgrać finalny sterownik do stanowiska kierownika zmiany.', 'demo-user-3', 21],
			['note-demo-4', 'Monitoringi domeny z wygaśnięciem do 14 dni: sprawdzić serię RU 45120-45160 przed końcem tygodnia.', 'demo-user-1', 20],
			['note-demo-5', 'W sali Zarząd 2 trzeba wymienić baterie w pilocie i sprawdzić drugi display po ostatnim restarcie.', 'demo-user-4', 19],
			['note-demo-6', 'Do zamknięcia pozostaje jeszcze import starej listy wymian z oddziału Łódź. Brakuje 3 numerów SN.', 'demo-user-5', 18],
			['note-demo-7', 'Prośba od security: nowe onboardingi mają dostawać MFA w pakiecie startowym razem z instrukcją logowania.', 'demo-user-6', 17],
			['note-demo-8', 'Dla majowych wymian warto zarezerwować dodatkowe monitory 24 cale, bo zapotrzebowanie z retail wzrasta.', 'demo-admin', 16],
		].map(([id, content, authorId, day], index) => ({
			id,
			content,
			authorId,
			createdAt: toIso(createCalendarDate(seedYear, 3, day, 8 + (index % 4), 20)),
			updatedAt: toIso(createCalendarDate(seedYear, 3, day + (index % 2), 9 + (index % 4), 35)),
			isPinned: false,
		}))

		const noteTasks = [
			['task-demo-1', 'Zweryfikuj pulę docking station', 'Sprawdź magazyn i oznacz dwie kompletne sztuki pod onboarding z przyszłego tygodnia.', 'demo-user-1', 'demo-admin', 'demo-admin', 'todo', 'high', 23],
			['task-demo-2', 'Domknij wymianę dla Karoliny Banas', 'Zarchiwizuj potwierdzenie odbioru starego urządzenia i zaktualizuj wpis w zestawieniu HR.', 'demo-user-2', 'demo-admin', 'demo-user-2', 'in_progress', 'medium', 20],
			['task-demo-3', 'Spisz licencje z sal konferencyjnych', 'Potrzebna lista aktualnych wersji Teams Rooms i numerów seryjnych tabletów sterujących.', 'demo-user-3', 'demo-admin', 'demo-admin', 'done', 'low', 18],
			['task-demo-4', 'Przejrzyj wygasające domeny', 'Urządzenia z terminem do 10 dni mają dostać priorytetowe przedłużenie albo decyzję o wymianie.', 'demo-user-4', 'demo-admin', 'demo-user-4', 'in_progress', 'high', 21],
			['task-demo-5', 'Zweryfikuj checklisty kwietniowe', 'Dla wszystkich onboardingów w kwietniu sprawdź gotowość laptopa, monitora i uprawnień startowych.', 'demo-user-5', 'demo-admin', 'demo-admin', 'todo', 'high', 19],
			['task-demo-6', 'Odśwież grafikę sali zarządu', 'Po wymianie kontrolera trzeba zrobić nowy zestaw screenów i instrukcję dla asystentek.', 'demo-user-6', 'demo-user-4', 'demo-user-6', 'todo', 'medium', 18],
			['task-demo-7', 'Zamknij incydent drukarki retail 12', 'Potwierdź stabilność po wymianie modułu i dopisz notatkę do historii urządzenia.', 'demo-user-3', 'demo-user-5', 'demo-user-3', 'done', 'medium', 17],
			['task-demo-8', 'Przygotuj raport miesięczny', 'Potrzebne podsumowanie onboardingów, wymian i urządzeń poza domeną za marzec 2026.', 'demo-user-8', 'demo-admin', 'demo-admin', 'todo', 'high', 16],
		].map(([id, title, description, assignedToUserId, createdBy, updatedBy, status, priority, day], index) => ({
			id,
			title,
			description,
			assignedToUserId,
			createdBy,
			updatedBy,
			createdAt: toIso(createCalendarDate(seedYear, 3, day, 9 + (index % 3), 0)),
			updatedAt: toIso(createCalendarDate(seedYear, 3, day + (index % 2), 13 + (index % 3), 20)),
			status,
			priority,
		}))

		const plannerTasks = [
			['planner-demo-1', 'Przegląd ticketów VIP', '2026-03-25', '09:15', 'high', 'Szybkie sprawdzenie ticketów z eskalacji i priorytetów CFO.'],
			['planner-demo-2', 'Przekazanie laptopa dla Marty', '2026-03-25', '12:45', 'medium', 'Onboarding room 2, przygotować plecak, zasilacz i login startowy.'],
			['planner-demo-3', 'Kontrola monitoringu domeny', '2026-03-26', '08:30', 'low', 'Zweryfikować urządzenia z terminem wygaśnięcia do 14 dni.'],
			['planner-demo-4', 'Import starej bazy wymian', '2026-03-26', '10:00', 'medium', 'Scalić dane z oddziału Łódź i uzupełnić brakujące SN.'],
			['planner-demo-5', 'Weryfikacja salek A i B', '2026-03-27', '09:30', 'high', 'Sprawdzić display, mikrofony i komplet kabli po porannych spotkaniach.'],
			['planner-demo-6', 'Przegląd magazynu akcesoriów', '2026-03-27', '13:15', 'low', 'Policzyć myszki, klawiatury i headsety pod onboardingi kwietniowe.'],
			['planner-demo-7', 'Status call z HR', '2026-03-28', '11:00', 'medium', 'Potwierdzenie listy startów na kwiecień i maj.'],
			['planner-demo-8', 'Czyszczenie zwrotów', '2026-03-28', '14:20', 'low', 'Przygotować 3 urządzenia do ponownego wdrożenia.'],
			['planner-demo-9', 'Przegląd wydań na kwiecień', '2026-04-02', '09:10', 'high', 'Skontrolować gotowość wszystkich wpisów z pierwszego tygodnia kwietnia.'],
			['planner-demo-10', 'Raport miesięczny', '2026-04-03', '15:00', 'medium', 'Domknąć zestawienie za marzec dla lidera i HR.'],
			['planner-demo-11', 'Przygotowanie sali zarządu', '2026-04-07', '08:45', 'high', 'Test audio, tabletu sterującego i zapasowego HDMI.'],
			['planner-demo-12', 'Przekazanie 2 laptopów z magazynu', '2026-04-08', '12:10', 'medium', 'Wydania dla retail po finalnym sprawdzeniu obrazów systemowych.'],
		].map(([id, title, date, time, priority, description]) => ({ id, title, date, time, priority, description }))

		return {
			credentials: { login: 'demoarek', password: 'demo123' },
			users,
			session: { userId: 'demo-admin', loginAt: toIso(createCalendarDate(seedYear, currentMonth, currentDay, 8, 5)) },
			hires,
			monitor,
			exchanges,
			bookmarks,
			lunchReservations,
			announcements,
			notes,
			noteTasks,
			plannerTasks,
			plannerReminders: [],
			plannerAutoclear: false,
		}
	}

	window.DashboardDemoSeedData = {
		buildSeedPayload,
	}
})()
