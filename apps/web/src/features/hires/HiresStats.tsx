type HiresStatsProps = {
	visible: number
	month: number
	laptopReady: number
	monitorReady: number
}

export function HiresStats({ visible, month, laptopReady, monitorReady }: HiresStatsProps) {
	const items = [
		{ label: 'Widoczne', value: visible, tone: 'neutral' },
		{ label: 'W miesiacu', value: month, tone: 'neutral' },
		{ label: 'Laptop gotowy', value: laptopReady, tone: 'active' },
		{ label: 'Monitor gotowy', value: monitorReady, tone: 'active' },
	] as const

	return (
		<section className="stats-grid" aria-label="Podsumowanie nowych zatrudnien">
			{items.map(item => (
				<article key={item.label} className={`stat-card stat-card--${item.tone}`}>
					<p>{item.label}</p>
					<strong>{item.value}</strong>
				</article>
			))}
		</section>
	)
}
