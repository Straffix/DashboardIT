type ExchangeStatsProps = {
	visible: number
	month: number
	pending: number
	done: number
}

export function ExchangeStats({ visible, month, pending, done }: ExchangeStatsProps) {
	const items = [
		{ label: 'Widoczne', value: visible, tone: 'neutral' },
		{ label: 'W miesiacu', value: month, tone: 'neutral' },
		{ label: 'Planowane', value: pending, tone: 'warning' },
		{ label: 'Zakonczone', value: done, tone: 'active' },
	] as const

	return (
		<section className="stats-grid" aria-label="Podsumowanie wymian">
			{items.map(item => (
				<article key={item.label} className={`stat-card stat-card--${item.tone}`}>
					<p>{item.label}</p>
					<strong>{item.value}</strong>
				</article>
			))}
		</section>
	)
}
