/* === Shared Global UI: Start === */
const applyTheme = theme => {
	const isDark = theme === 'dark'
	document.body.classList.toggle('theme-dark', isDark)
}

const THEME_STORAGE_KEY = APP_CONFIG.PREFERENCE_KEYS.THEME
const WIDE_MODE_STORAGE_KEY = APP_CONFIG.PREFERENCE_KEYS.WIDE_MODE

const getStoredTheme = () => preferencesService?.getTheme?.() || storageService?.getText(THEME_STORAGE_KEY, 'light') || 'light'

const createThemeToggle = () => {
	if (document.querySelector('.theme-toggle-btn')) return null

	const toggle = document.createElement('button')
	toggle.type = 'button'
	toggle.className = 'theme-toggle-btn'
	toggle.setAttribute('aria-label', 'Przelacz motyw')
	toggle.innerHTML = `
		<i class="fa-solid fa-moon"></i>
		<span>Dark Mode</span>
	`

	const updateToggle = isDark => {
		toggle.innerHTML = isDark
			? '<i class="fa-solid fa-sun"></i><span>Light Mode</span>'
			: '<i class="fa-solid fa-moon"></i><span>Dark Mode</span>'
		toggle.setAttribute('aria-pressed', String(isDark))
		toggle.title = isDark ? 'Przelacz na jasny motyw' : 'Przelacz na ciemny motyw'
	}

	toggle.addEventListener('click', () => {
		const nextTheme = document.body.classList.contains('theme-dark') ? 'light' : 'dark'
		applyTheme(nextTheme)
		preferencesService?.setTheme?.(nextTheme) || storageService?.setText?.(THEME_STORAGE_KEY, nextTheme)
		updateToggle(nextTheme === 'dark')
	})

	window.addEventListener('storage', event => {
		if (event.key === THEME_STORAGE_KEY) {
			updateToggle(getStoredTheme() === 'dark')
		}
	})

	updateToggle(getStoredTheme() === 'dark')
	return toggle
}

document.addEventListener('DOMContentLoaded', () => {
	applyTheme(getStoredTheme())
	ensureAuthUi()
	ensurePageStatusStrip()
	syncCurrentUserFromSession()

	document.querySelectorAll('#current-year').forEach(element => {
		element.textContent = new Date().getFullYear()
	})

	const themeToggle = createThemeToggle()
	if (themeToggle) {
		const dashboardBookmarkSlot = document.querySelector('.dashboard-theme-bookmark-slot')
		const dashboardTopbar = document.querySelector('.dashboard-topbar')
		if (document.body.classList.contains('dashboard-page') && dashboardTopbar) {
			if (dashboardBookmarkSlot) {
				dashboardBookmarkSlot.appendChild(themeToggle)
			} else {
				dashboardTopbar.prepend(themeToggle)
			}
		} else {
			document.body.appendChild(themeToggle)
		}
	}

	const returnMenuLinks = document.querySelectorAll('.menu-btn[href="index.html"]')
	returnMenuLinks.forEach(link => {
		link.addEventListener('click', event => {
			if (window.opener && !window.opener.closed) {
				event.preventDefault()

				try {
					window.opener.focus()
				} catch (error) {
					// Browser may block focusing the opener tab.
				}

				window.close()
				return
			}

			window.location.href = link.href
		})
	})

	const fullscreenBtn = document.getElementById('fullscreen-btn')
	if (fullscreenBtn) {
		const updateWideMode = isWide => {
			document.body.classList.toggle('wide-mode', isWide)
			fullscreenBtn.innerHTML = isWide ? '<i class="fa-solid fa-compress"></i>' : '<i class="fa-solid fa-expand"></i>'
		}

		fullscreenBtn.addEventListener('click', () => {
			const isWide = !document.body.classList.contains('wide-mode')
			updateWideMode(isWide)
			preferencesService?.setWideMode?.(isWide) || storageService?.setBoolean?.(WIDE_MODE_STORAGE_KEY, isWide)
		})

		updateWideMode(preferencesService?.getWideMode?.() ?? storageService?.getBoolean?.(WIDE_MODE_STORAGE_KEY, false))
	}

	window.addEventListener('storage', event => {
		if (event.key === APP_CONFIG.STORAGE_KEYS.SESSION || event.key === APP_CONFIG.STORAGE_KEYS.USERS) {
			closeUserPopover()
			syncCurrentUserFromSession()
		}

		if (event.key === THEME_STORAGE_KEY) {
			applyTheme(getStoredTheme())
		}
	})
})
/* === Shared Global UI: End === */
