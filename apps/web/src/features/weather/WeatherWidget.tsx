import { startTransition, useEffect, useRef, useState } from 'react'

import { fetchWeatherForCurrentLocation, fetchWeatherForLocation } from './api'
import type { WeatherWidgetData } from './types'
import {
	clearStoredCurrentLocation,
	createWeatherFallbackData,
	getStoredCurrentLocation,
	getStoredWeatherLocation,
	isStoredCurrentLocationLabel,
	saveStoredCurrentLocation,
	saveStoredWeatherLocation,
	WEATHER_FALLBACK_LOCATION,
} from './utils'

function WeatherSummary({
	descriptionLabel,
	locationLabel,
	temperatureLabel,
	token,
	tone,
	windLabel,
}: Pick<WeatherWidgetData, 'descriptionLabel' | 'locationLabel' | 'temperatureLabel' | 'token' | 'tone' | 'windLabel'>) {
	return (
		<div className={`weather-widget-card__summary weather-widget-card__summary--${tone}`}>
			<span className="weather-widget-card__token" aria-hidden="true">
				{token}
			</span>
			<div className="weather-widget-card__copy">
				<p className="month-summary-card__label">Pogoda teraz</p>
				<strong>{temperatureLabel}</strong>
				<span>{locationLabel}</span>
				<p>{descriptionLabel}</p>
				<small>{windLabel}</small>
			</div>
		</div>
	)
}

