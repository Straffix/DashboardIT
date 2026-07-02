import type { WeatherLocationRecord, WeatherWidgetData } from './types'
import {
	buildCurrentLocationDetails,
	buildGeoapifyLocationDetails,
	buildWeatherWidgetData,
	createWeatherFallbackData,
	getCurrentLocationErrorDetails,
	getStoredCurrentLocation,
	getStoredWeatherLocation,
	isStoredCurrentLocationLabel,
	pickBestGeocodingResult,
	WEATHER_FALLBACK_LOCATION,
	WEATHER_REQUEST_TIMEOUT_MS,
} from './utils'

const GEOAPIFY_API_KEY = import.meta.env.VITE_GEOAPIFY_API_KEY?.trim() || ''

async function fetchJsonWithTimeout<T>(url: string, timeoutMs = WEATHER_REQUEST_TIMEOUT_MS) {
	const controller = typeof AbortController !== 'undefined' ? new AbortController() : null
	const timeoutId = controller ? window.setTimeout(() => controller.abort(), timeoutMs) : 0

	try {
		const response = await fetch(url, {
			cache: 'no-store',
			signal: controller?.signal,
		})
		if (!response.ok) {
			throw new Error(`Request failed with status ${response.status}`)
		}

		return (await response.json()) as T
	} finally {
		if (controller) {
			window.clearTimeout(timeoutId)
		}
	}
}

async function fetchForecastByCoordinates(latitude: number, longitude: number) {
	return fetchJsonWithTimeout<{
		current?: {
			temperature_2m?: number
			time?: string
			weather_code?: number
			wind_speed_10m?: number
		}
		daily?: {
			precipitation_probability_max?: number[]
			temperature_2m_max?: number[]
			temperature_2m_min?: number[]
			time?: string[]
			weather_code?: number[]
		}
		hourly?: {
			precipitation_probability?: number[]
			temperature_2m?: number[]
			time?: string[]
			weather_code?: number[]
		}
	}>(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code,wind_speed_10m&hourly=temperature_2m,weather_code,precipitation_probability&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto`)
}

async function geocodeLocation(locationName: string) {
	const response = await fetchJsonWithTimeout<{
		results?: Array<{
			admin1?: string
			admin2?: string
			country?: string
			country_code?: string
			feature_code?: string
			latitude: number
			longitude: number
			name?: string
			population?: number
		}>
	}>(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(locationName)}&count=10&language=pl&format=json`)

	const bestResult = pickBestGeocodingResult(response.results || [], locationName)
	if (!bestResult) {
		throw new Error('Nie znaleziono lokalizacji.')
	}

	return bestResult
}

function requestCurrentPosition(options: PositionOptions) {
	return new Promise<GeolocationPosition>((resolve, reject) => {
		navigator.geolocation.getCurrentPosition(resolve, reject, options)
	})
}

async function requestBestCurrentPosition({ timeout = 16_000, desiredAccuracy = 2500 } = {}) {
	return new Promise<GeolocationPosition>((resolve, reject) => {
		let bestPosition: GeolocationPosition | null = null
		let isSettled = false
		let watchId: number | null = null
		let timeoutId = 0
		let fallbackRequestStarted = false

		const finishWithPosition = (position: GeolocationPosition) => {
			if (isSettled) return

			isSettled = true
			if (watchId !== null) {
				navigator.geolocation.clearWatch(watchId)
			}
			window.clearTimeout(timeoutId)
			resolve(position)
		}

		const finishWithError = (error: GeolocationPositionError | Error) => {
			if (isSettled) return

			isSettled = true
			if (watchId !== null) {
				navigator.geolocation.clearWatch(watchId)
			}
			window.clearTimeout(timeoutId)
			reject(error)
		}

		const rememberBestPosition = (position: GeolocationPosition) => {
			if (!bestPosition) {
				bestPosition = position
				return
			}

			if ((position.coords.accuracy ?? Number.POSITIVE_INFINITY) < (bestPosition.coords.accuracy ?? Number.POSITIVE_INFINITY)) {
				bestPosition = position
			}
		}

		const requestLowAccuracyFallback = (fallbackError?: GeolocationPositionError | Error) => {
			if (fallbackRequestStarted) return

			fallbackRequestStarted = true
			void requestCurrentPosition({
				enableHighAccuracy: false,
				timeout: 10_000,
				maximumAge: 900_000,
			})
				.then(position => finishWithPosition(position))
				.catch(error => finishWithError((error as GeolocationPositionError) || fallbackError || new Error('Nie udalo sie pobrac lokalizacji.')))
		}

		watchId = navigator.geolocation.watchPosition(
			position => {
				rememberBestPosition(position)

				if ((position.coords.accuracy ?? Number.POSITIVE_INFINITY) <= desiredAccuracy) {
					finishWithPosition(bestPosition || position)
				}
			},
			error => {
				if (bestPosition) {
					finishWithPosition(bestPosition)
					return
				}

				if (error?.code === 1) {
					finishWithError(error)
					return
				}

				requestLowAccuracyFallback(error)
			},
			{
				enableHighAccuracy: true,
				timeout,
				maximumAge: 0,
			}
		)

		timeoutId = window.setTimeout(() => {
			if (bestPosition) {
				finishWithPosition(bestPosition)
				return
			}

			requestLowAccuracyFallback()
		}, timeout)
	})
}

