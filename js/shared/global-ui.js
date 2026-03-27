/* === Shared Global UI: Start === */
const applyTheme = theme => {
	const normalizedTheme = ['light', 'dark', 'rossmann'].includes(theme) ? theme : 'light'
	const isDark = normalizedTheme === 'dark'
	const isRossmann = normalizedTheme === 'rossmann'
	document.body.classList.toggle('theme-dark', isDark)
	document.body.classList.toggle('theme-rossmann', isRossmann)
	document.documentElement.setAttribute('data-theme', normalizedTheme)
}

const THEME_STORAGE_KEY = APP_CONFIG.PREFERENCE_KEYS.THEME
const WIDE_MODE_STORAGE_KEY = APP_CONFIG.PREFERENCE_KEYS.WIDE_MODE

const normalizeStoredTheme = theme => (['light', 'dark', 'rossmann'].includes(theme) ? theme : 'light')

const getStoredTheme = () =>
	normalizeStoredTheme(preferencesService?.getTheme?.() || storageService?.getText(THEME_STORAGE_KEY, 'light') || 'light')

const createThemeToggle = () => {
	if (document.querySelector('.theme-toggle-menu')) return null

	const wrapper = document.createElement('div')
	wrapper.className = 'theme-toggle-menu'
	const toggle = document.createElement('button')
	toggle.type = 'button'
	toggle.className = 'theme-toggle-btn'
	toggle.setAttribute('aria-label', 'Przelacz motyw')
	toggle.setAttribute('aria-haspopup', 'true')

	const submenu = document.createElement('div')
	submenu.className = 'theme-toggle-submenu'
	submenu.innerHTML = `
		<p class="theme-toggle-submenu-label">Kolorystyka ekstra</p>
		<button type="button" class="theme-toggle-option" data-theme-option="rossmann">
			<i class="fa-solid fa-store"></i>
			<span>Rossmann</span>
		</button>
	`

	const rossmannButton = submenu.querySelector('[data-theme-option="rossmann"]')

	const setTheme = theme => {
		const normalizedTheme = normalizeStoredTheme(theme)
		applyTheme(normalizedTheme)
		preferencesService?.setTheme?.(normalizedTheme) || storageService?.setText?.(THEME_STORAGE_KEY, normalizedTheme)
		updateToggle(normalizedTheme)
	}

	const updateToggle = theme => {
		const isDark = theme === 'dark'
		const isRossmann = theme === 'rossmann'

		toggle.innerHTML = isDark
			? '<i class="fa-solid fa-sun"></i><span>Light Mode</span>'
			: '<i class="fa-solid fa-moon"></i><span>Dark Mode</span>'
		toggle.setAttribute('aria-pressed', String(isDark))
		toggle.title = isDark ? 'Przelacz na jasny motyw' : 'Przelacz na ciemny motyw'
		toggle.setAttribute('data-active-theme', theme)
		wrapper.setAttribute('data-active-theme', theme)

		if (rossmannButton) {
			rossmannButton.classList.toggle('is-active', isRossmann)
			rossmannButton.setAttribute('aria-pressed', String(isRossmann))
			rossmannButton.title = isRossmann ? 'Motyw Rossmann jest aktywny' : 'Wlacz motyw Rossmann'
		}
	}

	toggle.addEventListener('click', () => {
		const nextTheme = document.body.classList.contains('theme-dark') ? 'light' : 'dark'
		setTheme(nextTheme)
	})

	rossmannButton?.addEventListener('click', event => {
		event.preventDefault()
		event.stopPropagation()
		setTheme('rossmann')
	})

	window.addEventListener('storage', event => {
		if (event.key === THEME_STORAGE_KEY) {
			updateToggle(getStoredTheme())
		}
	})

	updateToggle(getStoredTheme())
	wrapper.append(toggle, submenu)
	return wrapper
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
