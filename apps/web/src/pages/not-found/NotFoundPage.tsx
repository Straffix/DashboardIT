import { Link } from 'react-router-dom'

export function NotFoundPage() {
	return (
		<section className="data-card data-card--empty">
			<h2>Nie ma takiej trasy</h2>
			<p>Ta podstrona nie zostala jeszcze dodana do nowego frontendu React.</p>
			<Link className="button-primary button-link" to="/dashboard">
				Wroc do dashboardu
			</Link>
		</section>
	)
}
