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
const DEFAULT_API_BASE_PATH = './api/'
const DEFAULT_RESET_API_PATH = 'reset-app-data.php'
const URL_SCHEME_PATTERN = /^[a-z][a-z0-9+.-]*:/i

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

	const resolveSafeApiBaseUrl = value => {
		const documentUrl = new URL(document.baseURI)
		const configuredBase = String(value || DEFAULT_API_BASE_PATH).trim() || DEFAULT_API_BASE_PATH
		const normalizedBase = configuredBase.endsWith('/') ? configuredBase : `${configuredBase}/`

		try {
			const resolvedBase = new URL(normalizedBase, documentUrl)
			const isSafeProtocol = ['http:', 'https:', 'file:'].includes(resolvedBase.protocol)
			const isSameOrigin = documentUrl.protocol === 'file:'
				? resolvedBase.protocol === 'file:'
				: resolvedBase.origin === documentUrl.origin

			if (isSafeProtocol && isSameOrigin) {
				return resolvedBase
			}
		} catch (error) {
			// Fall back to the bundled API location when runtime overrides are invalid.
		}

		return new URL(DEFAULT_API_BASE_PATH, documentUrl)
	}
	const resolveSafeApiPath = value => {
		const normalizedPath = String(value || DEFAULT_RESET_API_PATH).trim() || DEFAULT_RESET_API_PATH
		const pathWithoutSearch = normalizedPath.split(/[?#]/, 1)[0]
		const pathSegments = pathWithoutSearch.split('/').filter(Boolean)
		const hasUnsafeTraversal = pathSegments.includes('..')
		const hasUnsafeCharacters = /[\r\n\\]/.test(normalizedPath)
		const hasExplicitScheme = URL_SCHEME_PATTERN.test(normalizedPath)
		const isProtocolRelative = normalizedPath.startsWith('//')

		if (hasUnsafeTraversal || hasUnsafeCharacters || hasExplicitScheme || isProtocolRelative) {
			return DEFAULT_RESET_API_PATH
		}

		return normalizedPath.replace(/^\/+/, '') || DEFAULT_RESET_API_PATH
	}
	const apiBaseUrl = resolveSafeApiBaseUrl(runtimeConfig.apiBaseUrl)
	const apiPath = resolveSafeApiPath(resetConfig.apiPath)
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
