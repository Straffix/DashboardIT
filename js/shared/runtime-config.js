// Set storageMode to 'local' when the hosting does not provide a working PHP/database backend.
window.DashboardRuntimeConfig = {
	storageMode: 'auto',
	fallbackToLocalOnRemoteError: true,
	...(window.DashboardRuntimeConfig || {}),
}
