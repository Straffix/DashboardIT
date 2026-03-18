/* === Dashboard Init: Start === */
document.addEventListener('DOMContentLoaded', () => {
	const dashboardContainer = document.querySelector('.dashboard-container')
	if (dashboardContainer) {
		dashboardContainer.classList.add('is-ready')
	}

	const weatherConfig = {
		storageKey: 'dashboard-weather-location',
		fallbackName: 'Warszawa',
		fallbackLat: 52.2298,
		fallbackLon: 21.0118,
	}

	const weatherCodeMap = {
		0: { label: 'Bezchmurnie', icon: 'fa-sun' },
		1: { label: 'Głównie słonecznie', icon: 'fa-cloud-sun' },
		2: { label: 'Częściowe zachmurzenie', icon: 'fa-cloud-sun' },
		3: { label: 'Pochmurno', icon: 'fa-cloud' },
		45: { label: 'Mgła', icon: 'fa-smog' },
		48: { label: 'Osadzająca się mgła', icon: 'fa-smog' },
		51: { label: 'Lekka mżawka', icon: 'fa-cloud-rain' },
		53: { label: 'Mżawka', icon: 'fa-cloud-rain' },
		55: { label: 'Intensywna mżawka', icon: 'fa-cloud-rain' },
		61: { label: 'Lekki deszcz', icon: 'fa-cloud-rain' },
		63: { label: 'Deszcz', icon: 'fa-cloud-showers-heavy' },
		65: { label: 'Ulewa', icon: 'fa-cloud-showers-heavy' },
		71: { label: 'Lekki śnieg', icon: 'fa-snowflake' },
		73: { label: 'Śnieg', icon: 'fa-snowflake' },
		75: { label: 'Intensywny śnieg', icon: 'fa-snowflake' },
		80: { label: 'Przelotny deszcz', icon: 'fa-cloud-sun-rain' },
		81: { label: 'Przelotny deszcz', icon: 'fa-cloud-sun-rain' },
		82: { label: 'Silny przelotny deszcz', icon: 'fa-cloud-showers-heavy' },
		95: { label: 'Burza', icon: 'fa-cloud-bolt' },
		96: { label: 'Burza z gradem', icon: 'fa-cloud-bolt' },
		99: { label: 'Silna burza z gradem', icon: 'fa-cloud-bolt' },
	}

	const clockHour = document.getElementById('clock-hour')
	const clockMinute = document.getElementById('clock-minute')
	const clockSecond = document.getElementById('clock-second')
	const clockDigital = document.getElementById('clock-digital')
	const clockDate = document.getElementById('clock-date')
	const weatherSearchForm = document.getElementById('weather-search-form')
	const weatherLocationInput = document.getElementById('weather-location-input')
	const bookmarkDrawer = document.getElementById('bookmark-drawer')
	const bookmarkDrawerToggle = document.getElementById('bookmark-drawer-toggle')
	const bookmarkSettingsToggle = document.getElementById('bookmark-settings-toggle')
	const bookmarkList = document.getElementById('bookmark-list')
	const bookmarkForm = document.getElementById('bookmark-form')
	const bookmarkIdInput = document.getElementById('bookmark-id')
	const bookmarkTitleInput = document.getElementById('bookmark-title')
	const bookmarkUrlInput = document.getElementById('bookmark-url')
	const bookmarkAddButton = document.getElementById('bookmark-add-btn')
	const bookmarkCancelButton = document.getElementById('bookmark-cancel-btn')

	const bookmarkConfig = {
		storageKey: 'dashboard-bookmarks',
	}

	const updateClock = () => {
		if (!clockHour || !clockMinute || !clockSecond || !clockDigital || !clockDate) return

		const now = new Date()
		const hours = now.getHours()
		const minutes = now.getMinutes()
		const seconds = now.getSeconds()

		const hourDegrees = (hours % 12) * 30 + minutes * 0.5
		const minuteDegrees = minutes * 6 + seconds * 0.1
		const secondDegrees = seconds * 6

		clockHour.style.transform = `translateX(-50%) rotate(${hourDegrees}deg)`
		clockMinute.style.transform = `translateX(-50%) rotate(${minuteDegrees}deg)`
		clockSecond.style.transform = `translateX(-50%) rotate(${secondDegrees}deg)`

		clockDigital.textContent = now.toLocaleTimeString('pl-PL', {
			hour: '2-digit',
			minute: '2-digit',
		})
		clockDate.textContent = now.toLocaleDateString('pl-PL', {
			weekday: 'long',
			day: '2-digit',
			month: 'long',
		})
	}

	const setWeatherState = ({ temperature, location, description, wind, icon }) => {
		const weatherTemp = document.getElementById('weather-temp')
		const weatherLocation = document.getElementById('weather-location')
		const weatherDescription = document.getElementById('weather-description')
		const weatherWind = document.getElementById('weather-wind')
		const weatherIcon = document.getElementById('weather-icon')

		if (weatherTemp) weatherTemp.textContent = temperature
		if (weatherLocation) weatherLocation.textContent = location
		if (weatherDescription) weatherDescription.textContent = description
		if (weatherWind) weatherWind.textContent = wind
		if (weatherIcon) {
			weatherIcon.innerHTML = `<i class="fa-solid ${icon}"></i>`
		}
	}

	const fetchWeather = async (latitude, longitude, locationName) => {
		try {
			const response = await fetch(
				`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code,wind_speed_10m&timezone=auto`,
				{ cache: 'no-store' }
			)
			if (!response.ok) {
				throw new Error('Weather request failed')
			}

			const data = await response.json()
			const current = data.current || {}
			const weatherDetails = weatherCodeMap[current.weather_code] || {
				label: 'Warunki lokalne',
				icon: 'fa-cloud-sun',
			}

			setWeatherState({
				temperature: `${Math.round(current.temperature_2m ?? 0)}°C`,
				location: locationName,
				description: weatherDetails.label,
				wind: `Wiatr ${Math.round(current.wind_speed_10m ?? 0)} km/h`,
				icon: weatherDetails.icon,
			})
		} catch (error) {
			setWeatherState({
				temperature: '--°C',
				location: locationName,
				description: 'Brak danych pogodowych',
				wind: 'Sprawdź połączenie',
				icon: 'fa-cloud',
			})
		}
	}

	const fetchWeatherForLocation = async locationName => {
		const trimmedLocation = locationName.trim()
		if (!trimmedLocation) return

		setWeatherState({
			temperature: '--°C',
			location: trimmedLocation,
			description: 'Szukanie lokalizacji...',
			wind: 'Proszę czekać',
			icon: 'fa-cloud-sun',
		})

		try {
			const response = await fetch(
				`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(trimmedLocation)}&count=1&language=pl&format=json`,
				{ cache: 'no-store' }
			)
			if (!response.ok) {
				throw new Error('Geocoding request failed')
			}

			const data = await response.json()
			const result = data.results && data.results[0]
			if (!result) {
				throw new Error('Location not found')
			}

			const resolvedName = [result.name, result.country].filter(Boolean).join(', ')
			localStorage.setItem(weatherConfig.storageKey, trimmedLocation)
			fetchWeather(result.latitude, result.longitude, resolvedName)
		} catch (error) {
			setWeatherState({
				temperature: '--°C',
				location: trimmedLocation,
				description: 'Nie znaleziono lokalizacji',
				wind: 'Spróbuj innej nazwy',
				icon: 'fa-cloud',
			})
		}
	}

	const initWeather = () => {
		if (!document.getElementById('weather-temp')) return

		const savedLocation = localStorage.getItem(weatherConfig.storageKey) || weatherConfig.fallbackName
		if (weatherLocationInput) {
			weatherLocationInput.value = savedLocation
		}

		fetchWeatherForLocation(savedLocation)

		if (weatherSearchForm && weatherLocationInput) {
			weatherSearchForm.addEventListener('submit', event => {
				event.preventDefault()
				fetchWeatherForLocation(weatherLocationInput.value)
			})
		}
	}

	const normalizeUrl = value => {
		const trimmedValue = value.trim()
		if (!trimmedValue) return ''
		if (/^https?:\/\//i.test(trimmedValue)) return trimmedValue
		return `https://${trimmedValue}`
	}

	const createBookmarkId = () => `bookmark-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`

	const getBookmarkHostname = url => {
		try {
			return new URL(url).hostname
		} catch (error) {
			return ''
		}
	}

	const getBookmarkInitials = title =>
		title
			.trim()
			.split(/\s+/)
			.slice(0, 2)
			.map(part => part[0]?.toUpperCase() ?? '')
			.join('') || 'WW'

	const loadBookmarks = () => {
		try {
			const storedBookmarks = JSON.parse(localStorage.getItem(bookmarkConfig.storageKey) || '[]')
			return Array.isArray(storedBookmarks) ? storedBookmarks : []
		} catch (error) {
			return []
		}
	}

	let bookmarks = loadBookmarks()

	const saveBookmarks = () => {
		localStorage.setItem(bookmarkConfig.storageKey, JSON.stringify(bookmarks))
	}

	const closeBookmarkForm = () => {
		if (!bookmarkForm) return
		bookmarkForm.hidden = true
		bookmarkForm.reset()
		if (bookmarkIdInput) {
			bookmarkIdInput.value = ''
		}
	}

	const openBookmarkForm = bookmark => {
		if (!bookmarkForm || !bookmarkTitleInput || !bookmarkUrlInput || !bookmarkIdInput) return

		bookmarkForm.hidden = false
		bookmarkIdInput.value = bookmark?.id || ''
		bookmarkTitleInput.value = bookmark?.title || ''
		bookmarkUrlInput.value = bookmark?.url || ''
		bookmarkTitleInput.focus()
		if (bookmarkDrawer && !bookmarkDrawer.classList.contains('is-open')) {
			bookmarkDrawer.classList.add('is-open')
		}
	}

	const renderBookmarks = () => {
		if (!bookmarkList) return

		bookmarkList.innerHTML = ''

		bookmarks.forEach(bookmark => {
			const hostname = getBookmarkHostname(bookmark.url)
			const item = document.createElement('li')
			item.className = 'bookmark-item'
			item.dataset.id = bookmark.id
			item.dataset.url = bookmark.url
			item.innerHTML = `
				<div class="bookmark-item-badge">
					<img class="bookmark-item-favicon" src="https://www.google.com/s2/favicons?domain=${encodeURIComponent(bookmark.url)}&sz=64" alt="" loading="lazy">
				</div>
				<div class="bookmark-item-main">
					<div class="bookmark-item-link">${bookmark.title}</div>
					<div class="bookmark-item-url">${hostname || bookmark.url}</div>
				</div>
				<div class="bookmark-item-actions">
					<button type="button" class="bookmark-item-action" data-action="edit" aria-label="Edytuj zakładkę">
						<i class="fa-solid fa-pen"></i>
					</button>
					<button type="button" class="bookmark-item-action" data-action="delete" aria-label="Usuń zakładkę">
						<i class="fa-solid fa-trash"></i>
					</button>
				</div>
			`
			bookmarkList.appendChild(item)
		})
	}

	const initBookmarks = () => {
		if (!bookmarkDrawer || !bookmarkDrawerToggle || !bookmarkList) return

		renderBookmarks()

		bookmarkDrawerToggle.addEventListener('click', () => {
			const isOpen = bookmarkDrawer.classList.toggle('is-open')
			bookmarkDrawerToggle.setAttribute('aria-expanded', String(isOpen))
		})

		bookmarkSettingsToggle?.addEventListener('click', () => {
			const isManaging = bookmarkDrawer.classList.toggle('is-managing')
			bookmarkSettingsToggle.setAttribute('aria-pressed', String(isManaging))
		})

		bookmarkAddButton?.addEventListener('click', () => {
			openBookmarkForm()
		})

		bookmarkCancelButton?.addEventListener('click', () => {
			closeBookmarkForm()
		})

		bookmarkForm?.addEventListener('submit', event => {
			event.preventDefault()

			if (!bookmarkTitleInput || !bookmarkUrlInput || !bookmarkIdInput) return

			const title = bookmarkTitleInput.value.trim()
			const url = normalizeUrl(bookmarkUrlInput.value)
			const existingId = bookmarkIdInput.value

			if (!title || !url) return

			if (existingId) {
				bookmarks = bookmarks.map(bookmark =>
					bookmark.id === existingId ? { ...bookmark, title, url } : bookmark
				)
			} else {
				bookmarks.unshift({
					id: createBookmarkId(),
					title,
					url,
				})
			}

			saveBookmarks()
			renderBookmarks()
			closeBookmarkForm()
		})

		bookmarkList.addEventListener('click', event => {
			const actionButton = event.target.closest('[data-action]')
			if (!actionButton) {
				const item = event.target.closest('.bookmark-item')
				if (!item?.dataset.url) return
				window.open(item.dataset.url, '_blank')
				return
			}

			const item = actionButton.closest('.bookmark-item')
			const bookmarkId = item?.dataset.id
			if (!bookmarkId) return

			const bookmark = bookmarks.find(entry => entry.id === bookmarkId)
			if (!bookmark) return

			if (actionButton.dataset.action === 'edit') {
				openBookmarkForm(bookmark)
			}

			if (actionButton.dataset.action === 'delete') {
				bookmarks = bookmarks.filter(entry => entry.id !== bookmarkId)
				saveBookmarks()
				renderBookmarks()
				if (bookmarkIdInput?.value === bookmarkId) {
					closeBookmarkForm()
				}
			}
		})
	}

	updateClock()
	window.setInterval(updateClock, 1000)
	initWeather()
	initBookmarks()

	document.querySelectorAll('.menu-item[target="_blank"]').forEach(link => {
		link.addEventListener('click', event => {
			event.preventDefault()
			window.open(link.href, '_blank')
		})
	})
})
/* === Dashboard Init: End === */
