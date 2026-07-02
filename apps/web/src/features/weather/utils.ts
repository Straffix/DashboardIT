import type { WeatherDayForecast, WeatherHourForecast, WeatherLocationRecord, WeatherTone, WeatherWidgetData } from './types'

export const WEATHER_LOCATION_STORAGE_KEY = 'dashboard-weather-location'
export const WEATHER_CURRENT_LOCATION_STORAGE_KEY = `${WEATHER_LOCATION_STORAGE_KEY}-current`
export const WEATHER_FALLBACK_LOCATION = 'Warszawa'
export const WEATHER_REQUEST_TIMEOUT_MS = 6500
export const WEATHER_HOUR_START = 0
export const WEATHER_HOUR_END = 23

const WEATHER_CODE_MAP: Record<number, { label: string; tone: WeatherTone; token: string }> = {
	0: { label: 'Bezchmurnie', tone: 'sun', token: 'SUN' },
	1: { label: 'Glownie slonecznie', tone: 'partly', token: 'CLR' },
	2: { label: 'Czesciowe zachmurzenie', tone: 'partly', token: 'MIX' },
	3: { label: 'Pochmurno', tone: 'cloudy', token: 'CLD' },
	45: { label: 'Mgla', tone: 'fog', token: 'FOG' },
	48: { label: 'Osadzajaca sie mgla', tone: 'fog', token: 'FOG' },
	51: { label: 'Lekka mzawka', tone: 'rain', token: 'DRP' },
	53: { label: 'Mzawka', tone: 'rain', token: 'RAN' },
	55: { label: 'Intensywna mzawka', tone: 'rain', token: 'RAN' },
	61: { label: 'Lekki deszcz', tone: 'rain', token: 'RAN' },
	63: { label: 'Deszcz', tone: 'rain', token: 'RAN' },
	65: { label: 'Ulewa', tone: 'rain', token: 'RAN' },
	71: { label: 'Lekki snieg', tone: 'snow', token: 'SNW' },
	73: { label: 'Snieg', tone: 'snow', token: 'SNW' },
	75: { label: 'Intensywny snieg', tone: 'snow', token: 'SNW' },
	80: { label: 'Przelotny deszcz', tone: 'showers', token: 'SHR' },
	81: { label: 'Przelotny deszcz', tone: 'showers', token: 'SHR' },
	82: { label: 'Silny przelotny deszcz', tone: 'rain', token: 'RAN' },
	95: { label: 'Burza', tone: 'storm', token: 'STM' },
	96: { label: 'Burza z gradem', tone: 'storm', token: 'STM' },
	99: { label: 'Silna burza z gradem', tone: 'storm', token: 'STM' },
}

function ensureWindow() {
	return typeof window !== 'undefined'
}

function readBrowserJsonValue<T>(key: string, fallback: T) {
	if (!ensureWindow()) return fallback

	try {
		const rawValue = window.localStorage.getItem(key)
		if (!rawValue) return fallback

		return JSON.parse(rawValue) as T
	} catch {
		return fallback
	}
}

function writeBrowserJsonValue<T>(key: string, value: T) {
	if (!ensureWindow()) return

	try {
		window.localStorage.setItem(key, JSON.stringify(value))
	} catch {
		// Ignore storage write failures and keep the widget responsive.
	}
}

export function getWeatherDetails(weatherCode: number | null | undefined) {
	if (weatherCode === null || weatherCode === undefined) {
		return {
			label: 'Warunki lokalne',
			tone: 'cloudy' as const,
			token: 'WTH',
		}
	}

	return WEATHER_CODE_MAP[weatherCode] || {
		label: 'Warunki lokalne',
		tone: 'cloudy' as const,
		token: 'WTH',
	}
}

export function normalizeSearchValue(value: string | undefined) {
	return String(value || '')
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLocaleLowerCase('pl-PL')
		.trim()
}

function normalizeLocationPart(value: string | undefined) {
	return String(value || '')
		.replace(/^(gmina|gm\.|powiat|wojewodztwo)\s+/i, '')
		.replace(/\s+/g, ' ')
		.trim()
}

function getUniqueLocationParts(parts: Array<string | undefined>) {
	const seen = new Set<string>()

	return parts
		.map(part => normalizeLocationPart(part))
		.filter(part => {
			if (!part) return false

			const normalizedPart = normalizeSearchValue(part)
			if (seen.has(normalizedPart)) return false

			seen.add(normalizedPart)
			return true
		})
}

