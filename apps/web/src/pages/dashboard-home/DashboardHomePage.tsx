import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import { PageIntro } from '../../components/PageIntro'
import { appModules } from '../../data/modules'
import { useExchangeRecordsQuery } from '../../features/exchanges/hooks'
import type { ExchangeRecord } from '../../features/exchanges/types'
import { useHiresQuery } from '../../features/hires/hooks'
import type { HireRecord } from '../../features/hires/types'
import { getHireStatusTone } from '../../features/hires/utils'
import { useLunchReservationsQuery } from '../../features/lunch/hooks'
import { formatLunchDateLabel, getReservationForUser, getTodayDateKey, LUNCH_MAX_CAPACITY_PER_SLOT, LUNCH_TIME_SLOTS } from '../../features/lunch/utils'
import { useMonitorDevicesQuery } from '../../features/monitor/hooks'
import type { MonitorDevice } from '../../features/monitor/types'
import { getMonitorDeviceStatus } from '../../features/monitor/utils'
import { useNotesMessagesQuery } from '../../features/notes/hooks'
import type { NotesMessage } from '../../features/notes/types'
import { formatNotesDateTimeLabel, getLatestNotesUpdateLabel, getPinnedNotesMessages, resolveNotesAuthor } from '../../features/notes/utils'
import { useAppSession } from '../../features/session/AppSessionProvider'

type DashboardItemTone = 'active' | 'warning' | 'expired' | 'neutral'

type DashboardListItem = {
	badge: string
	description: string
	title: string
	tone: DashboardItemTone
}

const migrationLabelByState = {
	ready: 'React dziala',
	'in-progress': 'W trakcie',
	planned: 'Zaplanowane',
} as const

const legacyDashboardWidgets = [
	{
		description: 'Legacy ma geolokalizacje, wyszukiwanie miasta i 3-dniowa prognoze. W React wraca jako osobny widget po domknieciu rdzenia dashboardu.',
		kicker: 'Legacy widget',
		title: 'Pogoda',
	},
	{
		description: 'Na starej stronie sa prywatne skroty, favicony i modal edycji zakladek. To jest kolejny logiczny etap po samym dashboard home.',
		kicker: 'Legacy widget',
		title: 'Zakladki',
	},
	{
		description: 'Kalendarz zadan, preview dnia i aktywni uzytkownicy nadal siedza w czystym JS. Po przejeciu strony glownej mozemy je przenosic kawalek po kawalku.',
		kicker: 'Legacy widget',
		title: 'Planer i aktywni uzytkownicy',
	},
] as const

function getMonthKey(value: string) {
	return String(value || '').slice(0, 7)
}

function formatMonthLabel(monthKey: string) {
	const [yearText, monthText] = monthKey.split('-')
	const year = Number(yearText)
	const month = Number(monthText)
	if (!year || !month) return 'ten miesiac'

	return new Date(year, month - 1, 1).toLocaleDateString('pl-PL', {
		month: 'long',
		year: 'numeric',
	})
}

function formatShortDate(value: string) {
	const parsedValue = new Date(value)
	if (Number.isNaN(parsedValue.getTime())) return 'Brak daty'

	return parsedValue.toLocaleDateString('pl-PL', {
		day: '2-digit',
		month: '2-digit',
	})
}

function formatClockDate(value: Date) {
	return value.toLocaleDateString('pl-PL', {
		weekday: 'long',
		day: 'numeric',
		month: 'long',
		year: 'numeric',
	})
}

function formatClockTime(value: Date) {
	return value.toLocaleTimeString('pl-PL', {
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit',
	})
}

function getClockEyebrow(value: Date) {
	const hour = value.getHours()

	if (hour < 11) return 'Dobry poranek'
	if (hour < 18) return 'Dzien operacyjny'
	return 'Dobry wieczor'
}

function getMonitorBadge(daysLeft: number | null) {
	if (daysLeft === null) return 'Brak daty'
	if (daysLeft < 0) return `${Math.abs(daysLeft)} d po terminie`
	if (daysLeft === 0) return 'Wygasa dzisiaj'
	if (daysLeft === 1) return 'Wygasa jutro'
	return `${daysLeft} dni`
}

