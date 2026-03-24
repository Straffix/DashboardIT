(function initializeDashboardWeatherModule() {
	const dashboardModules = (window.DashboardModules = window.DashboardModules || {})

	const weatherConfig = {
		storageKey: 'dashboard-weather-location',
		fallbackName: 'Warszawa',
		geoapifyApiKeyMetaName: 'geoapify-api-key',
		requestTimeoutMs: 6500,
	}

	const weatherCodeMap = {
		0: { label: 'Bezchmurnie', icon: 'fa-sun' },
		1: { label: 'Glownie slonecznie', icon: 'fa-cloud-sun' },
		2: { label: 'Czesciowe zachmurzenie', icon: 'fa-cloud-sun' },
		3: { label: 'Pochmurno', icon: 'fa-cloud' },
		45: { label: 'Mgla', icon: 'fa-smog' },
		48: { label: 'Osadzajaca sie mgla', icon: 'fa-smog' },
		51: { label: 'Lekka mzawka', icon: 'fa-cloud-rain' },
		53: { label: 'Mzawka', icon: 'fa-cloud-rain' },
		55: { label: 'Intensywna mzawka', icon: 'fa-cloud-rain' },
		61: { label: 'Lekki deszcz', icon: 'fa-cloud-rain' },
		63: { label: 'Deszcz', icon: 'fa-cloud-showers-heavy' },
		65: { label: 'Ulewa', icon: 'fa-cloud-showers-heavy' },
		71: { label: 'Lekki snieg', icon: 'fa-snowflake' },
		73: { label: 'Snieg', icon: 'fa-snowflake' },
		75: { label: 'Intensywny snieg', icon: 'fa-snowflake' },
		80: { label: 'Przelotny deszcz', icon: 'fa-cloud-sun-rain' },
		81: { label: 'Przelotny deszcz', icon: 'fa-cloud-sun-rain' },
		82: { label: 'Silny przelotny deszcz', icon: 'fa-cloud-showers-heavy' },
		95: { label: 'Burza', icon: 'fa-cloud-bolt' },
		96: { label: 'Burza z gradem', icon: 'fa-cloud-bolt' },
		99: { label: 'Silna burza z gradem', icon: 'fa-cloud-bolt' },
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
		const { weatherTemp, weatherLocation, weatherDescription, weatherWind, weatherIcon, weatherSearchForm, weatherLocationInput, weatherCurrentLocationBtn, weatherWidget } =
			elements || {}
		const { storageService, preferencesService } = services || {}

		const setWeatherState = ({ temperature, location, description, wind, icon }) => {
			if (weatherTemp) weatherTemp.textContent = temperature
			if (weatherLocation) {
				const compactLocation = window.innerWidth <= 640 ? location.split(',')[0].trim() : location
				weatherLocation.textContent = compactLocation
			}
			if (weatherDescription) weatherDescription.textContent = description
			if (weatherWind) weatherWind.textContent = wind
			if (weatherIcon) {
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
		}

		const fetchWeather = async (latitude, longitude, locationName) => {
			try {
				const data = await fetchJsonWithTimeout(
					`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code,wind_speed_10m&timezone=auto`,
					{ cache: 'no-store' }
				)
				const current = data.current || {}
				const weatherDetails = weatherCodeMap[current.weather_code] || {
					label: 'Warunki lokalne',
					icon: 'fa-cloud-sun',
				}

				setWeatherState({
					temperature: `${Math.round(current.temperature_2m ?? 0)} C`,
					location: locationName,
					description: weatherDetails.label,
					wind: `Wiatr ${Math.round(current.wind_speed_10m ?? 0)} km/h`,
					icon: weatherDetails.icon,
				})
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
				return
			}

			setWeatherState({
				temperature: '-- C',
				location: 'Aktualna lokalizacja',
				description: 'Pobieram pozycje...',
				wind: 'Prosze czekac',
				icon: 'fa-location-crosshairs',
			})

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

			fetchWeatherForLocation(savedLocation)

			if (weatherSearchForm && weatherLocationInput) {
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
