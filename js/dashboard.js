document.addEventListener('DOMContentLoaded', () => {
	const dashboardContainer = document.querySelector('.dashboard-container')
	if (dashboardContainer) {
		dashboardContainer.classList.add('is-ready')
	}

	document.querySelectorAll('.menu-item[target="_blank"]').forEach(link => {
		link.addEventListener('click', event => {
			event.preventDefault()
			window.open(link.href, '_blank')
		})
	})
})
