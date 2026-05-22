(function initializeDashboardClockModule() {
	const dashboardModules = (window.DashboardModules = window.DashboardModules || {})

	const padNumber = value => String(value).padStart(2, '0')

	const formatTaskDateKey = date =>
		`${date.getFullYear()}-${padNumber(date.getMonth() + 1)}-${padNumber(date.getDate())}`

	dashboardModules.createClockController = ({ elements, onDayChange } = {}) => {
		const { clockHour, clockMinute, clockSecond, clockDigital, clockDate } = elements || {}
		let lastClockMinuteKey = ''
		let lastClockDateKey = ''
		let intervalId = null

		const update = () => {
			if (!clockHour || !clockMinute || !clockSecond || !clockDigital || !clockDate) return

			const now = new Date()
			const hours = now.getHours()
			const minutes = now.getMinutes()
			const seconds = now.getSeconds()
			const minuteKey = `${padNumber(hours)}:${padNumber(minutes)}`
			const dateKey = formatTaskDateKey(now)

			const hourDegrees = (hours % 12) * 30 + minutes * 0.5
			const minuteDegrees = minutes * 6 + seconds * 0.1
			const secondDegrees = seconds * 6

			clockHour.style.transform = `translateX(-50%) rotate(${hourDegrees}deg)`
			clockMinute.style.transform = `translateX(-50%) rotate(${minuteDegrees}deg)`
			clockSecond.style.transform = `translateX(-50%) rotate(${secondDegrees}deg)`

			if (minuteKey !== lastClockMinuteKey) {
				lastClockMinuteKey = minuteKey
				clockDigital.textContent = minuteKey
			}

			if (dateKey !== lastClockDateKey) {
				lastClockDateKey = dateKey
				clockDate.textContent = now.toLocaleDateString('pl-PL', {
					weekday: 'long',
					day: '2-digit',
					month: 'long',
				})
				onDayChange?.(dateKey)
			}
		}

		const start = () => {
			update()
			if (intervalId) {
				window.clearInterval(intervalId)
			}
			intervalId = window.setInterval(update, 1000)
		}

		return {
			start,
			update,
		}
	}
})()
