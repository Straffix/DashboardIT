document.addEventListener('DOMContentLoaded', () => {
	/* ======= AUTOMATYCZNY ROK ======= */
	document.querySelectorAll('#current-year').forEach(el => {
		el.textContent = new Date().getFullYear()
	})

	/* ======= TRYB SZEROKI ======= */
	const fullscreenBtn = document.getElementById('fullscreen-btn')
	if (fullscreenBtn) {
		fullscreenBtn.addEventListener('click', () => {
			const isWide = document.body.classList.toggle('wide-mode')
			fullscreenBtn.innerHTML = isWide ? '<i class="fa-solid fa-compress"></i>' : '<i class="fa-solid fa-expand"></i>'
			localStorage.setItem('dashboard-wide-mode', isWide)
		})
		if (localStorage.getItem('dashboard-wide-mode') === 'true') {
			document.body.classList.add('wide-mode')
			fullscreenBtn.innerHTML = '<i class="fa-solid fa-compress"></i>'
		}
	}
})
