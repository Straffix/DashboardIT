type MigrationPlaceholderProps = {
	moduleName: string
	sourceFiles: string[]
	nextFocus: string
}

export function MigrationPlaceholder({ moduleName, sourceFiles, nextFocus }: MigrationPlaceholderProps) {
	return (
		<section className="placeholder-card">
			<div className="placeholder-card__badge">Szkic widoku</div>
			<h3>{moduleName}</h3>
			<p>
				Ten ekran zachowuje trase i podstawowy opis, dzieki czemu latwiej zaplanowac dalsze rozszerzenia bez
				gubienia kontekstu widoku.
			</p>
			<div className="placeholder-card__grid">
				<div>
					<strong>Materialy</strong>
					<ul>
						{sourceFiles.map(file => (
							<li key={file}>{file}</li>
						))}
					</ul>
				</div>
				<div>
					<strong>Kolejny krok</strong>
					<p>{nextFocus}</p>
				</div>
			</div>
		</section>
	)
}
