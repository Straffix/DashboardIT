import { useEffect, useState } from 'react'

import type { AppSessionUser } from '../session/types'
import type { DashboardTheme } from '../theme/useDashboardTheme'

const themeOptions: Array<{ id: DashboardTheme; label: string }> = [
	{ id: 'light', label: 'Jasny' },
	{ id: 'dark', label: 'Ciemny' },
	{ id: 'blush', label: 'Rossmann' },
]

function formatClockTime(value: Date) {
	return value.toLocaleTimeString('pl-PL', {
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit',
	})
}

function formatClockDate(value: Date) {
	return value.toLocaleDateString('pl-PL', {
		weekday: 'long',
		day: 'numeric',
		month: 'long',
	})
}

function getThemeSummary(theme: DashboardTheme) {
	if (theme === 'dark') return 'ciemnym'
	if (theme === 'blush') return 'rossmann'
	return 'jasnym'
}

type DashboardTopbarProps = {
	activeUser: AppSessionUser | null
	currentViewLabel: string
	isHomeRoute: boolean
	onActionClick: () => void
	onThemeChange: (theme: DashboardTheme) => void
	theme: DashboardTheme
}

export function DashboardTopbar({
	activeUser,
	currentViewLabel,
	isHomeRoute,
	onActionClick,
	onThemeChange,
	theme,
}: DashboardTopbarProps) {
	const [now, setNow] = useState(() => new Date())

	useEffect(() => {
		const intervalId = window.setInterval(() => {
			setNow(new Date())
		}, 1000)

		return () => {
			window.clearInterval(intervalId)
		}
	}, [])

	const hourRotation = ((now.getHours() % 12) + now.getMinutes() / 60) * 30
	const minuteRotation = (now.getMinutes() + now.getSeconds() / 60) * 6
	const secondRotation = now.getSeconds() * 6
	const actionLabel = isHomeRoute ? 'Do modulow' : 'Wroc na start'

	return (
		<section className="app-shell__topbar" aria-label="Szybkie sterowanie dashboardem">
			<div className="app-shell__topbar-copy">
				<p className="app-shell__topbar-eyebrow">Szybki panel pracy</p>
				<strong>{currentViewLabel}</strong>
				<span>
					{activeUser
						? `${activeUser.fullName} pracuje teraz w motywie ${getThemeSummary(theme)}. Preferencja zapisuje sie osobno dla aktywnej sesji.`
						: 'Nawigacja startowa, motywy i shell dashboardu sa gotowe do codziennej pracy.'}
				</span>
			</div>

			<div className="app-shell__topbar-controls">
				<div className="app-shell__theme-stack">
					<span className="app-shell__topbar-label">Motyw</span>
					<div className="app-shell__theme-switch" role="group" aria-label="Wybierz motyw dashboardu">
						{themeOptions.map(option => {
							const isActive = option.id === theme

							return (
								<button
									key={option.id}
									type="button"
									className={`app-shell__theme-btn${isActive ? ' is-active' : ''}`}
									aria-pressed={isActive}
									onClick={() => {
										onThemeChange(option.id)
									}}>
									<span className={`app-shell__theme-swatch app-shell__theme-swatch--${option.id}`} aria-hidden="true" />
									<span>{option.label}</span>
								</button>
							)
						})}
					</div>
				</div>

				<button type="button" className="button-secondary app-shell__topbar-action" onClick={onActionClick}>
					{actionLabel}
				</button>

				<div className="app-shell__clock-card" aria-live="polite">
					<span className="app-shell__clock-face" aria-hidden="true">
						<span className="app-shell__clock-ring" />
						<span className="app-shell__clock-glow" />
						<span
							className="app-shell__clock-hand app-shell__clock-hand--hour"
							style={{ transform: `translateX(-50%) rotate(${hourRotation}deg)` }}
						/>
						<span
							className="app-shell__clock-hand app-shell__clock-hand--minute"
							style={{ transform: `translateX(-50%) rotate(${minuteRotation}deg)` }}
						/>
						<span
							className="app-shell__clock-hand app-shell__clock-hand--second"
							style={{ transform: `translateX(-50%) rotate(${secondRotation}deg)` }}
						/>
						<span className="app-shell__clock-center" />
					</span>

					<span className="app-shell__clock-meta">
						<strong>{formatClockTime(now)}</strong>
						<span>{formatClockDate(now)}</span>
					</span>
				</div>
			</div>
		</section>
	)
}
