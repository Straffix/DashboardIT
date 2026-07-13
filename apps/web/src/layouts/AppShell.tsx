import { useEffect } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'

import { getAppDataSourceMode } from '../config/dataSource'
import { appModules } from '../data/modules'
import { useDashboardModuleOrder } from '../features/dashboard-menu/hooks'
import { useAppSession } from '../features/session/AppSessionProvider'
import { DashboardTopbar } from '../features/shell/DashboardTopbar'
import { useDashboardTheme } from '../features/theme/useDashboardTheme'

const DASHBOARD_MODULES_TARGET_ID = 'dashboard-modules-stage'

const getNavClassName = ({ isActive }: { isActive: boolean }) =>
	isActive ? 'app-shell__nav-link is-active' : 'app-shell__nav-link'

export function AppShell() {
	const { activeUser } = useAppSession()
	const dataSourceMode = getAppDataSourceMode()
	const { orderedItems: orderedModules } = useDashboardModuleOrder(appModules, activeUser?.id || '')
	const { theme, setTheme } = useDashboardTheme(activeUser?.id || '')
	const location = useLocation()
	const navigate = useNavigate()
	const isDashboardHomeRoute = location.pathname === '/' || location.pathname === '/dashboard'
	const currentViewLabel = isDashboardHomeRoute
		? 'Start dashboardu'
		: orderedModules.find(module => module.path === location.pathname)?.title || 'Widok dashboardu'

	useEffect(() => {
		const hashTargetId = String(location.hash || '').replace(/^#/, '').trim()
		if (!hashTargetId) return

		const animationFrameId = window.requestAnimationFrame(() => {
			const targetElement = document.getElementById(hashTargetId)
			targetElement?.scrollIntoView({ behavior: 'smooth', block: 'start' })
		})

		return () => {
			window.cancelAnimationFrame(animationFrameId)
		}
	}, [location.hash, location.pathname])

	const handleShellAction = () => {
		if (isDashboardHomeRoute) {
			document.getElementById(DASHBOARD_MODULES_TARGET_ID)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
			return
		}

		navigate(`/dashboard#${DASHBOARD_MODULES_TARGET_ID}`)
	}

	return (
		<div className="app-shell">
			<div className="app-shell__backdrop app-shell__backdrop--left" aria-hidden="true" />
			<div className="app-shell__backdrop app-shell__backdrop--right" aria-hidden="true" />

			<DashboardTopbar
				activeUser={activeUser}
				currentViewLabel={currentViewLabel}
				isHomeRoute={isDashboardHomeRoute}
				onActionClick={handleShellAction}
				onThemeChange={setTheme}
				theme={theme}
			/>

			<header className="app-shell__header">
				<div>
					<p className="app-shell__eyebrow">Dashboard IT</p>
					<h1 className="app-shell__title">Dashboard IT</h1>
					<p className="app-shell__subtitle">
						Glowne widoki, widzety, kolejnosc modulow i preferencje interfejsu dzialaja juz w jednej
						aplikacji React. To jest docelowy panel pracy dla zespolu IT.
					</p>
					<div className="app-shell__status-row">
						<span className={`status-pill status-pill--${dataSourceMode === 'api' ? 'ready' : 'warning'}`}>
							Dane: {dataSourceMode === 'api' ? 'API' : 'lokalne dane'}
						</span>
						<span className={`status-pill status-pill--${activeUser ? 'active' : 'planned'}`}>
							Sesja: {activeUser ? activeUser.fullName : 'brak aktywnej osoby'}
						</span>
						<span className="status-pill status-pill--neutral">Motyw: {theme}</span>
					</div>
				</div>
			</header>

			<nav className="app-shell__nav" aria-label="Nawigacja dashboardu">
				<NavLink to="/dashboard" end className={getNavClassName}>
					Start
				</NavLink>
				{orderedModules.map(module => (
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
