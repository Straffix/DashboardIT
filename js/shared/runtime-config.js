// Set storageMode to 'local' when the hosting does not provide a working PHP/database backend.
const existingDashboardRuntimeConfig = window.DashboardRuntimeConfig || {}
const defaultDashboardOneTimeResetConfig = {
	version: '2026-04-24-clean-start',
	apiPath: 'reset-app-data.php',
	clearLocalData: true,
	clearRemoteData: true,
}

window.DashboardRuntimeConfig = {
	storageMode: 'auto',
	fallbackToLocalOnRemoteError: true,
	...existingDashboardRuntimeConfig,
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

	const localMarkerKey = `dashboard_app_local_reset::${resetVersion}`
	const remoteMarkerKey = `dashboard_app_remote_reset::${resetVersion}`
	const localOnlyStorageKeys = new Set(['monitor_laptopow_dane', 'nowe_zatrudnienia_dane', 'wymiana_sprzetu_dane'])
	const shouldResetKey = key => {
		if (!key || key === localMarkerKey || key === remoteMarkerKey) {
			return false
		}

		return key.startsWith('dashboard') || localOnlyStorageKeys.has(key)
	}

	const removeMatchingKeys = storage => {
		if (!storage) {
			return
		}

		const keysToRemove = []
		for (let index = 0; index < storage.length; index += 1) {
			const key = storage.key(index)
			if (shouldResetKey(key)) {
				keysToRemove.push(key)
			}
		}

		keysToRemove.forEach(key => {
			try {
				storage.removeItem(key)
			} catch (error) {
				// Ignore storage cleanup failures and continue with the reset flow.
			}
		})
	}

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

	if (resetConfig.clearLocalData !== false && !readStorageFlag(localMarkerKey)) {
		removeMatchingKeys(localStorage)
		removeMatchingKeys(sessionStorage)
		writeStorageFlag(localMarkerKey)
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