export function WeatherWidget() {
	const initialLocation = getStoredWeatherLocation() || WEATHER_FALLBACK_LOCATION
	const [weatherData, setWeatherData] = useState<WeatherWidgetData | null>(null)
	const [locationInput, setLocationInput] = useState(initialLocation)
	const [activeLocation, setActiveLocation] = useState(initialLocation)
	const [selectedDate, setSelectedDate] = useState('')
	const [editorOpen, setEditorOpen] = useState(false)
	const [feedback, setFeedback] = useState('')
	const [feedbackTone, setFeedbackTone] = useState<'neutral' | 'warning' | 'success'>('neutral')
	const [isLoading, setIsLoading] = useState(true)
	const [isCurrentLocationLoading, setIsCurrentLocationLoading] = useState(false)
	const requestIdRef = useRef(0)

	useEffect(() => {
		const nextRequestId = requestIdRef.current + 1
		requestIdRef.current = nextRequestId
		setIsLoading(true)

		void fetchWeatherForLocation(activeLocation)
			.then(nextWeatherData => {
				if (requestIdRef.current !== nextRequestId) return

				setWeatherData(nextWeatherData)
				setSelectedDate(currentSelectedDate => (currentSelectedDate && nextWeatherData.hourlyByDate[currentSelectedDate] ? currentSelectedDate : ''))
			})
			.catch(error => {
				if (requestIdRef.current !== nextRequestId) return

				setWeatherData(createWeatherFallbackData(activeLocation, activeLocation, error instanceof Error ? error.message : 'Brak danych pogodowych.'))
			})
			.finally(() => {
				if (requestIdRef.current !== nextRequestId) return
				setIsLoading(false)
			})
	}, [activeLocation])

	const handleLocationSubmit = () => {
		const trimmedLocation = String(locationInput || '').trim()
		if (!trimmedLocation) {
			setFeedbackTone('warning')
			setFeedback('Wpisz miasto, aby pobrac prognoze.')
			return
		}

		const storedCurrentLocation = getStoredCurrentLocation()
		if (!isStoredCurrentLocationLabel(trimmedLocation, storedCurrentLocation)) {
			clearStoredCurrentLocation()
		}

		saveStoredWeatherLocation(trimmedLocation)
		setFeedback('')
		setEditorOpen(false)
		startTransition(() => {
			setSelectedDate('')
			setActiveLocation(trimmedLocation)
		})
	}

	const handleCurrentLocation = async () => {
		setIsCurrentLocationLoading(true)
		setFeedbackTone('neutral')
		setFeedback('Pobieram lokalizacje urzadzenia...')

		try {
			const currentLocationResult = await fetchWeatherForCurrentLocation()
			saveStoredCurrentLocation(currentLocationResult.locationRecord)
			saveStoredWeatherLocation(currentLocationResult.locationRecord.searchLabel)
			setLocationInput(currentLocationResult.locationRecord.searchLabel)
			setWeatherData(currentLocationResult.weatherData)
			setFeedbackTone('success')
			setFeedback(`Uzyto lokalizacji: ${currentLocationResult.locationRecord.displayLabel}.`)
			setEditorOpen(false)
			startTransition(() => {
				setSelectedDate('')
				setActiveLocation(currentLocationResult.locationRecord.searchLabel)
			})
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : 'Nie udalo sie pobrac lokalizacji.'
			setWeatherData(createWeatherFallbackData('Aktualna lokalizacja', locationInput || WEATHER_FALLBACK_LOCATION, errorMessage, 'Tryb lokalizacji niedostepny'))
			startTransition(() => {
				setSelectedDate('')
			})
			setFeedbackTone('warning')
			setFeedback(errorMessage)
		} finally {
			setIsCurrentLocationLoading(false)
		}
	}

	const selectedHours = selectedDate && weatherData ? weatherData.hourlyByDate[selectedDate] || [] : []

	return (
		<section className="data-card weather-widget-card" aria-labelledby="dashboard-weather-title">
			<div className="weather-widget-card__head">
				<div className="dashboard-home-section-head">
					<p className="month-summary-card__label">Pogoda</p>
					<strong id="dashboard-weather-title">Pogoda i prognoza 3-dniowa</strong>
					<span>
						Widget obsluguje wyszukiwanie miasta, geolokalizacje oraz godzinowy drill-down prognozy.
					</span>
				</div>

				<button type="button" className="button-secondary" onClick={() => setEditorOpen(currentOpen => !currentOpen)}>
					{editorOpen ? 'Ukryj panel' : 'Zmien lokalizacje'}
				</button>
			</div>

			{weatherData ? (
				<WeatherSummary
					descriptionLabel={weatherData.descriptionLabel}
					locationLabel={weatherData.locationLabel}
					temperatureLabel={weatherData.temperatureLabel}
					token={weatherData.token}
					tone={weatherData.tone}
					windLabel={weatherData.windLabel}
				/>
			) : (
				<p className="dashboard-home-empty">Laduje dane pogodowe dla dashboardu.</p>
			)}

			{feedback ? (
				<p className={`helper-note${feedbackTone === 'warning' ? ' is-warning' : feedbackTone === 'success' ? ' is-success' : ''}`}>{feedback}</p>
			) : null}

			{editorOpen ? (
				<div className="weather-widget-card__editor">
					<div className="weather-widget-card__controls">
						<label className="search-input weather-widget-card__search">
							<span>Miasto</span>
							<input
								type="text"
								value={locationInput}
								placeholder="Wpisz miasto"
								onChange={event => {
									setLocationInput(event.target.value)
								}}
								onKeyDown={event => {
									if (event.key === 'Enter') {
										event.preventDefault()
										handleLocationSubmit()
									}
								}}
							/>
						</label>

						<button type="button" className="button-primary" disabled={isLoading} onClick={handleLocationSubmit}>
							{isLoading ? 'Szukam...' : 'Pobierz pogode'}
						</button>
						<button type="button" className="button-secondary" disabled={isCurrentLocationLoading} onClick={() => void handleCurrentLocation()}>
							{isCurrentLocationLoading ? 'Pobieram pozycje...' : 'Uzyj mojej lokalizacji'}
						</button>
					</div>

					<p className="weather-widget-card__hint">Kliknij dzien, aby zobaczyc rozpiske godzinowa.</p>
				</div>
			) : null}

			<div className="weather-forecast-grid" aria-label="Prognoza dzienna">
				{weatherData?.dayForecasts.length ? (
					weatherData.dayForecasts.map(dayForecast => (
						<button
							key={dayForecast.date}
							type="button"
							className={`weather-forecast-card${selectedDate === dayForecast.date ? ' is-selected' : ''}`}
							onClick={() => {
								startTransition(() => {
									setSelectedDate(currentSelectedDate => (currentSelectedDate === dayForecast.date ? '' : dayForecast.date))
								})
							}}>
							<div className={`weather-forecast-card__token weather-forecast-card__token--${dayForecast.tone}`}>{dayForecast.token}</div>
							<div className="weather-forecast-card__copy">
								<strong>{dayForecast.label}</strong>
								<span>{dayForecast.description}</span>
								<p>
									{dayForecast.maxTempLabel} / {dayForecast.minTempLabel}
								</p>
								<small>{dayForecast.precipitationLabel || 'Bez sygnalu o opadach'}</small>
							</div>
						</button>
					))
				) : (
					<p className="dashboard-home-empty">Brak prognozy 3-dniowej dla tej lokalizacji.</p>
				)}
			</div>

			{selectedDate && selectedHours.length > 0 ? (
				<div className="weather-hourly-panel" aria-label="Prognoza godzinowa">
					<div className="weather-hourly-panel__head">
						<p className="month-summary-card__label">Godzinowo</p>
						<strong>{weatherData?.dayForecasts.find(dayForecast => dayForecast.date === selectedDate)?.label || 'Wybrany dzien'}</strong>
						<span>{selectedHours.length} slotow godzinowych w podgladzie.</span>
					</div>

					<div className="weather-hourly-track">
						{selectedHours.map(hourForecast => (
							<article
								key={`${hourForecast.date}-${hourForecast.hour}`}
								className={`weather-hourly-card${hourForecast.isCurrent ? ' is-current' : ''}`}>
								<span className={`weather-hourly-card__token weather-hourly-card__token--${hourForecast.tone}`}>{hourForecast.token}</span>
								<strong>{hourForecast.timeLabel}</strong>
								<p>{hourForecast.temperatureLabel}</p>
								<span>{hourForecast.description}</span>
								<small>{hourForecast.precipitationLabel || 'Brak sygnalu o opadach'}</small>
							</article>
						))}
					</div>
				</div>
			) : null}
		</section>
	)
}
