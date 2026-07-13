(function redirectLegacyRoute() {
	var routeMap = {
		'#nowe-zatrudnienia': 'dashboard/hires',
		'#urzadzenia': 'dashboard/monitor',
		'#wymiana-sprzetu': 'dashboard/exchanges',
		'#obiady': 'dashboard/lunch',
		'#chat': 'dashboard/notes',
	}

	var root = document.documentElement
	var explicitRoute = String(root.getAttribute('data-legacy-route') || '').trim()
	var isDashboardShell = root.getAttribute('data-legacy-dashboard') === 'true'
	var targetPath = explicitRoute || 'dashboard'

	if (isDashboardShell) {
		targetPath = routeMap[window.location.hash] || 'dashboard'
	}

	var currentDirectory = window.location.pathname.replace(/[^/]*$/, '/')
	var targetUrl = new URL('./' + targetPath.replace(/^\//, ''), window.location.origin + currentDirectory)
	if (window.location.search) {
		targetUrl.search = window.location.search
	}

	if (!isDashboardShell && window.location.hash) {
		targetUrl.hash = window.location.hash
	}

	window.location.replace(targetUrl.toString())
})()
