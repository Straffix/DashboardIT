$ErrorActionPreference = 'Stop'

$workspaceRoot = Split-Path -Parent $PSScriptRoot
$distRoot = Join-Path $workspaceRoot 'apps\web\dist'

if (-not (Test-Path -LiteralPath $distRoot)) {
	throw "Brak katalogu builda React: $distRoot. Uruchom najpierw npm run build:web."
}

$assetsSource = Join-Path $distRoot 'assets'
$assetsTarget = Join-Path $workspaceRoot 'assets'

$filesToSync = @(
	'.htaccess',
	'index.html',
	'dashboard.html',
	'monitor_laptopow.html',
	'nowe_zatrudnienia.html',
	'rezerwacja_obiadow.html',
	'notatnik.html',
	'wymiana_sprzetu.html',
	'legacy-route-redirect.js'
)

foreach ($relativeFile in $filesToSync) {
	$sourcePath = Join-Path $distRoot $relativeFile
	if (-not (Test-Path -LiteralPath $sourcePath)) {
		throw "Brakuje pliku w buildzie React: $sourcePath"
	}

	$targetPath = Join-Path $workspaceRoot $relativeFile
	Copy-Item -LiteralPath $sourcePath -Destination $targetPath -Force
}

if (-not (Test-Path -LiteralPath $assetsSource)) {
	throw "Brak katalogu assets w buildzie React: $assetsSource"
}

if (Test-Path -LiteralPath $assetsTarget) {
	Remove-Item -LiteralPath $assetsTarget -Recurse -Force
}

Copy-Item -LiteralPath $assetsSource -Destination $assetsTarget -Recurse -Force

Write-Output 'Root deployment files synchronized from apps/web/dist.'
