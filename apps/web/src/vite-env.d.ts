/// <reference types="vite/client" />

interface ImportMetaEnv {
	readonly VITE_APP_DATA_SOURCE?: 'local' | 'api'
	readonly VITE_API_BASE_URL?: string
}

interface ImportMeta {
	readonly env: ImportMetaEnv
}
