const existingDashboardRuntimeConfig = window.DashboardRuntimeConfig || {}
const defaultDashboardOneTimeAccountCleanupConfig = {
	version: '2026-10-07-dev-account-cleanup',
	ownerFullName: 'Arkadiusz Lisiecki',
}

window.DashboardRuntimeConfig = {
	oneTimeAccountCleanup: {
		...defaultDashboardOneTimeAccountCleanupConfig,
		...(existingDashboardRuntimeConfig.oneTimeAccountCleanup || {}),
	},
}
