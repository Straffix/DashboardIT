type MigrationPlaceholderProps = {
	moduleName: string
	sourceFiles: string[]
	nextFocus: string
}

export function MigrationPlaceholder({ moduleName, sourceFiles, nextFocus }: MigrationPlaceholderProps) {
	return (
		<section className="placeholder-card">
			<div className="placeholder-card__badge">Do przeniesienia</div>
			<h3>{moduleName}</h3>
			<p>
				Ten ekran jest jeszcze placeholderem, ale ma juz swoja trase w React Router. Przy kolejnej iteracji
				przeniesiemy logike i UI z aktualnych plikow z vanilla JS.
			</p>
			<div className="placeholder-card__grid">
				<div>
					<strong>Zrodla</strong>
					<ul>
						{sourceFiles.map(file => (
							<li key={file}>{file}</li>
						))}
					</ul>
				</div>
				<div>
					<strong>Nastepny krok</strong>
					<p>{nextFocus}</p>
				</div>
			</div>
		</section>
	)
}