async function resolveCurrentLocationName(latitude: number, longitude: number) {
	if (GEOAPIFY_API_KEY) {
		try {
			const geoapifyResponse = await fetchJsonWithTimeout<{
				features?: Array<{
					properties?: Record<string, string | undefined>
				}>
			}>(`https://api.geoapify.com/v1/geocode/reverse?lat=${latitude}&lon=${longitude}&type=city&lang=pl&limit=1&apiKey=${encodeURIComponent(GEOAPIFY_API_KEY)}`)

			const properties = geoapifyResponse.features?.[0]?.properties
			if (properties) {
				return buildGeoapifyLocationDetails(properties)
			}
		} catch {
			// Fallback stays on Nominatim.
		}
	}

	try {
		const nominatimResponse = await fetchJsonWithTimeout<{
			address?: Record<string, string | undefined>
		}>(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&accept-language=pl&addressdetails=1&zoom=18`)

		return buildCurrentLocationDetails(nominatimResponse.address || {})
	} catch {
		return {
			displayLabel: 'Aktualna lokalizacja',
			searchLabel: 'Aktualna lokalizacja',
		}
	}
}

export async function fetchWeatherForLocation(locationName: string): Promise<WeatherWidgetData> {
	const trimmedLocation = String(locationName || '').trim() || getStoredWeatherLocation() || WEATHER_FALLBACK_LOCATION
	const storedCurrentLocation = getStoredCurrentLocation()

	try {
		if (storedCurrentLocation && isStoredCurrentLocationLabel(trimmedLocation, storedCurrentLocation)) {
			const forecastData = await fetchForecastByCoordinates(storedCurrentLocation.latitude, storedCurrentLocation.longitude)
			return buildWeatherWidgetData(storedCurrentLocation.displayLabel, storedCurrentLocation.searchLabel, forecastData)
		}

		const geocodingResult = await geocodeLocation(trimmedLocation)
		const forecastData = await fetchForecastByCoordinates(geocodingResult.latitude, geocodingResult.longitude)
		const resolvedLocationLabel = [geocodingResult.name, geocodingResult.country].filter(Boolean).join(', ') || trimmedLocation

		return buildWeatherWidgetData(resolvedLocationLabel, trimmedLocation, forecastData)
	} catch (error) {
		const descriptionLabel =
			error instanceof Error && error.message
				? error.message === 'Location not found'
					? 'Nie znaleziono lokalizacji.'
					: error.message.includes('Abort')
						? 'Brak odpowiedzi z API pogody.'
						: error.message
				: 'Brak danych pogodowych.'

		return createWeatherFallbackData(trimmedLocation, trimmedLocation, descriptionLabel)
	}
}

export async function fetchWeatherForCurrentLocation(): Promise<{ locationRecord: Omit<WeatherLocationRecord, 'savedAt'>; weatherData: WeatherWidgetData }> {
	if (!navigator.geolocation) {
		throw new Error('Geolokalizacja niedostepna w tej przegladarce.')
	}

	if (!window.isSecureContext) {
		throw new Error('Lokalizacja wymaga HTTPS albo localhost.')
	}

	try {
		const position = await requestBestCurrentPosition()
		const latitude = position.coords.latitude
		const longitude = position.coords.longitude
		const locationDetails = await resolveCurrentLocationName(latitude, longitude)
		const forecastData = await fetchForecastByCoordinates(latitude, longitude)

		return {
			locationRecord: {
				latitude,
				longitude,
				displayLabel: locationDetails.displayLabel,
				searchLabel: locationDetails.searchLabel,
			},
			weatherData: buildWeatherWidgetData(locationDetails.displayLabel, locationDetails.searchLabel, forecastData),
		}
	} catch (error) {
		const errorDetails = getCurrentLocationErrorDetails(error)
		throw new Error(`${errorDetails.description} ${errorDetails.windLabel}`.trim())
	}
}
