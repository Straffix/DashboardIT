self.addEventListener('install', event => {
	event.waitUntil(self.skipWaiting())
})

self.addEventListener('activate', event => {
	event.waitUntil(self.clients.claim())
})

self.addEventListener('notificationclick', event => {
	const notification = event.notification
	const payload = notification?.data || {}
	const scopeUrl = self.registration?.scope || new URL('./', self.location.href).toString()
	const dashboardIndexUrl = new URL('index.html', scopeUrl).toString()
	const targetUrl = payload.url || dashboardIndexUrl

	notification?.close()

	event.waitUntil(
		(async () => {
			const windowClients = await self.clients.matchAll({
				type: 'window',
				includeUncontrolled: true,
			})

			let targetClient = windowClients.find(client => client.url.startsWith(scopeUrl))

			if (targetClient) {
				if ('navigate' in targetClient && !targetClient.url.startsWith(dashboardIndexUrl)) {
					targetClient = (await targetClient.navigate(targetUrl)) || targetClient
				}
				await targetClient.focus()
			} else if (self.clients.openWindow) {
				targetClient = await self.clients.openWindow(targetUrl)
			}

			targetClient?.postMessage({
				type: 'dashboard-task-notification-click',
				task: payload.task || null,
			})
		})()
	)
})
