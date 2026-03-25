(function initializeDashboardWeatherModule() {
	const dashboardModules = (window.DashboardModules = window.DashboardModules || {})

	const weatherConfig = {
		storageKey: 'dashboard-weather-location',
		fallbackName: 'Warszawa',
		geoapifyApiKeyMetaName: 'geoapify-api-key',
		requestTimeoutMs: 6500,
		workdayStartHour: 8,
		workdayEndHour: 17,
		workdayDisplayHours: [8, 10, 12, 14, 16, 17],
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

		const formatHourLabel = hour => `${String(hour).padStart(2, '0')}:00`
		const forecastDayLabels = ['Dzis', 'Jutro', 'Pojutrze']

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
			if (hour < weatherConfig.workdayStartHour || hour > weatherConfig.workdayEndHour) return null

			return weatherConfig.workdayDisplayHours.reduce((closestHour, nextHour) => {
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
						<div class="${classes.join(' ')}" title="${titleParts.join(' | ')}">
							<span class="weather-workday-time">${formatHourLabel(slot.hour).slice(0, 5)}</span>
							<span class="weather-workday-icon weather-tone-${details.tone}"><i class="fa-solid ${details.icon}"></i></span>
							<span class="weather-workday-temp">${slot.temperatureLabel}</span>
						</div>
					`
				})
				.join('')
		}

		const enableWorkdayTrackDrag = () => {
			if (!weatherWorkdayTrack || weatherWorkdayTrack.dataset.dragReady === 'true') return

			let isDragging = false
			let startPointerX = 0
			let startScrollLeft = 0

			const stopDragging = () => {
				if (!isDragging) return

				isDragging = false
				weatherWorkdayTrack.classList.remove('is-dragging')
			}

			weatherWorkdayTrack.dataset.dragReady = 'true'

			weatherWorkdayTrack.addEventListener('pointerdown', event => {
				if (event.pointerType === 'mouse' && event.button !== 0) return
				if (weatherWorkdayTrack.scrollWidth <= weatherWorkdayTrack.clientWidth) return

				isDragging = true
				startPointerX = event.clientX
				startScrollLeft = weatherWorkdayTrack.scrollLeft
				weatherWorkdayTrack.classList.add('is-dragging')
				weatherWorkdayTrack.setPointerCapture?.(event.pointerId)
				event.preventDefault()
			})

			weatherWorkdayTrack.addEventListener('pointermove', event => {
				if (!isDragging) return

				const deltaX = event.clientX - startPointerX
				weatherWorkdayTrack.scrollLeft = startScrollLeft - deltaX
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
			rangeLabel = `${formatHourLabel(weatherConfig.workdayStartHour)}-${formatHourLabel(weatherConfig.workdayEndHour)}`,
			label = 'Godzinowo'
		) => {
			if (weatherWorkdayLabel) weatherWorkdayLabel.textContent = label
			if (weatherWorkdayRange) weatherWorkdayRange.textContent = rangeLabel

			renderWorkdayTimeline(
				weatherConfig.workdayDisplayHours.map(hour => ({
					hour,
					weatherCode: null,
					temperatureLabel: '--',
					precipitationLabel: '',
					isCurrent: false,
					isUnavailable: true,
				}))
			)
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
			const workdayRangeLabel = `${formatHourLabel(weatherConfig.workdayStartHour)}-${formatHourLabel(weatherConfig.workdayEndHour)}`

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
				weatherConfig.workdayDisplayHours.map(hour => {
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
		}

		const openWeatherEditor = () => {
			if (!weatherLocationInput) return

			document.body.classList.add('weather-editor-open')
			weatherLocationInput.value =
				preferencesService?.getWeatherLocation?.(weatherConfig.fallbackName) ||
				storageService?.getText?.(weatherConfig.storageKey, weatherConfig.fallbackName) ||
				weatherConfig.fallbackName
			window.setTimeout(() => {
				weatherLocationInput.focus()
				weatherLocationInput.select()
			}, 20)
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
				weatherWidget.addEventListener('click', event => {
					if (event.target.closest('.weather-search')) return
					openWeatherEditor()
				})

				weatherWidget.addEventListener('keydown', event => {
					if (event.key !== 'Enter' && event.key !== ' ') return
					if (document.body.classList.contains('weather-editor-open')) return

					event.preventDefault()
					openWeatherEditor()
				})

				document.addEventListener('click', event => {
					if (!document.body.classList.contains('weather-editor-open')) return
					if (weatherWidget.contains(event.target)) return
					closeWeatherEditor()
				})

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
