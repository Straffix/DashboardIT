type MonitorStatsProps = {
	all: number
	active: number
	warning: number
	expired: number
}

export function MonitorStats({ all, active, warning, expired }: MonitorStatsProps) {
	const items = [
		{ label: 'Wszystkie', value: all, tone: 'neutral' },
		{ label: 'Aktywne', value: active, tone: 'active' },
		{ label: 'Wygasajace', value: warning, tone: 'warning' },
		{ label: 'Wypadly', value: expired, tone: 'expired' },
	] as const

	return (
		<section className="stats-grid" aria-label="Podsumowanie urzadzen">
			{items.map(item => (
				<article key={item.label} className={`stat-card stat-card--${item.tone}`}>
					<p>{item.label}</p>
					<strong>{item.value}</strong>
				</article>
			))}
		</section>
	)
}