export function buildCurrentLocationDetails(address: Record<string, string | undefined>) {
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
		getUniqueLocationParts([address.town, address.city_district, address.city, address.municipality, address.county, address.state, address.country]).find(
			part => part !== primaryLabel
		) || ''
	const searchLabel =
		getUniqueLocationParts([address.city, address.town, address.village, address.municipality, address.county, address.state, address.country])[0] ||
		primaryLabel ||
		'Aktualna lokalizacja'

	return {
		displayLabel: getUniqueLocationParts([primaryLabel, contextLabel]).join(', ') || 'Aktualna lokalizacja',
		searchLabel,
	}
}

export function buildGeoapifyLocationDetails(properties: Record<string, string | undefined>) {
	const primaryLabel =
		getUniqueLocationParts([properties.city, properties.town, properties.village, properties.hamlet, properties.suburb, properties.district, properties.county])[0] ||
		getUniqueLocationParts([properties.state, properties.country])[0] ||
		'Aktualna lokalizacja'
	const contextLabel =
		getUniqueLocationParts([properties.county, properties.state, properties.country]).find(part => part !== primaryLabel) || ''
	const searchLabel =
		getUniqueLocationParts([properties.city, properties.town, properties.village, properties.municipality, properties.county, properties.state, properties.country])[0] ||
		primaryLabel ||
		'Aktualna lokalizacja'

	return {
		displayLabel: getUniqueLocationParts([primaryLabel, contextLabel]).join(', ') || 'Aktualna lokalizacja',
		searchLabel,
	}
}

export function pickBestGeocodingResult(
	results: Array<{
		admin1?: string
		admin2?: string
		country?: string
		country_code?: string
		feature_code?: string
		latitude: number
		longitude: number
		name?: string
		population?: number
	}>,
	query: string
) {
	const normalizedQuery = normalizeSearchValue(query)
	const featureBonus: Record<string, number> = {
		PPLC: 8,
		PPLA: 7,
		PPLA2: 6,
		PPLA3: 5,
		PPLA4: 4,
		PPL: 4,
		PPLL: 3,
		PPLX: 2,
	}

	return [...(results || [])].sort((leftResult, rightResult) => {
		const scoreResult = (result: typeof leftResult) => {
			const normalizedName = normalizeSearchValue(result?.name)
			const normalizedAdmin1 = normalizeSearchValue(result?.admin1)
			const normalizedAdmin2 = normalizeSearchValue(result?.admin2)

			let score = 0
			if (normalizedName === normalizedQuery) score += 100
			else if (normalizedName.startsWith(normalizedQuery)) score += 60
			else if (normalizedName.includes(normalizedQuery)) score += 40

			if (normalizedAdmin2 === normalizedQuery) score += 20
			if (normalizedAdmin1 === normalizedQuery) score += 10
			if (result?.country_code === 'PL') score += 25

			score += featureBonus[result?.feature_code || ''] || 0
			score += Math.min(Number(result?.population) || 0, 1_000_000) / 100_000

			return score
		}

		return scoreResult(rightResult) - scoreResult(leftResult)
	})[0]
}

export function formatHourLabel(hour: number) {
	return `${String(hour).padStart(2, '0')}:00`
}

export function formatForecastDateLabel(dateValue: string, index: number) {
	const fallbackLabels = ['Dzis', 'Jutro', 'Pojutrze']
	if (fallbackLabels[index]) return fallbackLabels[index]

	const parsedDate = new Date(`${dateValue}T12:00:00`)
	if (Number.isNaN(parsedDate.getTime())) return 'Dzien'

	return parsedDate.toLocaleDateString('pl-PL', { weekday: 'short' })
}

export function getStoredWeatherLocation() {
	if (!ensureWindow()) return WEATHER_FALLBACK_LOCATION
	return window.localStorage.getItem(WEATHER_LOCATION_STORAGE_KEY) || WEATHER_FALLBACK_LOCATION
}

export function saveStoredWeatherLocation(location: string) {
	if (!ensureWindow()) return

	try {
		window.localStorage.setItem(WEATHER_LOCATION_STORAGE_KEY, String(location || '').trim() || WEATHER_FALLBACK_LOCATION)
	} catch {
		// Ignore preference write failures.
	}
}

