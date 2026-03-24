(function initializeDashboardTopbarModule() {
	const dashboardModules = (window.DashboardModules = window.DashboardModules || {})

	dashboardModules.initDashboardTopbar = ({ dashboardScrollCue, dashboardMenu } = {}) => {
		dashboardScrollCue?.addEventListener('click', () => {
			dashboardMenu?.scrollIntoView({
				behavior: 'smooth',
				block: 'start',
			})
		})

		document.querySelectorAll('.menu-item[target="_blank"]').forEach(link => {
			link.addEventListener('click', event => {
				event.preventDefault()
				const openedWindow = window.open(link.href, '_blank')
				if (!openedWindow) {
					window.location.href = link.href
				}
			})
		})
	}
})()
