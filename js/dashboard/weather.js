(function initializeDashboardWeatherModule() {
	const dashboardModules = (window.DashboardModules = window.DashboardModules || {})

	const weatherConfig = {
		storageKey: 'dashboard-weather-location',
		fallbackName: 'Warszawa',
		geoapifyApiKeyMetaName: 'geoapify-api-key',
		requestTimeoutMs: 6500,
		hourlyStartHour: 0,
		hourlyEndHour: 23,
		defaultHourlyFocusStart: 8,
		defaultHourlyFocusEnd: 16,
		hourlyDragMultiplier: 1.45,
		hourlyDragEasing: 0.62,
		hourlyReleaseEasing: 0.3,
		hourlyVelocityBlend: 0.34,
		hourlyReleaseFriction: 0.92,
		hourlyReleaseBoost: 14,
		hourlyMaxReleaseVelocity: 34,
	}

	const weatherCodeMap = {
		0: { label: 'Bezchmurnie', icon: 'fa-sun', tone: 'sun' },
		1: { label: 'Glownie slonecznie', icon: 'fa-cloud-sun', tone: 'partly' },
		2: { label: 'Czesciowe zachmurzenie', icon: 'fa-cloud-sun', tone: 'partly' },
		3: { label: 'Pochmurno', icon: 'fa-cloud', tone: 'cloudy' },
		45: { label: 'Mgla', icon: 'fa-smog', tone: 'fog' },
		48: { label: 'Osadzajaca sie mgla', icon: 'fa-smog', tone: 'fog' },
		51: { label: 'Lekka mzawka', icon: 'fa-cloud-rain', tone: 'rain' },
		53: { label: 'Mzawka', icon: 'fa-cloud-rain', tone: 'rain' },
		55: { label: 'Intensywna mzawka', icon: 'fa-cloud-rain', tone: 'rain' },
		61: { label: 'Lekki deszcz', icon: 'fa-cloud-rain', tone: 'rain' },
		63: { label: 'Deszcz', icon: 'fa-cloud-showers-heavy', tone: 'rain' },
		65: { label: 'Ulewa', icon: 'fa-cloud-showers-heavy', tone: 'rain' },
		71: { label: 'Lekki snieg', icon: 'fa-snowflake', tone: 'snow' },
		73: { label: 'Snieg', icon: 'fa-snowflake', tone: 'snow' },
		75: { label: 'Intensywny snieg', icon: 'fa-snowflake', tone: 'snow' },
		80: { label: 'Przelotny deszcz', icon: 'fa-cloud-sun-rain', tone: 'showers' },
		81: { label: 'Przelotny deszcz', icon: 'fa-cloud-sun-rain', tone: 'showers' },
		82: { label: 'Silny przelotny deszcz', icon: 'fa-cloud-showers-heavy', tone: 'rain' },
		95: { label: 'Burza', icon: 'fa-cloud-bolt', tone: 'storm' },
		96: { label: 'Burza z gradem', icon: 'fa-cloud-bolt', tone: 'storm' },
		99: { label: 'Silna burza z gradem', icon: 'fa-cloud-bolt', tone: 'storm' },
	}

	const getWeatherDetails = (weatherCode, fallbackLabel = 'Warunki lokalne', fallbackTone = 'cloudy') =>
		weatherCodeMap[weatherCode] || {
			label: fallbackLabel,
			icon: 'fa-cloud-sun',
			tone: fallbackTone,
		}

	const normalizeSearchValue = value =>
		String(value || '')
			.normalize('NFD')
			.replace(/[\u0300-\u036f]/g, '')
			.toLocaleLowerCase('pl-PL')
			.trim()

	const normalizeLocationPart = value =>
		String(value || '')
			.replace(/^(gmina|gm\.|powiat|wojewodztwo)\s+/i, '')
			.replace(/\s+/g, ' ')
			.trim()

	const getUniqueLocationParts = parts => {
		const seen = new Set()

		return parts
			.map(normalizeLocationPart)
			.filter(part => {
				if (!part) return false

				const key = normalizeSearchValue(part)
				if (seen.has(key)) return false

				seen.add(key)
				return true
			})
	}

	const buildCurrentLocationDetails = address => {
		const primaryLabel =
			getUniqueLocationParts([
				address.hamlet,
				address.village,
				address.locality,
				address.neighbourhood,
				address.residential,
				address.suburb,
				address.quarter,
				address.town,
				address.city_district,
				address.city,
				address.municipality,
				address.county,
			])[0] ||
			getUniqueLocationParts([address.state, address.country])[0] ||
			'Aktualna lokalizacja'

		const contextLabel =
			getUniqueLocationParts([
				address.town,
				address.city_district,
				address.city,
				address.municipality,
				address.county,
				address.state,
				address.country,
			]).find(part => part !== primaryLabel) || ''

		return {
			displayLabel: getUniqueLocationParts([primaryLabel, contextLabel]).join(', ') || 'Aktualna lokalizacja',
			searchLabel: primaryLabel,
		}
	}

	const scoreGeocodingResult = (result, query) => {
		const normalizedQuery = normalizeSearchValue(query)
		const normalizedName = normalizeSearchValue(result?.name)
		const normalizedAdmin1 = normalizeSearchValue(result?.admin1)
		const normalizedAdmin2 = normalizeSearchValue(result?.admin2)
		const featureBonus = {
			PPLC: 8,
			PPLA: 7,
			PPLA2: 6,
			PPLA3: 5,
			PPLA4: 4,
			PPL: 4,
			PPLL: 3,
			PPLX: 2,
		}

		let score = 0

		if (normalizedName === normalizedQuery) score += 100
		else if (normalizedName.startsWith(normalizedQuery)) score += 60
		else if (normalizedName.includes(normalizedQuery)) score += 40

		if (normalizedAdmin2 === normalizedQuery) score += 20
		if (normalizedAdmin1 === normalizedQuery) score += 10
		if (result?.country_code === 'PL') score += 25

		score += featureBonus[result?.feature_code] || 0
		score += Math.min(Number(result?.population) || 0, 1000000) / 100000

		return score
	}

	const pickBestGeocodingResult = (results, query) =>
		[...(results || [])].sort((left, right) => scoreGeocodingResult(right, query) - scoreGeocodingResult(left, query))[0]

	const getGeoapifyApiKey = () => {
		const apiKey =
			document
				.querySelector(`meta[name="${weatherConfig.geoapifyApiKeyMetaName}"]`)
				?.getAttribute('content')
				?.trim() || ''

		if (!apiKey) return ''
		if (/your[_-\s]?geoapify[_-\s]?api[_-\s]?key/i.test(apiKey)) return ''
		if (/paste[_-\s]?geoapify[_-\s]?api[_-\s]?key/i.test(apiKey)) return ''

		return apiKey
	}

	const fetchJsonWithTimeout = async (url, options = {}, timeoutMs = weatherConfig.requestTimeoutMs) => {
		const AbortControllerClass = window.AbortController
		if (!AbortControllerClass) {
			const response = await fetch(url, options)
			if (!response.ok) {
				throw new Error(`Request failed with status ${response.status}`)
			}

			return response.json()
		}

		const controller = new AbortControllerClass()
		const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs)

		try {
			const response = await fetch(url, {
				...options,
				signal: controller.signal,
			})
			if (!response.ok) {
				throw new Error(`Request failed with status ${response.status}`)
			}

			return response.json()
		} finally {
			window.clearTimeout(timeoutId)
		}
	}

	const buildGeoapifyLocationDetails = properties => {
		const primaryLabel =
			getUniqueLocationParts([
				properties.city,
				properties.town,
				properties.village,
				properties.hamlet,
				properties.suburb,
				properties.district,
				properties.county,
			])[0] ||
			getUniqueLocationParts([properties.state, properties.country])[0] ||
			'Aktualna lokalizacja'

		const contextLabel =
			getUniqueLocationParts([properties.county, properties.state, properties.country]).find(part => part !== primaryLabel) || ''

		return {
			displayLabel: getUniqueLocationParts([primaryLabel, contextLabel]).join(', ') || 'Aktualna lokalizacja',
			searchLabel: primaryLabel,
		}
	}

	dashboardModules.createWeatherController = ({ elements, services } = {}) => {
		const {
			weatherTemp,
			weatherLocation,
			weatherDescription,
			weatherWind,
			weatherIcon,
			weatherWorkdayPanel,
			weatherWorkdayLabel,
			weatherWorkdayRange,
			weatherWorkdayTrack,
			weatherSearchForecast,
			weatherSearchForm,
			weatherLocationInput,
			weatherCurrentLocationBtn,
			weatherWidget,
		} =
			elements || {}
		const { storageService, preferencesService } = services || {}
		let latestForecastData = null
		let selectedForecastDate = ''
		let selectedForecastLabel = ''
		let activeInputPointerId = null
		let didDragSelectionOutsideWidget = false
		let ignoreNextOutsideClick = false
		const hourlyDisplayHours = Array.from(
			{ length: weatherConfig.hourlyEndHour - weatherConfig.hourlyStartHour + 1 },
			(_, index) => weatherConfig.hourlyStartHour + index
		)

		const formatHourLabel = hour => `${String(hour).padStart(2, '0')}:00`
		const forecastDayLabels = ['Dzis', 'Jutro', 'Pojutrze']
		const isPointInsideElement = (element, clientX, clientY) => {
			if (!element) return false

			const bounds = element.getBoundingClientRect()
			return clientX >= bounds.left && clientX <= bounds.right && clientY >= bounds.top && clientY <= bounds.bottom
		}

		const formatForecastDateLabel = (dateValue, index) => {
			if (forecastDayLabels[index]) return forecastDayLabels[index]

			const parsedDate = new Date(`${dateValue}T12:00:00`)
			if (Number.isNaN(parsedDate.getTime())) return 'Dzien'

			return parsedDate.toLocaleDateString('pl-PL', { weekday: 'short' })
		}

		const setWorkdayPanelVisibility = isVisible => {
			if (!weatherWorkdayPanel) return

			weatherWorkdayPanel.hidden = !isVisible
		}

		const renderThreeDayForecast = (days, activeDate = '') => {
			if (!weatherSearchForecast) return

			weatherSearchForecast.innerHTML = days
				.map(day => {
					const details = day.isUnavailable
						? { label: 'Brak danych', icon: 'fa-minus', tone: 'cloudy' }
						: getWeatherDetails(day.weatherCode)
					const classes = ['weather-forecast-card']
					if (day.isUnavailable) classes.push('is-unavailable')
					if (day.date && day.date === activeDate) classes.push('is-selected')
					const tempLabel = day.maxTempLabel && day.minTempLabel ? `${day.maxTempLabel} / ${day.minTempLabel}` : '--'
					const titleParts = [day.label, details.label, tempLabel]
					if (day.precipitationLabel) titleParts.push(day.precipitationLabel)

					return `
						<button type="button" class="${classes.join(' ')}" data-weather-day="${day.date || ''}" data-weather-day-label="${day.label}" ${day.isUnavailable ? 'disabled' : ''} title="${titleParts.join(' | ')}">
							<span class="weather-forecast-day">${day.label}</span>
							<span class="weather-forecast-icon weather-tone-${details.tone}"><i class="fa-solid ${details.icon}"></i></span>
							<span class="weather-forecast-temps">
								<strong>${day.maxTempLabel || '--'}</strong>
								<small>${day.minTempLabel || '--'}</small>
							</span>
						</button>
					`
				})
				.join('')
		}

		const setThreeDayFallbackState = () => {
			renderThreeDayForecast(
				forecastDayLabels.map(label => ({
					date: '',
					label,
					weatherCode: null,
					maxTempLabel: '--',
					minTempLabel: '--',
					precipitationLabel: '',
					isUnavailable: true,
				})),
				''
			)
		}

		const getActiveWorkdayHour = currentTime => {
			const hour = Number(String(currentTime || '').slice(11, 13))
			if (!Number.isFinite(hour)) return null
			if (hour < weatherConfig.hourlyStartHour || hour > weatherConfig.hourlyEndHour) return null

			return hourlyDisplayHours.reduce((closestHour, nextHour) => {
				if (closestHour === null) return nextHour

				return Math.abs(nextHour - hour) < Math.abs(closestHour - hour) ? nextHour : closestHour
			}, null)
		}

		const renderWorkdayTimeline = slots => {
			if (!weatherWorkdayTrack) return

			weatherWorkdayTrack.innerHTML = slots
				.map(slot => {
					const details = slot.isUnavailable
						? { label: 'Brak danych', icon: 'fa-minus', tone: 'cloudy' }
						: getWeatherDetails(slot.weatherCode)
					const classes = ['weather-workday-slot']
					if (slot.isCurrent) classes.push('is-current')
					if (slot.isUnavailable) classes.push('is-unavailable')
					const titleParts = [formatHourLabel(slot.hour), details.label, slot.temperatureLabel]
					if (slot.precipitationLabel) titleParts.push(slot.precipitationLabel)

					return `
						<div class="${classes.join(' ')}" data-weather-hour="${slot.hour}" title="${titleParts.join(' | ')}">
							<span class="weather-workday-time">${formatHourLabel(slot.hour).slice(0, 5)}</span>
							<span class="weather-workday-icon weather-tone-${details.tone}"><i class="fa-solid ${details.icon}"></i></span>
							<span class="weather-workday-temp">${slot.temperatureLabel}</span>
						</div>
					`
				})
				.join('')
		}

		const scrollWorkdayTrackToDefaultFocus = () => {
			if (!weatherWorkdayTrack) return

			const startSlot = weatherWorkdayTrack.querySelector(`[data-weather-hour="${weatherConfig.defaultHourlyFocusStart}"]`)
			const endSlot = weatherWorkdayTrack.querySelector(`[data-weather-hour="${weatherConfig.defaultHourlyFocusEnd}"]`)
			if (!startSlot || !endSlot) {
				weatherWorkdayTrack.weatherTrackSyncScroll?.(0) || (weatherWorkdayTrack.scrollLeft = 0)
				return
			}

			window.requestAnimationFrame(() => {
				const focusStart = startSlot.offsetLeft
				const focusEnd = endSlot.offsetLeft + endSlot.offsetWidth
				const focusCenter = (focusStart + focusEnd) / 2
				const maxScrollLeft = Math.max(weatherWorkdayTrack.scrollWidth - weatherWorkdayTrack.clientWidth, 0)
				const nextScrollLeft = Math.min(Math.max(focusCenter - weatherWorkdayTrack.clientWidth / 2, 0), maxScrollLeft)

				weatherWorkdayTrack.weatherTrackSyncScroll?.(nextScrollLeft) || (weatherWorkdayTrack.scrollLeft = nextScrollLeft)
			})
		}

		const enableWorkdayTrackDrag = () => {
			if (!weatherWorkdayTrack || weatherWorkdayTrack.dataset.dragReady === 'true') return

			let isDragging = false
			let startPointerX = 0
			let startScrollLeft = 0
			let targetScrollLeft = weatherWorkdayTrack.scrollLeft
			let animatedScrollLeft = weatherWorkdayTrack.scrollLeft
			let animationFrameId = 0
			let releaseVelocity = 0
			let lastPointerX = 0
			let lastPointerTime = 0

			const getMaxScrollLeft = () => Math.max(weatherWorkdayTrack.scrollWidth - weatherWorkdayTrack.clientWidth, 0)
			const clampScrollLeft = value =>
				Math.min(Math.max(value, 0), getMaxScrollLeft())

			const cancelTrackAnimation = () => {
				if (animationFrameId) {
					window.cancelAnimationFrame(animationFrameId)
					animationFrameId = 0
				}
			}

			const syncTrackScroll = nextScrollLeft => {
				cancelTrackAnimation()
				const clampedScrollLeft = clampScrollLeft(nextScrollLeft)

				targetScrollLeft = clampedScrollLeft
				animatedScrollLeft = clampedScrollLeft
				releaseVelocity = 0
				weatherWorkdayTrack.scrollLeft = clampedScrollLeft
			}

			const animateTrackScroll = () => {
				animationFrameId = 0
				const easing = isDragging ? weatherConfig.hourlyDragEasing : weatherConfig.hourlyReleaseEasing

				if (!isDragging && Math.abs(releaseVelocity) > 0.01) {
					targetScrollLeft = clampScrollLeft(targetScrollLeft + releaseVelocity)

					if (targetScrollLeft <= 0 || targetScrollLeft >= getMaxScrollLeft()) {
						releaseVelocity *= 0.65
					}

					releaseVelocity *= weatherConfig.hourlyReleaseFriction
				}

				animatedScrollLeft += (targetScrollLeft - animatedScrollLeft) * easing

				if (Math.abs(targetScrollLeft - animatedScrollLeft) < 0.35) {
					animatedScrollLeft = targetScrollLeft
				}

				weatherWorkdayTrack.scrollLeft = animatedScrollLeft

				if (Math.abs(releaseVelocity) < 0.05) {
					releaseVelocity = 0
				}

				if (isDragging || Math.abs(targetScrollLeft - animatedScrollLeft) >= 0.35 || releaseVelocity !== 0) {
					animationFrameId = window.requestAnimationFrame(animateTrackScroll)
				}
			}

			const requestTrackAnimation = () => {
				if (animationFrameId) return

				animationFrameId = window.requestAnimationFrame(animateTrackScroll)
			}

			const stopDragging = () => {
				if (!isDragging) return

				isDragging = false
				weatherWorkdayTrack.classList.remove('is-dragging')
				requestTrackAnimation()
			}

			weatherWorkdayTrack.dataset.dragReady = 'true'
			weatherWorkdayTrack.weatherTrackSyncScroll = syncTrackScroll

			weatherWorkdayTrack.addEventListener('pointerdown', event => {
				if (event.pointerType === 'mouse' && event.button !== 0) return
				if (weatherWorkdayTrack.scrollWidth <= weatherWorkdayTrack.clientWidth) return

				cancelTrackAnimation()
				isDragging = true
				startPointerX = event.clientX
				startScrollLeft = weatherWorkdayTrack.scrollLeft
				targetScrollLeft = startScrollLeft
				animatedScrollLeft = startScrollLeft
				releaseVelocity = 0
				lastPointerX = event.clientX
				lastPointerTime = performance.now()
				weatherWorkdayTrack.classList.add('is-dragging')
				weatherWorkdayTrack.setPointerCapture?.(event.pointerId)
				event.preventDefault()
			})

			weatherWorkdayTrack.addEventListener('pointermove', event => {
				if (!isDragging) return

				const deltaX = event.clientX - startPointerX
				targetScrollLeft = clampScrollLeft(startScrollLeft - deltaX * weatherConfig.hourlyDragMultiplier)
				const now = performance.now()
				const elapsedMs = Math.max(now - lastPointerTime, 1)
				const pointerDelta = lastPointerX - event.clientX
				const nextVelocity = (pointerDelta * weatherConfig.hourlyDragMultiplier * weatherConfig.hourlyReleaseBoost) / elapsedMs

				releaseVelocity =
					releaseVelocity * (1 - weatherConfig.hourlyVelocityBlend) + nextVelocity * weatherConfig.hourlyVelocityBlend
				releaseVelocity = Math.min(
					Math.max(releaseVelocity, -weatherConfig.hourlyMaxReleaseVelocity),
					weatherConfig.hourlyMaxReleaseVelocity
				)
				lastPointerX = event.clientX
				lastPointerTime = now
				requestTrackAnimation()
				event.preventDefault()
			})

			weatherWorkdayTrack.addEventListener('pointerup', stopDragging)
			weatherWorkdayTrack.addEventListener('pointercancel', stopDragging)
			weatherWorkdayTrack.addEventListener('lostpointercapture', stopDragging)
			weatherWorkdayTrack.addEventListener('pointerleave', event => {
				if (!isDragging || event.pointerType !== 'mouse') return
				stopDragging()
			})
		}

		const setWorkdayFallbackState = (
			rangeLabel = `${formatHourLabel(weatherConfig.hourlyStartHour)}-${formatHourLabel(weatherConfig.hourlyEndHour)}`,
			label = 'Godzinowo'
		) => {
			if (weatherWorkdayLabel) weatherWorkdayLabel.textContent = label
			if (weatherWorkdayRange) weatherWorkdayRange.textContent = rangeLabel

			renderWorkdayTimeline(
				hourlyDisplayHours.map(hour => ({
					hour,
					weatherCode: null,
					temperatureLabel: '--',
					precipitationLabel: '',
					isCurrent: false,
					isUnavailable: true,
				}))
			)
			scrollWorkdayTrackToDefaultFocus()
		}

		const renderWorkdayForecast = (data, selectedDate, label) => {
			if (!weatherWorkdayTrack) return

			const currentTime = String(data?.current?.time || '')
			const currentDate = currentTime.split('T')[0]
			const targetDate = selectedDate || currentDate
			const activeHour = targetDate === currentDate ? getActiveWorkdayHour(currentTime) : null
			const times = Array.isArray(data?.hourly?.time) ? data.hourly.time : []
			const temperatures = Array.isArray(data?.hourly?.temperature_2m) ? data.hourly.temperature_2m : []
			const weatherCodes = Array.isArray(data?.hourly?.weather_code) ? data.hourly.weather_code : []
			const precipitationProbabilities = Array.isArray(data?.hourly?.precipitation_probability) ? data.hourly.precipitation_probability : []
			const workdayRangeLabel = `${formatHourLabel(weatherConfig.hourlyStartHour)}-${formatHourLabel(weatherConfig.hourlyEndHour)}`

			if (!targetDate || times.length === 0) {
				setWorkdayFallbackState(workdayRangeLabel, label || 'Godzinowo')
				return
			}

			const hourlyMap = new Map()
			times.forEach((time, index) => {
				if (!String(time).startsWith(`${targetDate}T`)) return

				const hour = Number(String(time).slice(11, 13))
				if (!Number.isFinite(hour)) return

				hourlyMap.set(hour, {
					temperature: temperatures[index],
					weatherCode: weatherCodes[index],
					precipitationProbability: precipitationProbabilities[index],
				})
			})

			if (weatherWorkdayLabel) weatherWorkdayLabel.textContent = label || 'Godzinowo'
			if (weatherWorkdayRange) weatherWorkdayRange.textContent = workdayRangeLabel

			renderWorkdayTimeline(
				hourlyDisplayHours.map(hour => {
					const slot = hourlyMap.get(hour)
					return {
						hour,
						weatherCode: slot?.weatherCode,
						temperatureLabel: Number.isFinite(slot?.temperature) ? `${Math.round(slot.temperature)} C` : '--',
						precipitationLabel: Number.isFinite(slot?.precipitationProbability)
							? `Opad ${Math.round(slot.precipitationProbability)}%`
							: '',
						isCurrent: activeHour === hour,
						isUnavailable: !slot,
					}
				})
			)
			scrollWorkdayTrackToDefaultFocus()
		}

		const renderDailyForecast = (data, activeDate = '') => {
			if (!weatherSearchForecast) return

			const times = Array.isArray(data?.daily?.time) ? data.daily.time.slice(0, 3) : []
			const weatherCodes = Array.isArray(data?.daily?.weather_code) ? data.daily.weather_code : []
			const maxTemps = Array.isArray(data?.daily?.temperature_2m_max) ? data.daily.temperature_2m_max : []
			const minTemps = Array.isArray(data?.daily?.temperature_2m_min) ? data.daily.temperature_2m_min : []
			const precipitationMax = Array.isArray(data?.daily?.precipitation_probability_max) ? data.daily.precipitation_probability_max : []

			if (times.length === 0) {
				setThreeDayFallbackState()
				return
			}

			renderThreeDayForecast(
				times.map((time, index) => ({
					date: time,
					label: formatForecastDateLabel(time, index),
					weatherCode: weatherCodes[index],
					maxTempLabel: Number.isFinite(maxTemps[index]) ? `${Math.round(maxTemps[index])} C` : '--',
					minTempLabel: Number.isFinite(minTemps[index]) ? `${Math.round(minTemps[index])} C` : '--',
					precipitationLabel: Number.isFinite(precipitationMax[index]) ? `Opad ${Math.round(precipitationMax[index])}%` : '',
					isUnavailable: false,
				})),
				activeDate
			)
		}

		const resetSelectedForecast = () => {
			selectedForecastDate = ''
			selectedForecastLabel = ''
			setWorkdayFallbackState()
			setWorkdayPanelVisibility(false)
		}

		const showSelectedForecastDay = (date, label) => {
			if (!latestForecastData || !date) return

			selectedForecastDate = date
			selectedForecastLabel = label || 'Godzinowo'
			renderDailyForecast(latestForecastData, selectedForecastDate)
			renderWorkdayForecast(latestForecastData, selectedForecastDate, selectedForecastLabel)
			setWorkdayPanelVisibility(true)
		}

		const toggleSelectedForecastDay = (date, label) => {
			if (!latestForecastData || !date) return

			if (selectedForecastDate === date && !weatherWorkdayPanel?.hidden) {
				resetSelectedForecast()
				renderDailyForecast(latestForecastData)
				return
			}

			showSelectedForecastDay(date, label)
		}

		const setWeatherState = ({ temperature, location, description, wind, icon, tone = 'cloudy' }) => {
			if (weatherTemp) weatherTemp.textContent = temperature
			if (weatherLocation) {
				const compactLocation = window.innerWidth <= 640 ? location.split(',')[0].trim() : location
				weatherLocation.textContent = compactLocation
			}
			if (weatherDescription) weatherDescription.textContent = description
			if (weatherWind) weatherWind.textContent = wind
			if (weatherIcon) {
				weatherIcon.className = `weather-icon weather-tone-${tone}`
				weatherIcon.innerHTML = `<i class="fa-solid ${icon}"></i>`
			}
		}

		const setOfflineWeatherState = (locationName, reason = 'Brak danych pogodowych') => {
			setWeatherState({
				temperature: '-- C',
				location: locationName || weatherConfig.fallbackName,
				description: reason,
				wind: 'Tryb demo offline',
				icon: 'fa-cloud',
			})
			latestForecastData = null
			setThreeDayFallbackState()
			resetSelectedForecast()
		}

		const fetchWeather = async (latitude, longitude, locationName) => {
			try {
				const data = await fetchJsonWithTimeout(
					`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code,wind_speed_10m&hourly=temperature_2m,weather_code,precipitation_probability&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto`,
					{ cache: 'no-store' }
				)
				const current = data.current || {}
				const weatherDetails = getWeatherDetails(current.weather_code)
				latestForecastData = data
				resetSelectedForecast()

				setWeatherState({
					temperature: `${Math.round(current.temperature_2m ?? 0)} C`,
					location: locationName,
					description: weatherDetails.label,
					wind: `Wiatr ${Math.round(current.wind_speed_10m ?? 0)} km/h`,
					icon: weatherDetails.icon,
					tone: weatherDetails.tone,
				})
				renderDailyForecast(data)
			} catch (error) {
				setOfflineWeatherState(locationName, 'Brak danych pogodowych')
			}
		}

		const fetchWeatherForLocation = async locationName => {
			const trimmedLocation = locationName.trim()
			if (!trimmedLocation) return

			setWeatherState({
				temperature: '-- C',
				location: trimmedLocation,
				description: 'Szukanie lokalizacji...',
				wind: 'Prosze czekac',
				icon: 'fa-cloud-sun',
			})
			latestForecastData = null
			setThreeDayFallbackState()
			resetSelectedForecast()

			try {
				const data = await fetchJsonWithTimeout(
					`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(trimmedLocation)}&count=10&language=pl&format=json`,
					{ cache: 'no-store' }
				)
				const result = pickBestGeocodingResult(data.results, trimmedLocation)
				if (!result) {
					throw new Error('Location not found')
				}

				const resolvedName = [result.name, result.country].filter(Boolean).join(', ')
				preferencesService?.setWeatherLocation?.(trimmedLocation) || storageService?.setText?.(weatherConfig.storageKey, trimmedLocation)
				fetchWeather(result.latitude, result.longitude, resolvedName)
			} catch (error) {
				const fallbackReason =
					String(error?.name || '').toLowerCase() === 'aborterror' ? 'Brak odpowiedzi z API pogody' : 'Nie znaleziono lokalizacji'
				setOfflineWeatherState(trimmedLocation, fallbackReason)
			}
		}

		const requestCurrentPosition = options =>
			new Promise((resolve, reject) => {
				navigator.geolocation.getCurrentPosition(resolve, reject, options)
			})

		const requestBestCurrentPosition = ({ timeout = 16000, desiredAccuracy = 2500 } = {}) =>
			new Promise((resolve, reject) => {
				let bestPosition = null
				let isSettled = false
				let watchId = null
				let timeoutId = null

				const finish = (callback, value) => {
					if (isSettled) return

					isSettled = true
					if (watchId !== null) {
						navigator.geolocation.clearWatch(watchId)
					}
					if (timeoutId !== null) {
						window.clearTimeout(timeoutId)
					}

					callback(value)
				}

				const rememberBestPosition = position => {
					if (!bestPosition) {
						bestPosition = position
						return
					}

					if ((position.coords.accuracy ?? Number.POSITIVE_INFINITY) < (bestPosition.coords.accuracy ?? Number.POSITIVE_INFINITY)) {
						bestPosition = position
					}
				}

				watchId = navigator.geolocation.watchPosition(
					position => {
						rememberBestPosition(position)

						if ((position.coords.accuracy ?? Number.POSITIVE_INFINITY) <= desiredAccuracy) {
							finish(resolve, bestPosition)
						}
					},
					error => {
						if (bestPosition) {
							finish(resolve, bestPosition)
							return
						}

						finish(reject, error)
					},
					{
						enableHighAccuracy: true,
						timeout,
						maximumAge: 0,
					}
				)

				timeoutId = window.setTimeout(() => {
					if (bestPosition) {
						finish(resolve, bestPosition)
						return
					}

					requestCurrentPosition({
						enableHighAccuracy: false,
						timeout: 10000,
						maximumAge: 300000,
					})
						.then(position => finish(resolve, position))
						.catch(error => finish(reject, error))
				}, timeout)
			})

		const resolveCurrentLocationName = async (latitude, longitude) => {
			const geoapifyApiKey = getGeoapifyApiKey()

			if (geoapifyApiKey) {
				try {
					const data = await fetchJsonWithTimeout(
						`https://api.geoapify.com/v1/geocode/reverse?lat=${latitude}&lon=${longitude}&type=city&lang=pl&limit=1&apiKey=${encodeURIComponent(geoapifyApiKey)}`,
						{ cache: 'no-store' }
					)
					const properties = data?.features?.[0]?.properties
					if (properties) {
						return buildGeoapifyLocationDetails(properties)
					}
				} catch (error) {
					// Fallback zostaje na Nominatim.
				}
			}

			try {
				const data = await fetchJsonWithTimeout(
					`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&accept-language=pl&addressdetails=1&zoom=18`,
					{ cache: 'no-store' }
				)
				const address = data.address || {}
				return buildCurrentLocationDetails(address)
			} catch (error) {
				return {
					displayLabel: 'Aktualna lokalizacja',
					searchLabel: 'Aktualna lokalizacja',
				}
			}
		}

		const fetchWeatherForCurrentLocation = async () => {
			if (!navigator.geolocation) {
				setWeatherState({
					temperature: '-- C',
					location: 'Aktualna lokalizacja',
					description: 'Geolokalizacja niedostepna',
					wind: 'Twoja przegladarka jej nie wspiera',
					icon: 'fa-location-crosshairs',
				})
				setThreeDayFallbackState()
				resetSelectedForecast()
				return
			}

			if (!window.isSecureContext) {
				setWeatherState({
					temperature: '-- C',
					location: 'Aktualna lokalizacja',
					description: 'Safari wymaga bezpiecznego adresu',
					wind: 'Uruchom przez HTTPS albo localhost',
					icon: 'fa-location-crosshairs',
				})
				setThreeDayFallbackState()
				resetSelectedForecast()
				return
			}

			setWeatherState({
				temperature: '-- C',
				location: 'Aktualna lokalizacja',
				description: 'Pobieram pozycje...',
				wind: 'Prosze czekac',
				icon: 'fa-location-crosshairs',
			})
			latestForecastData = null
			setThreeDayFallbackState()
			resetSelectedForecast()

			try {
				const position = await requestBestCurrentPosition()
				const latitude = position.coords.latitude
				const longitude = position.coords.longitude
				const locationDetails = await resolveCurrentLocationName(latitude, longitude)

				fetchWeather(latitude, longitude, locationDetails.displayLabel)
				if (weatherLocationInput) {
					weatherLocationInput.value = locationDetails.searchLabel
				}
				preferencesService?.setWeatherLocation?.(locationDetails.searchLabel) || storageService?.setText?.(weatherConfig.storageKey, locationDetails.searchLabel)
			} catch (error) {
				const geolocationErrors = {
					1: {
						description: 'Dostep do lokalizacji zablokowany',
						wind: 'Sprawdz ustawienia Safari i macOS',
					},
					2: {
						description: 'Safari nie moglo ustalic pozycji',
						wind: 'Wlacz Wi-Fi i sprobuj ponownie',
					},
					3: {
						description: 'Przekroczono czas pobierania',
						wind: 'Polaczenie lub uslugi lokalizacji odpowiadaja zbyt dlugo',
					},
				}
				const fallbackMessage = {
					description: 'Nie udalo sie pobrac lokalizacji',
					wind: 'Sprawdz uprawnienia przegladarki',
				}
				const message = geolocationErrors[error?.code] || fallbackMessage

				setWeatherState({
					temperature: '-- C',
					location: 'Aktualna lokalizacja',
					description: message.description,
					wind: message.wind,
					icon: 'fa-location-crosshairs',
				})
				setThreeDayFallbackState()
				resetSelectedForecast()
			}
		}

		const closeWeatherEditor = () => {
			document.body.classList.remove('weather-editor-open')
			weatherWidget?.setAttribute('aria-expanded', 'false')
		}

		const toggleWeatherEditor = () => {
			if (document.body.classList.contains('weather-editor-open')) {
				closeWeatherEditor()
				return
			}

			openWeatherEditor()
		}

		const openWeatherEditor = () => {
			if (!weatherLocationInput) return

			document.body.classList.add('weather-editor-open')
			weatherWidget?.setAttribute('aria-expanded', 'true')
			weatherLocationInput.value =
				preferencesService?.getWeatherLocation?.(weatherConfig.fallbackName) ||
				storageService?.getText?.(weatherConfig.storageKey, weatherConfig.fallbackName) ||
				weatherConfig.fallbackName
			window.setTimeout(() => {
				weatherLocationInput.focus()
				weatherLocationInput.select()
			}, 20)
			if (!weatherWorkdayPanel?.hidden) {
				scrollWorkdayTrackToDefaultFocus()
			}
		}

		const init = () => {
			if (!weatherTemp) return

			const savedLocation =
				preferencesService?.getWeatherLocation?.(weatherConfig.fallbackName) ||
				storageService?.getText?.(weatherConfig.storageKey, weatherConfig.fallbackName) ||
				weatherConfig.fallbackName

			if (weatherLocationInput) {
				weatherLocationInput.value = savedLocation
			}

			setThreeDayFallbackState()
			resetSelectedForecast()
			enableWorkdayTrackDrag()

			fetchWeatherForLocation(savedLocation)

			if (weatherSearchForm && weatherLocationInput) {
				weatherSearchForm.addEventListener('pointerdown', event => {
					event.stopPropagation()
				})
				weatherSearchForm.addEventListener('click', event => {
					event.stopPropagation()
				})

				weatherSearchForm.addEventListener('submit', event => {
					event.preventDefault()
					fetchWeatherForLocation(weatherLocationInput.value)
					closeWeatherEditor()
				})

				weatherLocationInput.addEventListener('pointerdown', event => {
					if (event.pointerType === 'mouse' && event.button !== 0) return

					activeInputPointerId = event.pointerId
					didDragSelectionOutsideWidget = false
				})
			}

			weatherCurrentLocationBtn?.addEventListener('click', () => {
				fetchWeatherForCurrentLocation()
				closeWeatherEditor()
			})

			weatherSearchForecast?.addEventListener('click', event => {
				const forecastButton = event.target.closest('[data-weather-day]')
				if (!forecastButton) return

				toggleSelectedForecastDay(forecastButton.dataset.weatherDay || '', forecastButton.dataset.weatherDayLabel || 'Godzinowo')
			})

			if (weatherWidget && weatherLocationInput) {
				weatherWidget.setAttribute('aria-expanded', 'false')

				weatherWidget.addEventListener('click', event => {
					if (event.target.closest('.weather-search')) return
					toggleWeatherEditor()
				})

				weatherWidget.addEventListener('keydown', event => {
					if (event.key !== 'Enter' && event.key !== ' ') return
					if (event.target.closest('.weather-search')) return

					event.preventDefault()
					toggleWeatherEditor()
				})

				document.addEventListener('click', event => {
					if (!document.body.classList.contains('weather-editor-open')) return
					if (weatherWidget.contains(event.target)) return
					if (ignoreNextOutsideClick) {
						ignoreNextOutsideClick = false
						return
					}
					closeWeatherEditor()
				})

				document.addEventListener('pointermove', event => {
					if (activeInputPointerId === null || event.pointerId !== activeInputPointerId) return
					if (isPointInsideElement(weatherWidget, event.clientX, event.clientY)) return

					didDragSelectionOutsideWidget = true
				})

				const finishInputPointerInteraction = event => {
					if (activeInputPointerId === null || event.pointerId !== activeInputPointerId) return

					if (didDragSelectionOutsideWidget) {
						ignoreNextOutsideClick = true
						window.setTimeout(() => {
							ignoreNextOutsideClick = false
						}, 250)
					}

					activeInputPointerId = null
					didDragSelectionOutsideWidget = false
				}

				document.addEventListener('pointerup', finishInputPointerInteraction)
				document.addEventListener('pointercancel', finishInputPointerInteraction)

				weatherLocationInput.addEventListener('keydown', event => {
					if (event.key !== 'Escape') return
					closeWeatherEditor()
				})
			}
		}

		return {
			init,
			refresh: fetchWeatherForLocation,
		}
	}
})()
