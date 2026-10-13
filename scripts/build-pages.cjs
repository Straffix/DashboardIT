const fs = require('node:fs')
const path = require('node:path')

const workspaceRoot = path.resolve(__dirname, '..')
const outputRoot = path.join(workspaceRoot, '_site')
const relativeOutput = path.relative(workspaceRoot, outputRoot)
if (!relativeOutput || relativeOutput.startsWith('..') || path.isAbsolute(relativeOutput)) {
	throw new Error('Katalog publikacji musi znajdować się wewnątrz projektu.')
}

const entries = [
	'index.html', 'dashboard.html', 'monitor_laptopow.html', 'nowe_zatrudnienia.html',
	'wymiana_sprzetu.html', 'rezerwacja_obiadow.html', 'notatnik.html',
	'js', 'styles/css', 'img', 'font', '.nojekyll',
]

// Validate the complete source before replacing the previous publication output.
for (const entry of entries) {
	if (!fs.existsSync(path.join(workspaceRoot, entry))) {
		throw new Error(`Brak pliku lub katalogu strony: ${entry}`)
	}
}

fs.rmSync(outputRoot, { recursive: true, force: true })
fs.mkdirSync(outputRoot, { recursive: true })
for (const entry of entries) {
	fs.cpSync(path.join(workspaceRoot, entry), path.join(outputRoot, entry), { recursive: true, dereference: true })
}

console.log('Pliki GitHub Pages przygotowane w _site/.')
