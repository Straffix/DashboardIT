document.addEventListener('DOMContentLoaded', () => {
	/* ======= AUTOMATYCZNY ROK W FOOTERZE ======= */
	// Używamy standardowej metody, bo to prosty element
	document.querySelectorAll('#current-year').forEach(el => {
		el.textContent = new Date().getFullYear()
	})

	/* ======= FULLSCREEN BUTTON ======= */
	const fullscreenBtn = document.getElementById('fullscreen-btn')

	if (fullscreenBtn) {
		fullscreenBtn.addEventListener('click', () => {
			if (!document.fullscreenElement) {
				document.documentElement.requestFullscreen()
				document.body.classList.add('fullscreen-mode')
				fullscreenBtn.innerHTML = '<i class="fa-solid fa-compress"></i>'
			} else {
				document.exitFullscreen()
				document.body.classList.remove('fullscreen-mode')
				fullscreenBtn.innerHTML = '<i class="fa-solid fa-expand"></i>'
			}
		})
	}
})
