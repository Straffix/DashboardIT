import { NavLink, Outlet } from 'react-router-dom'

import { getAppDataSourceMode } from '../config/dataSource'
import { appModules } from '../data/modules'
import { useAppSession } from '../features/session/AppSessionProvider'

const getNavClassName = ({ isActive }: { isActive: boolean }) =>
	isActive ? 'app-shell__nav-link is-active' : 'app-shell__nav-link'

export function AppShell() {
	const { activeUser } = useAppSession()
	const dataSourceMode = getAppDataSourceMode()

	return (
		<div className="app-shell">
			<div className="app-shell__backdrop app-shell__backdrop--left" aria-hidden="true" />
			<div className="app-shell__backdrop app-shell__backdrop--right" aria-hidden="true" />

			<header className="app-shell__header">
				<div>
					<p className="app-shell__eyebrow">Dashboard IT</p>
					<h1 className="app-shell__title">Reactowa warstwa operacyjna</h1>
					<p className="app-shell__subtitle">
						Moduly operacyjne dzialaja juz w React, a strona glowna zaczyna przejmowac funkcje starego
						dashboardu. Legacy HTML i czysty JS zostaja tylko jako referencja do pelnej parity.
					</p>
					<div className="app-shell__status-row">
						<span className={`status-pill status-pill--${dataSourceMode === 'api' ? 'ready' : 'warning'}`}>
							Dane: {dataSourceMode === 'api' ? 'API' : 'local demo'}
						</span>
						<span className={`status-pill status-pill--${activeUser ? 'active' : 'planned'}`}>
							Sesja: {activeUser ? activeUser.fullName : 'brak'}
						</span>
					</div>
				</div>
			</header>

			<nav className="app-shell__nav" aria-label="Nawigacja dashboardu">
				<NavLink to="/dashboard" end className={getNavClassName}>
					Start
				</NavLink>
				{appModules.map(module => (
					<NavLink key={module.id} to={module.path} className={getNavClassName}>
						{module.title}
					</NavLink>
				))}
			</nav>

			<main className="app-shell__main">
				<Outlet />
			</main>
		</div>
	)
}