function parseStoredCurrentLocation(value: unknown): WeatherLocationRecord | null {
	if (!value || typeof value !== 'object') return null

	const source = value as Partial<WeatherLocationRecord>
	const latitude = Number(source.latitude)
	const longitude = Number(source.longitude)
	if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null
	if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return null

	const displayLabel = String(source.displayLabel || source.searchLabel || 'Aktualna lokalizacja').trim()
	const searchLabel = String(source.searchLabel || displayLabel || 'Aktualna lokalizacja').trim()

	return {
		latitude,
		longitude,
		displayLabel: displayLabel || 'Aktualna lokalizacja',
		searchLabel: searchLabel || 'Aktualna lokalizacja',
		savedAt: String(source.savedAt || ''),
	}
}

export function getStoredCurrentLocation() {
	return parseStoredCurrentLocation(readBrowserJsonValue<unknown>(WEATHER_CURRENT_LOCATION_STORAGE_KEY, null))
}

export function saveStoredCurrentLocation(locationRecord: Omit<WeatherLocationRecord, 'savedAt'>) {
	const normalizedLocationRecord = parseStoredCurrentLocation({
		...locationRecord,
		savedAt: new Date().toISOString(),
	})
	if (!normalizedLocationRecord) return

	writeBrowserJsonValue(WEATHER_CURRENT_LOCATION_STORAGE_KEY, normalizedLocationRecord)
}

export function clearStoredCurrentLocation() {
	if (!ensureWindow()) return

	try {
		window.localStorage.removeItem(WEATHER_CURRENT_LOCATION_STORAGE_KEY)
	} catch {
		// Ignore storage cleanup failures.
	}
}

export function isStoredCurrentLocationLabel(locationName: string, storedCurrentLocation: WeatherLocationRecord | null) {
	if (!storedCurrentLocation) return false

	const normalizedLocationName = normalizeSearchValue(locationName)
	if (!normalizedLocationName) return false

	return [storedCurrentLocation.displayLabel, storedCurrentLocation.searchLabel, 'Aktualna lokalizacja'].some(
		label => normalizeSearchValue(label) === normalizedLocationName
	)
}

export function buildWeatherWidgetData(
	locationLabel: string,
	searchLabel: string,
	data: {
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
	}
): WeatherWidgetData {
	const current = data.current || {}
	const currentDetails = getWeatherDetails(current.weather_code)
	const currentTime = String(current.time || '')
	const currentDate = currentTime.split('T')[0] || ''
	const currentHour = Number(String(currentTime).slice(11, 13))

	const dayForecasts: WeatherDayForecast[] = []
	const dailyTimes = Array.isArray(data.daily?.time) ? data.daily?.time.slice(0, 3) : []
	const dailyWeatherCodes = Array.isArray(data.daily?.weather_code) ? data.daily?.weather_code : []
	const dailyMaxTemps = Array.isArray(data.daily?.temperature_2m_max) ? data.daily?.temperature_2m_max : []
	const dailyMinTemps = Array.isArray(data.daily?.temperature_2m_min) ? data.daily?.temperature_2m_min : []
	const dailyPrecipitation = Array.isArray(data.daily?.precipitation_probability_max) ? data.daily?.precipitation_probability_max : []

	dailyTimes.forEach((dateValue, index) => {
		const dayDetails = getWeatherDetails(dailyWeatherCodes[index])
		dayForecasts.push({
			date: dateValue,
			description: dayDetails.label,
			label: formatForecastDateLabel(dateValue, index),
			maxTempLabel: Number.isFinite(dailyMaxTemps[index]) ? `${Math.round(dailyMaxTemps[index] || 0)} C` : '--',
			minTempLabel: Number.isFinite(dailyMinTemps[index]) ? `${Math.round(dailyMinTemps[index] || 0)} C` : '--',
			precipitationLabel: Number.isFinite(dailyPrecipitation[index]) ? `Opad ${Math.round(dailyPrecipitation[index] || 0)}%` : '',
			tone: dayDetails.tone,
			token: dayDetails.token,
		})
	})

	const hourlyByDate: Record<string, WeatherHourForecast[]> = {}
	const hourlyTimes = Array.isArray(data.hourly?.time) ? data.hourly?.time : []
	const hourlyTemperatures = Array.isArray(data.hourly?.temperature_2m) ? data.hourly?.temperature_2m : []
	const hourlyWeatherCodes = Array.isArray(data.hourly?.weather_code) ? data.hourly?.weather_code : []
	const hourlyPrecipitation = Array.isArray(data.hourly?.precipitation_probability) ? data.hourly?.precipitation_probability : []

	hourlyTimes.forEach((timeValue, index) => {
		const [dateValue, timeLabel = ''] = String(timeValue).split('T')
		if (!dateValue) return

		const hour = Number(timeLabel.slice(0, 2))
		if (!Number.isFinite(hour) || hour < WEATHER_HOUR_START || hour > WEATHER_HOUR_END) return

		const hourDetails = getWeatherDetails(hourlyWeatherCodes[index])
		const nextHourForecast: WeatherHourForecast = {
			date: dateValue,
			description: hourDetails.label,
			hour,
			isCurrent: currentDate === dateValue && currentHour === hour,
			precipitationLabel: Number.isFinite(hourlyPrecipitation[index]) ? `Opad ${Math.round(hourlyPrecipitation[index] || 0)}%` : '',
			temperatureLabel: Number.isFinite(hourlyTemperatures[index]) ? `${Math.round(hourlyTemperatures[index] || 0)} C` : '--',
			timeLabel: formatHourLabel(hour),
			tone: hourDetails.tone,
			token: hourDetails.token,
		}

		const currentDateHours = hourlyByDate[dateValue] || []
		hourlyByDate[dateValue] = [...currentDateHours, nextHourForecast]
	})

	for (const [dateValue, dayHours] of Object.entries(hourlyByDate)) {
		hourlyByDate[dateValue] = dayHours.sort((leftHour, rightHour) => leftHour.hour - rightHour.hour)
	}

	return {
		dayForecasts,
		descriptionLabel: currentDetails.label,
		hourlyByDate,
		locationLabel,
		searchLabel,
		temperatureLabel: Number.isFinite(current.temperature_2m) ? `${Math.round(current.temperature_2m || 0)} C` : '-- C',
		tone: currentDetails.tone,
		token: currentDetails.token,
		windLabel: Number.isFinite(current.wind_speed_10m) ? `Wiatr ${Math.round(current.wind_speed_10m || 0)} km/h` : 'Wiatr -- km/h',
	}
}

