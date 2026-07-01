const APP_DATA_SOURCE_MODES = ['local', 'api'] as const

export type AppDataSourceMode = (typeof APP_DATA_SOURCE_MODES)[number]

function normalizeDataSourceMode(value: string | undefined): AppDataSourceMode {
	return value === 'api' ? 'api' : 'local'
}

export function getAppDataSourceMode(): AppDataSourceMode {
	return normalizeDataSourceMode(import.meta.env.VITE_APP_DATA_SOURCE)
}

export function getApiBaseUrl() {
	const configuredValue = import.meta.env.VITE_API_BASE_URL?.trim()
	if (!configuredValue) return '/api'

	return configuredValue.endsWith('/') ? configuredValue.slice(0, -1) : configuredValue
}
