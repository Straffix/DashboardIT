(function initializeDashboardTopbarModule() {
	const dashboardModules = (window.DashboardModules = window.DashboardModules || {})

	dashboardModules.initDashboardTopbar = ({ dashboardScrollCue, dashboardMenu } = {}) => {
		dashboardScrollCue?.addEventListener('click', () => {
			dashboardMenu?.scrollIntoView({
				behavior: 'smooth',
				block: 'start',
			})
		})
	}
})()