export function createWeatherFallbackData(locationLabel: string, searchLabel: string, descriptionLabel: string, windLabel = 'Tryb offline'): WeatherWidgetData {
	return {
		dayForecasts: [],
		descriptionLabel,
		hourlyByDate: {},
		locationLabel: locationLabel || WEATHER_FALLBACK_LOCATION,
		searchLabel: searchLabel || WEATHER_FALLBACK_LOCATION,
		temperatureLabel: '-- C',
		tone: 'cloudy',
		token: 'OFF',
		windLabel,
	}
}

export function getCurrentLocationPermissionHint() {
	const userAgent = String(navigator.userAgent || '').toLowerCase()
	const platform = String(navigator.platform || '').toLowerCase()
	const isWindows = userAgent.includes('windows') || platform.includes('win')
	const isMac = userAgent.includes('mac os') || platform.includes('mac')
	const isSafari =
		userAgent.includes('safari') &&
		!userAgent.includes('chrome') &&
		!userAgent.includes('crios') &&
		!userAgent.includes('edg') &&
		!userAgent.includes('opr') &&
		!userAgent.includes('firefox') &&
		!userAgent.includes('fxios')

	if (isSafari && isMac) {
		return 'Sprawdz ustawienia Safari i uslug lokalizacji w macOS.'
	}

	if (isWindows) {
		return 'Sprawdz uprawnienia lokalizacji w przegladarce i systemie Windows.'
	}

	return 'Sprawdz uprawnienia lokalizacji w przegladarce i systemie.'
}

export function getCurrentLocationErrorDetails(error: unknown) {
	const errorCode = typeof error === 'object' && error && 'code' in error ? Number((error as { code?: unknown }).code) : 0

	if (errorCode === 1) {
		return {
			description: 'Dostep do lokalizacji zablokowany.',
			windLabel: getCurrentLocationPermissionHint(),
		}
	}

	if (errorCode === 2) {
		return {
			description: 'Nie udalo sie ustalic pozycji.',
			windLabel: 'Upewnij sie, ze lokalizacja urzadzenia jest wlaczona i sprobuj ponownie.',
		}
	}

	if (errorCode === 3) {
		return {
			description: 'Przekroczono czas pobierania.',
			windLabel: 'Polaczenie lub uslugi lokalizacji odpowiadaja zbyt dlugo.',
		}
	}

	return {
		description: error instanceof Error && error.message ? error.message : 'Nie udalo sie pobrac lokalizacji.',
		windLabel: getCurrentLocationPermissionHint(),
	}
}
