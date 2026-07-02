export type WeatherTone = 'sun' | 'partly' | 'cloudy' | 'fog' | 'rain' | 'snow' | 'showers' | 'storm'

export type WeatherLocationRecord = {
	latitude: number
	longitude: number
	displayLabel: string
	searchLabel: string
	savedAt: string
}

export type WeatherDayForecast = {
	date: string
	description: string
	label: string
	maxTempLabel: string
	minTempLabel: string
	precipitationLabel: string
	tone: WeatherTone
	token: string
}

export type WeatherHourForecast = {
	date: string
	description: string
	hour: number
	isCurrent: boolean
	precipitationLabel: string
	temperatureLabel: string
	timeLabel: string
	tone: WeatherTone
	token: string
}

export type WeatherWidgetData = {
	dayForecasts: WeatherDayForecast[]
	descriptionLabel: string
	hourlyByDate: Record<string, WeatherHourForecast[]>
	locationLabel: string
	searchLabel: string
	temperatureLabel: string
	tone: WeatherTone
	token: string
	windLabel: string
}