function getExchangeBadge(record: ExchangeRecord) {
	if (!record.plannedDate) return 'Brak daty'

	const plannedDate = Date.parse(record.plannedDate) || 0
	const today = new Date()
	today.setHours(0, 0, 0, 0)

	if (plannedDate < today.getTime()) return `Po terminie od ${formatShortDate(record.plannedDate)}`
	return formatShortDate(record.plannedDate)
}

function getRoleLabel(role: 'admin' | 'user') {
	return role === 'admin' ? 'Lider' : 'Pracownik'
}

function truncateText(value: string, maxLength: number) {
	const normalizedValue = String(value || '').trim()
	if (normalizedValue.length <= maxLength) return normalizedValue
	return `${normalizedValue.slice(0, maxLength - 1).trimEnd()}...`
}

function buildMonitorFocusItems(devices: MonitorDevice[]) {
	return devices
		.map(device => ({
			device,
			status: getMonitorDeviceStatus(device),
		}))
		.filter(entry => entry.status.daysLeft !== null && entry.status.daysLeft <= 14)
		.sort((leftEntry, rightEntry) => (leftEntry.status.daysLeft ?? 0) - (rightEntry.status.daysLeft ?? 0))
		.slice(0, 4)
		.map<DashboardListItem>(entry => ({
			badge: getMonitorBadge(entry.status.daysLeft),
			description: `RU ${entry.device.ru || 'brak'} / SN ${entry.device.sn || 'brak'}`,
			title: entry.device.name || 'Urzadzenie bez nazwy',
			tone: entry.status.tone,
		}))
}

function buildOperationalQueue(exchangeRecords: ExchangeRecord[], hireRecords: HireRecord[]) {
	const exchangeItems = exchangeRecords
		.filter(record => record.status === 'pending')
		.map(record => ({
			item: {
				badge: getExchangeBadge(record),
				description: record.notes || [record.oldSn, record.newSn].filter(Boolean).join(' -> ') || 'Bez dodatkowej notatki',
				title: `Wymiana: ${record.name || 'Brak pracownika'}`,
				tone: Date.parse(record.plannedDate || '') < Date.now() ? ('warning' as const) : ('neutral' as const),
			},
			timestamp: Date.parse(record.plannedDate || '') || Number.MAX_SAFE_INTEGER,
		}))

	const hireItems = hireRecords.map(record => ({
		item: {
			badge: formatShortDate(record.startDate),
			description: [record.deliveryLocation, record.laptopModel].filter(Boolean).join(' / ') || 'Sprzet do uzupelnienia',
			title: `Start: ${record.targetUser || 'Brak osoby'}`,
			tone: getHireStatusTone(record.laptopStatus) === 'active' ? ('active' as const) : ('warning' as const),
		},
		timestamp: Date.parse(record.startDate || '') || Number.MAX_SAFE_INTEGER,
	}))

	return [...exchangeItems, ...hireItems]
		.sort((leftEntry, rightEntry) => leftEntry.timestamp - rightEntry.timestamp)
		.slice(0, 5)
		.map(entry => entry.item)
}

function buildCollaborationItems(
	activeUserName: string,
	lunchSummary: string,
	pinnedMessages: NotesMessage[],
	messageCount: number,
	latestNotesUpdateLabel: string,
	userDirectory: ReturnType<typeof useAppSession>['users']
) {
	const items: DashboardListItem[] = [
		{
			badge: activeUserName ? 'Sesja aktywna' : 'Brak sesji',
			description: activeUserName
				? `${activeUserName} moze od razu testowac obiady i notatki w kontekscie wybranego konta.`
				: 'Wybierz osobe robocza, aby testowac flow lunchu i chatu bez logowania backendowego.',
			title: activeUserName || 'Tryb podgladu',
			tone: activeUserName ? 'active' : 'warning',
		},
		{
			badge: `Akt. ${latestNotesUpdateLabel}`,
			description: `${messageCount} wiadomosci, ${pinnedMessages.length} przypietych. Najszybszy sposob, zeby zobaczyc stan wspolpracy w zespole.`,
			title: 'Notatki zespolowe',
			tone: pinnedMessages.length > 0 ? 'active' : 'neutral',
		},
		{
			badge: lunchSummary,
			description: 'Rezerwacje na dzis sa juz w React i korzystaja z tej samej sesji roboczej co pozostale moduly.',
			title: 'Lunch dzisiaj',
			tone: 'neutral',
		},
	]

	const latestPinnedMessage = pinnedMessages[0]
	if (latestPinnedMessage) {
		const author = resolveNotesAuthor(latestPinnedMessage, userDirectory)
		items.push({
			badge: formatNotesDateTimeLabel(latestPinnedMessage.pinnedAt || latestPinnedMessage.updatedAt),
			description: truncateText(latestPinnedMessage.content, 110),
			title: `Pin: ${author.fullName}`,
			tone: 'warning',
		})
	}

	return items
}

