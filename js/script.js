document.addEventListener('DOMContentLoaded', () => {
	/* ======= AUTOMATYCZNY ROK W FOOTERZE ======= */
	document.querySelectorAll('#current-year').forEach(el => {
		el.textContent = new Date().getFullYear()
	})

	/* ======= TRYB SZEROKI (ZAMIAST FULLSCREEN) ======= */
	const fullscreenBtn = document.getElementById('fullscreen-btn')

	if (fullscreenBtn) {
		fullscreenBtn.addEventListener('click', () => {
			// Przełączamy klasę wide-mode na body
			const isWide = document.body.classList.toggle('wide-mode')

			// Zmieniamy ikonkę w zależności od stanu
			if (isWide) {
				fullscreenBtn.innerHTML = '<i class="fa-solid fa-compress"></i>'
			} else {
				fullscreenBtn.innerHTML = '<i class="fa-solid fa-expand"></i>'
			}

			// Opcjonalnie: Zapisz stan w localStorage, żeby po odświeżeniu tryb został zachowany
			localStorage.setItem('dashboard-wide-mode', isWide)
		})

		// Sprawdzanie przy starcie, czy tryb szeroki był włączony wcześniej
		if (localStorage.getItem('dashboard-wide-mode') === 'true') {
			document.body.classList.add('wide-mode')
			fullscreenBtn.innerHTML = '<i class="fa-solid fa-compress"></i>'
		}
	}
})
