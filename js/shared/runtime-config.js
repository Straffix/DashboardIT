// DashboardIT prefers the PHP/PostgreSQL backend, with an optional browser-only fallback for local Live Server testing.
const existingDashboardRuntimeConfig = window.DashboardRuntimeConfig || {}
const defaultDashboardOneTimeResetConfig = {
	version: '',
	apiPath: 'reset-app-data.php',
	clearRemoteData: false,
}
// LIVE_SERVER_FALLBACK_START
const defaultLiveServerBrowserFallbackConfig = {
	enabled: true,
	allowedHosts: ['127.0.0.1', 'localhost'],
	resetVersion: '2026-05-27-clean-live-server-auth',
}
// LIVE_SERVER_FALLBACK_END

window.DashboardRuntimeConfig = {
	storageMode: 'remote',
	fallbackToLocalOnRemoteError: false,
	...existingDashboardRuntimeConfig,
	// LIVE_SERVER_FALLBACK_START
	liveServerBrowserFallback: {
		...defaultLiveServerBrowserFallbackConfig,
		...(existingDashboardRuntimeConfig.liveServerBrowserFallback || {}),
	},
	// LIVE_SERVER_FALLBACK_END
	oneTimeReset: {
		...defaultDashboardOneTimeResetConfig,
		...(existingDashboardRuntimeConfig.oneTimeReset || {}),
	},
}

;(function runDashboardOneTimeReset() {
	const runtimeConfig = window.DashboardRuntimeConfig || {}
	const resetConfig = runtimeConfig.oneTimeReset || {}
	const resetVersion = String(resetConfig.version || '').trim()

	if (!resetVersion) {
		return
	}

	const remoteMarkerKey = `dashboard_app_remote_reset::${resetVersion}`
	const readStorageFlag = key => {
		try {
			return localStorage.getItem(key)
		} catch (error) {
			return null
		}
	}

	const writeStorageFlag = key => {
		try {
			localStorage.setItem(key, new Date().toISOString())
		} catch (error) {
			// Ignore marker write failures and keep the reset best-effort.
		}
	}

	if (resetConfig.clearRemoteData === false || readStorageFlag(remoteMarkerKey) || window.location.protocol === 'file:') {
		return
	}

	const configuredApiBase = String(runtimeConfig.apiBaseUrl || './api/').trim() || './api/'
	const apiBaseUrl = new URL(configuredApiBase.endsWith('/') ? configuredApiBase : `${configuredApiBase}/`, document.baseURI)
	const apiPath = String(resetConfig.apiPath || 'reset-app-data.php').trim() || 'reset-app-data.php'
	const endpointUrl = new URL(apiPath, apiBaseUrl).toString()
	const xhr = new XMLHttpRequest()

	try {
		xhr.open('POST', endpointUrl, false)
		xhr.withCredentials = true
		xhr.setRequestHeader('Accept', 'application/json')
		xhr.setRequestHeader('Content-Type', 'application/json')
		xhr.send(JSON.stringify({ version: resetVersion }))

		if (xhr.status < 200 || xhr.status >= 300) {
			return
		}

		const payload = JSON.parse(xhr.responseText || '{}')
		if (payload?.ok) {
			writeStorageFlag(remoteMarkerKey)
		}
	} catch (error) {
		// Ignore remote reset failures here and retry on the next page load.
	}
})()