function DashboardListCard({
	description,
	emptyState,
	items,
	linkLabel,
	linkTo,
	title,
	eyebrow,
}: {
	description: string
	emptyState: string
	eyebrow: string
	items: DashboardListItem[]
	linkLabel?: string
	linkTo?: string
	title: string
}) {
	return (
		<article className="data-card dashboard-home-list-card">
			<div className="dashboard-home-section-head">
				<p className="month-summary-card__label">{eyebrow}</p>
				<strong>{title}</strong>
				<span>{description}</span>
			</div>

			{items.length > 0 ? (
				<div className="dashboard-home-list">
					{items.map(item => (
						<article key={`${item.title}-${item.badge}`} className="dashboard-home-list-item">
							<div className="dashboard-home-list-item__row">
								<strong>{item.title}</strong>
								<span className={`status-pill status-pill--${item.tone}`}>{item.badge}</span>
							</div>
							<p>{item.description}</p>
						</article>
					))}
				</div>
			) : (
				<p className="dashboard-home-empty">{emptyState}</p>
			)}

			{linkTo && linkLabel ? (
				<Link className="dashboard-home-card__link button-link" to={linkTo}>
					{linkLabel}
				</Link>
			) : null}
		</article>
	)
}

export function DashboardHomePage() {
	const { activeUser, activeUserId, clearActiveUser, setActiveUserId, users } = useAppSession()
	const [now, setNow] = useState(() => new Date())
	const todayDate = getTodayDateKey()
	const currentMonthKey = getMonthKey(todayDate)
	const todayTimestamp = Date.parse(todayDate) || Date.now()

	const { data: devices = [], isLoading: isMonitorLoading } = useMonitorDevicesQuery()
	const { data: exchangeRecords = [], isLoading: isExchangeLoading } = useExchangeRecordsQuery()
	const { data: hireRecords = [], isLoading: isHireLoading } = useHiresQuery()
	const { data: lunchReservations = [], isLoading: isLunchLoading } = useLunchReservationsQuery(todayDate)
	const { data: notesMessages = [], isLoading: isNotesLoading } = useNotesMessagesQuery()

	useEffect(() => {
		const intervalId = window.setInterval(() => {
			setNow(new Date())
		}, 1000)

		return () => {
			window.clearInterval(intervalId)
		}
	}, [])

	const devicesWithStatus = devices.map(device => ({
		device,
		status: getMonitorDeviceStatus(device),
	}))
	const monitorAlerts = devicesWithStatus.filter(entry => entry.status.tone === 'warning' || entry.status.tone === 'expired')
	const currentMonthExchanges = exchangeRecords.filter(record => getMonthKey(record.plannedDate) === currentMonthKey)
	const currentMonthHires = hireRecords.filter(record => getMonthKey(record.startDate) === currentMonthKey)
	const pendingMonthExchanges = currentMonthExchanges.filter(record => record.status === 'pending')
	const doneMonthExchanges = currentMonthExchanges.filter(record => record.status === 'done')
	const laptopReadyCount = currentMonthHires.filter(record => getHireStatusTone(record.laptopStatus) === 'active').length
	const monitorReadyCount = currentMonthHires.filter(record => getHireStatusTone(record.monitorStatus) === 'active').length
	const totalLunchSeats = LUNCH_TIME_SLOTS.length * LUNCH_MAX_CAPACITY_PER_SLOT
	const freeLunchSeats = Math.max(0, totalLunchSeats - lunchReservations.length)
	const myLunchReservation = activeUser ? getReservationForUser(lunchReservations, activeUser.id) : null
	const pinnedMessages = getPinnedNotesMessages(notesMessages)
	const latestNotesUpdateLabel = getLatestNotesUpdateLabel(notesMessages)

	const monitorFocusItems = buildMonitorFocusItems(devices)
	const operationalQueueItems = buildOperationalQueue(
		exchangeRecords.filter(record => record.status === 'pending'),
		hireRecords.filter(record => (Date.parse(record.startDate || '') || Number.MAX_SAFE_INTEGER) >= todayTimestamp)
	)
	const collaborationItems = buildCollaborationItems(
		activeUser?.fullName || '',
		`${lunchReservations.length}/${totalLunchSeats}`,
		pinnedMessages,
		notesMessages.length,
		latestNotesUpdateLabel,
		users
	)

	const moduleInsights: Record<string, { detail: string; summary: string }> = {
		exchanges: isExchangeLoading
			? { detail: 'Laduje plan wymian z lokalnego storage.', summary: 'Ladowanie danych...' }
			: {
					detail: `${pendingMonthExchanges.length} pending, ${doneMonthExchanges.length} done w ${formatMonthLabel(currentMonthKey)}.`,
					summary: `${currentMonthExchanges.length} wpisow do kontroli w tym miesiacu`,
				},
		hires: isHireLoading
			? { detail: 'Laduje plan onboardingow i przygotowan.', summary: 'Ladowanie danych...' }
			: {
					detail: `${laptopReadyCount} laptopow i ${monitorReadyCount} monitorow ma status gotowy.`,
					summary: `${currentMonthHires.length} onboardingow zaplanowanych na ${formatMonthLabel(currentMonthKey)}`,
				},
		lunch: isLunchLoading
			? { detail: 'Laduje rezerwacje na dzisiejszy dzien.', summary: 'Ladowanie danych...' }
			: {
					detail: myLunchReservation
						? `${activeUser?.fullName || 'Wybrany uzytkownik'} ma slot ${myLunchReservation.timeSlot}.`
						: `${freeLunchSeats} wolnych miejsc zostalo jeszcze na dzis.`,
					summary: `${lunchReservations.length} rezerwacji na ${formatLunchDateLabel(todayDate)}`,
				},
		monitor: isMonitorLoading
			? { detail: 'Laduje stan domen i terminy wygasniecia.', summary: 'Ladowanie danych...' }
			: {
					detail: `${monitorAlerts.filter(entry => entry.status.tone === 'warning').length} z ostrzezeniem i ${monitorAlerts.filter(entry => entry.status.tone === 'expired').length} po terminie.`,
					summary: `${devices.length} urzadzen w monitoringu domeny`,
				},
		notes: isNotesLoading
			? { detail: 'Laduje wiadomosci zespolowe i przypiecia.', summary: 'Ladowanie danych...' }
			: {
					detail: `Ostatnia aktywnosc: ${latestNotesUpdateLabel}.`,
					summary: `${notesMessages.length} wiadomosci i ${pinnedMessages.length} przypiete wpisy`,
				},
	}

	return (
		<div className="page-stack">
			<PageIntro
				eyebrow="Strona glowna"
				title="Centrum operacyjne Dashboard IT"
				description="To juz nie jest ekran migracyjny. Dashboard zbiera zywe dane z modulow React i przejmuje role startowej strony pracy dla zespolu IT."
			/>

			<section className="dashboard-home-overview" aria-label="Biezacy kontekst dashboardu">
				<article className="data-card dashboard-home-spotlight">
					<p className="month-summary-card__label">{getClockEyebrow(now)}</p>
					<strong>{formatClockTime(now)}</strong>
					<span>{formatClockDate(now)}</span>
					<p className="helper-note">
						Na teraz pilnujemy {monitorAlerts.length} sygnalow w domenie, {pendingMonthExchanges.length} otwartych
						wymian i {currentMonthHires.length} onboardingow w {formatMonthLabel(currentMonthKey)}.
					</p>
				</article>

				<article className="data-card dashboard-home-session-card">
					<p className="month-summary-card__label">Sesja robocza</p>
					<strong>{activeUser ? activeUser.fullName : 'Tryb podgladu bez aktywnej osoby'}</strong>
					<span>
						{activeUser
							? `${getRoleLabel(activeUser.role)} | login ${activeUser.login}`
							: 'Wybierz osobe, aby testowac lunch i notatki w realnym kontekscie roboczym.'}
					</span>

					<label className="search-input dashboard-home-session-picker">
						<span>Aktywna osoba</span>
						<select
							value={activeUserId}
							onChange={event => {
								const nextUserId = event.target.value
								if (nextUserId) {
									setActiveUserId(nextUserId)
								} else {
									clearActiveUser()
								}
							}}>
							<option value="">Tryb podgladu</option>
							{users.map(user => (
								<option key={user.id} value={user.id}>
									{user.fullName}
								</option>
							))}
						</select>
					</label>

					<p className={`helper-note${myLunchReservation ? ' is-success' : ''}`}>
						{myLunchReservation
							? `Wybrany uzytkownik ma juz lunch o ${myLunchReservation.timeSlot}.`
							: 'Ta sesja nie ma jeszcze rezerwacji lunchu na dzis.'}
					</p>
				</article>
			</section>

			<section className="stats-grid" aria-label="Podsumowanie operacyjne">
				<article className="stat-card stat-card--warning">
					<p>Domena do reakcji</p>
					<strong>{monitorAlerts.length}</strong>
				</article>
				<article className="stat-card">
					<p>Wymiany w miesiacu</p>
					<strong>{currentMonthExchanges.length}</strong>
				</article>
				<article className="stat-card stat-card--active">
					<p>Onboardingi w miesiacu</p>
					<strong>{currentMonthHires.length}</strong>
				</article>
				<article className="stat-card">
					<p>Lunch dzisiaj</p>
					<strong>
						{lunchReservations.length}/{totalLunchSeats}
					</strong>
				</article>
			</section>

			<section className="dashboard-home-insights" aria-label="Priorytety operacyjne">
				<DashboardListCard
					eyebrow="Priorytety"
					title="Uwaga dzisiaj"
					description="Najblizsze lub przeterminowane wpisy z domeny, ktore warto domknac najszybciej."
					items={monitorFocusItems}
					emptyState="Brak domen do pilnego ruchu. W Reactowej bazie nie ma dzis zadnego wpisu wymagajacego szybkiej reakcji."
					linkLabel="Przejdz do monitoringu"
					linkTo="/dashboard/monitor"
				/>
				<DashboardListCard
					eyebrow="Kolejka"
					title="Ruch operacyjny"
					description="Wspolna kolejka najblizszych wymian sprzetu i startow nowych pracownikow."
					items={operationalQueueItems}
					emptyState="Kolejka na teraz jest pusta. To dobry moment, zeby domknac zaleglosci albo przygotowac kolejne wpisy."
					linkLabel="Otworz moduly operacyjne"
					linkTo="/dashboard/exchanges"
				/>
				<DashboardListCard
					eyebrow="Zespol"
					title="Wspolpraca i lunch"
					description="Szybki kontekst do pracy zespolowej bez wychodzenia na osobne ekrany."
					items={collaborationItems}
					emptyState="Brak danych do pokazania."
					linkLabel="Otworz notatki"
					linkTo="/dashboard/notes"
				/>
			</section>

			<section className="dashboard-home-grid" aria-label="Moduly dashboardu">
				{appModules.map(module => (
					<article key={module.id} className="dashboard-home-card">
						<div className="dashboard-home-card__top">
							<p>{module.kicker}</p>
							<span className={`status-pill status-pill--${module.state}`}>
								{migrationLabelByState[module.state]}
							</span>
						</div>
						<h3>{module.title}</h3>
						<p>{module.description}</p>
						<div className="dashboard-home-card__summary">
							<strong>{moduleInsights[module.id].summary}</strong>
							<span>{moduleInsights[module.id].detail}</span>
						</div>
						<Link className="dashboard-home-card__link" to={module.path}>
							Otworz modul
						</Link>
					</article>
				))}
			</section>

			<section className="dashboard-home-tail-grid" aria-label="Pozostale widgety legacy dashboardu">
				{legacyDashboardWidgets.map(widget => (
					<article key={widget.title} className="data-card dashboard-home-legacy-card">
						<p className="month-summary-card__label">{widget.kicker}</p>
						<h3>{widget.title}</h3>
						<span>{widget.description}</span>
					</article>
				))}
			</section>
		</div>
	)
}
