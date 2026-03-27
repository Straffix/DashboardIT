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
		<button type="button" class="theme-toggle-option" data-theme-option="rossmann">
			<span class="theme-toggle-option-badge" aria-hidden="true">
				<svg viewBox="0 0 24 24" class="theme-toggle-option-logo">
					<path d="M12 0C5.391 0 0 5.391 0 12s5.391 12 12 12 12-5.391 12-12S18.609 0 12 0m0 2.088a9.93 9.93 0 0 1 7.477 3.39H16l.348-.607c.347-.783-.958-1.392-1.393-.61l-.607 1.218H4.52C6.435 3.392 9.131 2.088 12 2.088m8.434 4.695A10.07 10.07 0 0 1 21.912 12c0 4.087-2.522 7.653-6.174 9.13l-3.912-3.911q-.13-.131 0-.262l1.39-2.783c.088-.087.174-.174.26-.174h2.436c.087 0 .088.087.088.174l-.697 1.478s0 .174.088.174l.869.61c.087.087.175-.001.261-.088l.956-2.26c.087-.087.174-.174.261-.174h.87s.087 0 .087.174L18 15.652s-.001.174.086.174l.957.61c.087.087.173-.001.26-.088 0-.087 1.045-2.26 1.045-2.434.26-.609.172-1.652-1.045-1.652h-1.39a.19.19 0 0 1-.175-.174v-4.61q0-.26.262-.26zm-16.782.088s9.13.434 9.217.434.26 0 .26.174c.087.173.87 2.174.957 2.261s.087.348-.348.348H4.87a1.15 1.15 0 0 0-1.13 1.13v3.305c0 .261.086.522.173.696.261.26.696.433.783.433.087.087.174.001.174-.086v-4.261c0-.087.087-.174.174-.174H6s.173 0 .086.088c-.348.435-.434.87-.434 1.652 0 1.217.87 1.999 1.217 2.26 0 0 .087.087 0 .174S6 17.044 6 17.13q-.13.131 0 .262l4.348 4.26c-4.696-.87-8.174-4.87-8.174-9.653 0-1.913.522-3.65 1.478-5.129M9.912 14h.957s.173 0 .086.174-1.39 2.696-1.39 2.783v.174l4.52 4.435c-.52.174-1.042.173-1.564.26l-4.435-4.433c-.087-.087 0-.175 0-.262s1.48-2.87 1.566-2.957c0-.087.086-.174.26-.174"/>
				</svg>
			</span>
			<span>Ross Mode</span>
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
		toggle.setAttribute('aria-label', isDark ? 'Przelacz na jasny motyw' : 'Przelacz na ciemny motyw')
		toggle.removeAttribute('title')
		toggle.setAttribute('data-active-theme', theme)
		wrapper.setAttribute('data-active-theme', theme)

		if (rossmannButton) {
			rossmannButton.classList.toggle('is-active', isRossmann)
			rossmannButton.setAttribute('aria-pressed', String(isRossmann))
			rossmannButton.setAttribute('aria-label', isRossmann ? 'Motyw Rossmann jest aktywny' : 'Wlacz motyw Rossmann')
			rossmannButton.removeAttribute('title')
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
