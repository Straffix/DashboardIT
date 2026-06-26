/* Main frontend entrypoint.
 * We keep one HTML include while preserving the original script boundaries and load order.
 */
(function loadDashboardRuntime() {
	if (window.__dashboardRuntimeLoaderRan) {
		return
	}

	window.__dashboardRuntimeLoaderRan = true

	const sharedScripts = [
		'./js/shared/base.js',
		'./js/shared/runtime-config.js',
		'./js/shared/page-router.js',
		'./js/core/storage-service.js',
		'./js/shared/auth.js',
		'./js/shared/public-api.js',
		'./js/shared/global-ui.js',
	]

	const pageName = (() => {
		const currentPath = window.location.pathname.split('/').pop()
		return currentPath || 'index.html'
	})()

	const pageScriptsByFile = {
		'dashboard.html': [],
		'index.html': [
			'./js/pages/dashboard/clock.js',
			'./js/pages/dashboard/topbar.js',
			'./js/pages/dashboard/weather.js',
			'./js/pages/dashboard/tasks/reminders.js',
			'./js/pages/dashboard/tasks/planner.js',
			'./js/pages/dashboard/index.js',
			'./js/pages/dashboard/bookmarks-enhanced.js',
		],
		'monitor_laptopow.html': ['./js/pages/monitor/index.js'],
		'notatnik.html': ['./js/core/domain-services.js', './js/pages/notes/index.js'],
		'nowe_zatrudnienia.html': ['./js/pages/hires/index.js'],
		'rezerwacja_obiadow.html': ['./js/core/domain-services.js', './js/pages/lunch/index.js'],
		'wymiana_sprzetu.html': ['./js/pages/exchanges/index.js'],
	}

	window.__dashboardRuntimeScriptRegistry = {
		sharedScripts: [...sharedScripts],
		pageScriptsByFile: { ...pageScriptsByFile },
	}

	const scriptPaths = [...sharedScripts, ...(pageScriptsByFile[pageName] || [])]

	const writeScripts = () => {
		const tags = scriptPaths.map(path => `<script src="${path}" charset="utf-8"><\/script>`)
		document.write(tags.join(''))
	}

	const loadScriptsSequentially = async () => {
		for (const path of scriptPaths) {
			await new Promise((resolve, reject) => {
				const script = document.createElement('script')
				script.src = path
				script.charset = 'utf-8'
				script.async = false
				script.onload = resolve
				script.onerror = () => reject(new Error(`Nie udalo sie zaladowac ${path}`))
				document.head.appendChild(script)
			})
		}

		document.dispatchEvent(new Event('DOMContentLoaded'))
	}

	if (document.readyState === 'loading' && typeof document.write === 'function') {
		writeScripts()
		return
	}

	void loadScriptsSequentially().catch(error => {
		console.error(error)
	})
})()
