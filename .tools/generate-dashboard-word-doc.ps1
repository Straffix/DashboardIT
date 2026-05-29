$ErrorActionPreference = 'Stop'

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$projectRoot = Split-Path -Parent $PSScriptRoot
$outputFileName = 'DashboardIT_Dokumentacja_Projektu.docx'
$outputPath = Join-Path $projectRoot $outputFileName
$generatedAt = Get-Date

function Get-NormalizedRelativePath {
	param(
		[Parameter(Mandatory = $true)]
		[string] $BasePath,
		[Parameter(Mandatory = $true)]
		[string] $TargetPath
	)

	$base = [System.IO.Path]::GetFullPath($BasePath)
	$target = [System.IO.Path]::GetFullPath($TargetPath)
	$baseUri = New-Object System.Uri(($base.TrimEnd('\', '/') + [System.IO.Path]::DirectorySeparatorChar))
	$targetUri = New-Object System.Uri($target)
	$relative = [System.Uri]::UnescapeDataString($baseUri.MakeRelativeUri($targetUri).ToString())
	return ($relative -replace '\\', '/').Trim()
}

function Test-ExcludedRelativePath {
	param(
		[Parameter(Mandatory = $true)]
		[string] $RelativePath
	)

	if ([string]::IsNullOrWhiteSpace($RelativePath)) {
		return $false
	}

	return (
		$RelativePath -eq '.git' -or
		$RelativePath -like '.git/*' -or
		$RelativePath -eq '.tools' -or
		$RelativePath -like '.tools/*' -or
		$RelativePath -eq $outputFileName
	)
}

function Escape-XmlText {
	param(
		[string] $Text
	)

	if ($null -eq $Text) {
		return ''
	}

	return ([System.Security.SecurityElement]::Escape([string] $Text) -replace "`r?`n", '&#10;')
}

function New-RunXml {
	param(
		[string] $Text,
		[switch] $Bold,
		[switch] $Italic
	)

	$runProperties = New-Object System.Text.StringBuilder
	if ($Bold) {
		[void] $runProperties.Append('<w:b/>')
	}
	if ($Italic) {
		[void] $runProperties.Append('<w:i/>')
	}

	$propertiesXml = ''
	if ($runProperties.Length -gt 0) {
		$propertiesXml = "<w:rPr>$($runProperties.ToString())</w:rPr>"
	}

	$escapedText = Escape-XmlText $Text
	return "<w:r>$propertiesXml<w:t xml:space=""preserve"">$escapedText</w:t></w:r>"
}

$documentBody = New-Object System.Text.StringBuilder

function Add-ParagraphXml {
	param(
		[string] $Text,
		[string] $Style = 'Normal'
	)

	$runXml = New-RunXml -Text $Text
	[void] $script:documentBody.Append("<w:p><w:pPr><w:pStyle w:val=""$Style""/></w:pPr>$runXml</w:p>")
}

function Add-ParagraphRunsXml {
	param(
		[array] $Runs,
		[string] $Style = 'Normal'
	)

	$runXml = New-Object System.Text.StringBuilder
	foreach ($run in $Runs) {
		[void] $runXml.Append((New-RunXml -Text $run.Text -Bold:([bool] $run.Bold) -Italic:([bool] $run.Italic)))
	}

	[void] $script:documentBody.Append("<w:p><w:pPr><w:pStyle w:val=""$Style""/></w:pPr>$($runXml.ToString())</w:p>")
}

function Add-BlankParagraphXml {
	[void] $script:documentBody.Append('<w:p/>')
}

function Add-PageBreakXml {
	[void] $script:documentBody.Append('<w:p><w:r><w:br w:type="page"/></w:r></w:p>')
}

function Add-TocFieldXml {
	Add-ParagraphXml -Text 'Spis tresci' -Style 'TOCHeading'
	$placeholderRun = New-RunXml -Text 'Spis tresci zostanie odswiezony po otwarciu pliku w Wordzie.'
	$instruction = ' TOC \o "1-3" \h \z \u '
	[void] $script:documentBody.Append(
		"<w:p>" +
		"<w:r><w:fldChar w:fldCharType=""begin""/></w:r>" +
		"<w:r><w:instrText xml:space=""preserve"">$instruction</w:instrText></w:r>" +
		"<w:r><w:fldChar w:fldCharType=""separate""/></w:r>" +
		$placeholderRun +
		"<w:r><w:fldChar w:fldCharType=""end""/></w:r>" +
		"</w:p>"
	)
}

function Convert-FileStemToLabel {
	param(
		[string] $Stem
	)

	$normalized = $Stem -replace '\.svg$', ''
	$normalized = $normalized -replace '[-_]+', ' '
	return $normalized.Trim()
}

$directoryDescriptions = @{
	'api' = 'Backend PHP i glowne endpointy API odpowiedzialne za logowanie, sesje oraz zapis danych do PostgreSQL.'
	'api/auth' = 'Dedykowane endpointy autoryzacji, profilu oraz administracji kontami uzytkownikow.'
	'api/config' = 'Konfiguracja backendu i pliki pomocnicze; dane wrazliwe nie powinny byc przechowywane w repo.'
	'api/sql' = 'Skrypty SQL do zalozenia i wyczyszczenia struktury bazy PostgreSQL.'
	'font' = 'Lokalne zasoby fontow wykorzystywanych przez interfejs aplikacji.'
	'font/Jura' = 'Rodzina fontu Jura wraz z licencja, README i wersja variable.'
	'font/Jura/static' = 'Statyczne warianty fontu Jura o konkretnych wagach.'
	'font/M_PLUS_U' = 'Rodzina fontu M PLUS U wraz z licencja, README i wersja variable.'
	'font/M_PLUS_U/static' = 'Statyczne warianty fontu M PLUS U o konkretnych wagach.'
	'img' = 'Zasoby graficzne aplikacji.'
	'img/ico' = 'Biblioteka ikon SVG uzywanych w interfejsie i generowanych do app-icons.css.'
	'js' = 'Skrypty JavaScript aplikacji oraz loader runtime.'
	'js/core' = 'Wspolne uslugi domenowe i warstwa komunikacji ze storage/API.'
	'js/pages' = 'Skrypty dedykowane poszczegolnym widokom i modulom.'
	'js/pages/dashboard' = 'Logika strony glownej dashboardu.'
	'js/pages/dashboard/tasks' = 'Planer dzienny i przypomnienia o zadaniach na dashboardzie.'
	'js/pages/exchanges' = 'Logika modulu wymian sprzetu.'
	'js/pages/hires' = 'Logika modulu nowych zatrudnien i onboardingu sprzetowego.'
	'js/pages/lunch' = 'Logika modulu rezerwacji obiadow.'
	'js/pages/monitor' = 'Logika modulu urzadzen w domenie.'
	'js/pages/notes' = 'Logika modulu chatu / notatnika.'
	'js/shared' = 'Wspolne helpery, konfiguracje, auth, UI i router miedzy podstronami.'
	'styles' = 'Warstwa stylow projektu w postaci SCSS i skompilowanego CSS.'
	'styles/css' = 'Gotowe pliki CSS podpinane przez HTML; czesc jest generowana z SCSS.'
	'styles/scss' = 'Zrodla SCSS, palety kolorow i wspolne mixiny layoutowe.'
	'trash' = 'Katalog roboczy na artefakty diagnostyczne i tymczasowe; nie powinien trafic do deployu.'
	'trash/edge-softnav-check-lunch' = 'Artefakty lokalnych testow Edge dla soft navigation w module lunch.'
	'trash/edge-softnav-check-lunch/component_crx_cache' = 'Cache komponentow Edge utworzony podczas testu.'
	'trash/edge-softnav-check-lunch/Crashpad' = 'Logi i metadane Crashpad dla sesji testowej Edge.'
	'trash/edge-softnav-check-lunch/Crashpad/attachments' = 'Miejsce na zalaczniki crash reportow; obecnie puste.'
	'trash/edge-softnav-check-lunch/Crashpad/reports' = 'Zrzuty awarii Crashpad zapisane podczas testu.'
	'trash/edge-softnav-check-notes' = 'Artefakty lokalnych testow Edge dla soft navigation w module notes.'
	'trash/edge-softnav-check-notes/component_crx_cache' = 'Cache komponentow Edge utworzony podczas testu.'
	'trash/edge-softnav-check-notes/Crashpad' = 'Logi i metadane Crashpad dla sesji testowej Edge.'
	'trash/edge-softnav-check-notes/Crashpad/attachments' = 'Miejsce na zalaczniki crash reportow; obecnie puste.'
	'trash/edge-softnav-check-notes/Crashpad/reports' = 'Zrzuty awarii Crashpad zapisane podczas testu.'
}

$fileDescriptions = @{
	'.gitignore' = 'Lista plikow i katalogow pomijanych przez Git, m.in. node_modules, trash i lokalna konfiguracja bazy.'
	'.mailmap' = 'Mapowanie aliasow autora commitow na jedna, docelowa tozsamosc Git.'
	'dashboard.html' = 'Powloka modulowa; laduje moduly operacyjne i obsluguje soft navigation bez pelnego przeladowania.'
	'dev-server.js' = 'Prosty lokalny serwer HTTP do podgladu projektu w czasie developmentu.'
	'eslint.config.js' = 'Konfiguracja ESLint dla skryptow JavaScript w katalogu js.'
	'generate-icon-css.js' = 'Generator pliku app-icons.css na podstawie SVG z katalogu img/ico.'
	'index.html' = 'Strona glowna dashboardu z widgetami, menu modulow, pogoda, zegarem i planerem.'
	'monitor_laptopow.html' = 'Widok modulu "Urzadzenia w domenie".'
	'notatnik.html' = 'Widok modulu chatu / notatnika zespolowego.'
	'nowe_zatrudnienia.html' = 'Widok modulu nowych zatrudnien i przygotowania sprzetu.'
	'package.json' = 'Skrypty npm i zaleznosci developerskie potrzebne do stylow, lintingu i lokalnego startu.'
	'panel-check.png' = 'Obraz referencyjny / kontrolny zapisany podczas sprawdzania wygladu panelu.'
	'rezerwacja_obiadow.html' = 'Widok modulu rezerwacji obiadow.'
	'service-worker.js' = 'Root shim service workera; przekazuje obsluge do js/service-worker.js, zachowujac zasieg dla calej aplikacji.'
	'wymiana_sprzetu.html' = 'Widok modulu planowania wymiany sprzetu.'
	'api/health.php' = 'Endpoint health check sprawdzajacy dostepnosc backendu i polaczenia z baza.'
	'api/reset-app-data.php' = 'Jednorazowy endpoint czyszczacy dane aplikacji na podstawie konfiguracji resetu.'
	'api/storage.php' = 'Generyczny endpoint odczytu, zapisu i kasowania wspoldzielonych kolekcji danych.'
	'api/_auth.php' = 'Wspolne funkcje auth: sesje PHP, role, uprawnienia, rate limiting logowania i obsluga profilu.'
	'api/_response.php' = 'Helpery do odpowiedzi JSON i odczytu body z requestu.'
	'api/_store.php' = 'Najwieksza warstwa backendu: konfiguracja PostgreSQL, schema bootstrap oraz mapowanie kolekcji na tabele.'
	'api/auth/access.php' = 'Endpoint administratora do zmiany roli, loginu i uprawnien innego uzytkownika.'
	'api/auth/delete.php' = 'Endpoint administratora do usuwania kont uzytkownikow.'
	'api/auth/login.php' = 'Endpoint logowania; sprawdza haslo i zaklada sesje serwerowa.'
	'api/auth/password.php' = 'Endpoint zmiany hasla zalogowanego uzytkownika.'
	'api/auth/profile.php' = 'Endpoint aktualizacji publicznych danych profilu zalogowanego uzytkownika.'
	'api/auth/register.php' = 'Endpoint rejestracji nowego konta; pierwszy uzytkownik otrzymuje role admin.'
	'api/auth/session.php' = 'Endpoint odczytu biezacej sesji oraz wylogowania.'
	'api/auth/users.php' = 'Endpoint zwracajacy liste uzytkownikow po sanitizacji danych wrazliwych.'
	'api/config/.htaccess' = 'Regula serwera blokujaca bezposredni dostep HTTP do plikow konfiguracyjnych.'
	'api/config/database.example.php' = 'Przykladowy plik konfiguracyjny dla polaczenia z PostgreSQL.'
	'api/config/users.json' = 'Publiczny eksport / overlay metadanych uzytkownikow; bez hasel i hashy.'
	'api/sql/dashboard-reset.sql' = 'Skrypt SQL czyszczacy dane aplikacji i resetujacy sekwencje.'
	'api/sql/dashboard-schema.sql' = 'Skrypt SQL z definicja tabel, indeksow i ograniczen dla PostgreSQL.'
	'js/script.js' = 'Glowne wejscie frontendu; laduje wspolne skrypty i skrypty dla aktywnej strony.'
	'js/service-worker.js' = 'Wlasciwa logika service workera do obslugi klikniec w powiadomienia o zadaniach.'
	'js/core/domain-services.js' = 'Warstwa domenowa dla lunchu, notatek i zadan, oparta o storageService.'
	'js/core/storage-service.js' = 'Abstrakcja zapisu danych: localStorage, fallback browser-only oraz komunikacja z backendem.'
	'js/shared/auth.js' = 'Frontendowa logika logowania, sesji, profilu, roli administratora i panelu uzytkownika.'
	'js/shared/base.js' = 'Bazowa konfiguracja aplikacji, helpery formatowania, ikony, month picker i dialog potwierdzen.'
	'js/shared/global-ui.js' = 'Wspolne zachowania UI: motywy, obecni uzytkownicy, slot panelu usera i drobne interakcje globalne.'
	'js/shared/page-router.js' = 'Soft router podmieniajacy modulowe widoki bez pelnego przeladowania strony.'
	'js/shared/public-api.js' = 'Publiczna fasada AppUtils wystawiajaca helpery i auth do pozostalych skryptow.'
	'js/shared/runtime-config.js' = 'Konfiguracja runtime dla backendu, one-time resetu i lokalnego fallbacku Live Server.'
	'js/pages/dashboard/bookmarks.js' = 'Obsluga zakladek uzytkownika na stronie glownej wraz z modalem edycji.'
	'js/pages/dashboard/clock.js' = 'Kontroler zegara analogowego/cyfrowego i sygnalu zmiany dnia.'
	'js/pages/dashboard/index.js' = 'Inicializacja strony glownej i spinanie widgetow dashboardu.'
	'js/pages/dashboard/topbar.js' = 'Drobna logika topbaru, np. przewiniecie do siatki modulow.'
	'js/pages/dashboard/weather.js' = 'Widget pogody z geolokalizacja, forecastem i integracja z zewnetrznymi API pogodowymi.'
	'js/pages/dashboard/tasks/planner.js' = 'Planer dnia, kalendarz zadan, agenda oraz integracja z przypomnieniami.'
	'js/pages/dashboard/tasks/reminders.js' = 'Powiadomienia systemowe i dzwieki przypomnien o zadaniach, z wykorzystaniem service workera.'
	'js/pages/exchanges/index.js' = 'Glowne zachowanie modulu wymiany sprzetu: tabela, formularz, import i eksport Excel.'
	'js/pages/hires/index.js' = 'Glowne zachowanie modulu nowych zatrudnien: lista onboardingow, akcesoria, import i eksport Excel.'
	'js/pages/lunch/index.js' = 'Glowne zachowanie modulu rezerwacji obiadow: sloty, zajetosc i rezerwacje uzytkownika.'
	'js/pages/monitor/index.js' = 'Glowne zachowanie modulu urzadzen w domenie: tabela, formularz, deduplikacja, import i eksport Excel.'
	'js/pages/notes/index.js' = 'Glowne zachowanie modulu chatu: wiadomosci, przypiecia, obecni uzytkownicy i tryb edycji.'
	'styles/css/app-icons.css' = 'Wygenerowany plik CSS mapujacy SVG na klasy ikon aplikacji.'
	'styles/css/dashboard.css' = 'Skompilowany CSS dla strony glownej dashboardu.'
	'styles/css/lunch.css' = 'Skompilowany CSS dla modulu lunch.'
	'styles/css/monitor.css' = 'Skompilowany CSS dla modulu urzadzen w domenie.'
	'styles/css/notes.css' = 'Skompilowany CSS dla modulu chatu / notatnika.'
	'styles/css/style.css' = 'Glowne skompilowane style wspolne dla shella aplikacji.'
	'styles/css/wymiany.css' = 'Skompilowany CSS dla modulu wymian sprzetu.'
	'styles/css/zatrudnienia.css' = 'Skompilowany CSS dla modulu nowych zatrudnien.'
	'styles/scss/dashboard.scss' = 'Zrodlowy SCSS strony glownej dashboardu.'
	'styles/scss/lunch.scss' = 'Zrodlowy SCSS modulu lunch.'
	'styles/scss/monitor.scss' = 'Zrodlowy SCSS modulu urzadzen w domenie.'
	'styles/scss/notes.scss' = 'Zrodlowy SCSS modulu chatu / notatnika.'
	'styles/scss/style.scss' = 'Glowne zrodlo SCSS wspolne dla shella i elementow bazowych.'
	'styles/scss/wymiany.scss' = 'Zrodlowy SCSS modulu wymian sprzetu.'
	'styles/scss/zatrudnienia.scss' = 'Zrodlowy SCSS modulu nowych zatrudnien.'
	'styles/scss/_blush-colors.scss' = 'Paleta kolorow dla motywu blush / rossmann.'
	'styles/scss/_colors-dark.scss' = 'Zmienne kolorystyczne dla motywu ciemnego.'
	'styles/scss/_colors.scss' = 'Warstwa laczaca i eksportujaca bazowe zmienne kolorystyczne.'
	'styles/scss/_large.scss' = 'Responsive overrides dla bardzo duzych ekranow.'
	'styles/scss/_light-colors.scss' = 'Paleta kolorow dla motywu jasnego.'
	'styles/scss/_medium.scss' = 'Responsive overrides dla srednich szerokosci ekranu.'
	'styles/scss/_workspace.scss' = 'Wspolne mixiny i struktura layoutu dla workspace / drawerow modulow.'
}

function Get-DirectoryDescription {
	param(
		[Parameter(Mandatory = $true)]
		[string] $RelativePath
	)

	if ($directoryDescriptions.ContainsKey($RelativePath)) {
		return $directoryDescriptions[$RelativePath]
	}

	return 'Podkatalog projektu wykorzystywany przez aplikacje lub proces developmentu.'
}

function Get-FileDescription {
	param(
		[Parameter(Mandatory = $true)]
		[string] $RelativePath
	)

	if ($fileDescriptions.ContainsKey($RelativePath)) {
		return $fileDescriptions[$RelativePath]
	}

	if ($RelativePath -match '^styles/css/(.+)\.css\.map$') {
		return "Source map dla skompilowanego pliku CSS '$($Matches[1]).css'."
	}

	if ($RelativePath -match '^font/Jura/(README\.txt|OFL\.txt)$') {
		if ($Matches[1] -eq 'README.txt') {
			return 'README dostarczony razem z fontem Jura.'
		}
		return 'Licencja OFL dla fontu Jura.'
	}

	if ($RelativePath -match '^font/M_PLUS_U/(README\.txt|OFL\.txt)$') {
		if ($Matches[1] -eq 'README.txt') {
			return 'README dostarczony razem z fontem M PLUS U.'
		}
		return 'Licencja OFL dla fontu M PLUS U.'
	}

	if ($RelativePath -match '^font/Jura/Jura-VariableFont_wght\.ttf$') {
		return 'Variable font Jura obejmujacy wiele wag w jednym pliku.'
	}

	if ($RelativePath -match '^font/M_PLUS_U/MPLUSU-VariableFont_wght\.ttf$') {
		return 'Variable font M PLUS U obejmujacy wiele wag w jednym pliku.'
	}

	if ($RelativePath -match '^font/Jura/static/Jura-(.+)\.ttf$') {
		return "Statyczny plik fontu Jura w wariancie '$($Matches[1])'."
	}

	if ($RelativePath -match '^font/M_PLUS_U/static/MPLUSU-(.+)\.ttf$') {
		return "Statyczny plik fontu M PLUS U w wariancie '$($Matches[1])'."
	}

	if ($RelativePath -match '^img/ico/(.+)\.svg$') {
		$label = Convert-FileStemToLabel $Matches[1]
		return "Pojedynczy asset SVG ikony '$label' wykorzystywany przez system ikon interfejsu."
	}

	if ($RelativePath -match '^trash/.+/Crashpad/reports/.+\.dmp$') {
		return 'Zrzut awarii Crashpad zapisany podczas lokalnych testow przegladarki.'
	}

	if ($RelativePath -match '^trash/.+/Crashpad/(settings\.dat|throttle_store\.dat|metadata)$') {
		return "Plik techniczny Crashpad ('$($Matches[1])') utworzony przez Edge podczas testow."
	}

	if ($RelativePath -match '^trash/.+/Edge-Local-State-.+\.tmp$') {
		return 'Tymczasowy plik stanu przegladarki Edge zapisany podczas testow.'
	}

	if ($RelativePath -match '^trash/.+/Variations$') {
		return 'Plik wariantow / eksperymentow Edge zapisany podczas testow.'
	}

	return 'Plik pomocniczy projektu.'
}

$inventoryDirectories = Get-ChildItem -Path $projectRoot -Directory -Recurse -Force |
	Where-Object {
		$rel = Get-NormalizedRelativePath -BasePath $projectRoot -TargetPath $_.FullName
		-not (Test-ExcludedRelativePath -RelativePath $rel)
	} |
	Sort-Object {
		(Get-NormalizedRelativePath -BasePath $projectRoot -TargetPath $_.FullName)
	}

$inventoryFiles = Get-ChildItem -Path $projectRoot -File -Recurse -Force |
	Where-Object {
		$rel = Get-NormalizedRelativePath -BasePath $projectRoot -TargetPath $_.FullName
		-not (Test-ExcludedRelativePath -RelativePath $rel)
	} |
	Sort-Object {
		(Get-NormalizedRelativePath -BasePath $projectRoot -TargetPath $_.FullName)
	}

$allDirectoryRecords = @{}
foreach ($dir in $inventoryDirectories) {
	$relativePath = Get-NormalizedRelativePath -BasePath $projectRoot -TargetPath $dir.FullName
	$allDirectoryRecords[$relativePath] = [PSCustomObject]@{
		RelativePath = $relativePath
		FullName = $dir.FullName
	}
}

$allFileRecords = @{}
foreach ($file in $inventoryFiles) {
	$relativePath = Get-NormalizedRelativePath -BasePath $projectRoot -TargetPath $file.FullName
	$allFileRecords[$relativePath] = [PSCustomObject]@{
		RelativePath = $relativePath
		FullName = $file.FullName
		Name = $file.Name
	}
}

function Get-DirectChildFiles {
	param(
		[string] $RelativeDirectory
	)

	$prefix = if ([string]::IsNullOrEmpty($RelativeDirectory)) { '' } else { "$RelativeDirectory/" }
	return $allFileRecords.Values |
		Where-Object {
			if ($prefix -eq '') {
				return $_.RelativePath -notlike '*/*'
			}

			$_.RelativePath.StartsWith($prefix) -and
				$_.RelativePath.Substring($prefix.Length) -notlike '*/*'
		} |
		Sort-Object RelativePath
}

function Get-DirectChildDirectories {
	param(
		[string] $RelativeDirectory
	)

	$prefix = if ([string]::IsNullOrEmpty($RelativeDirectory)) { '' } else { "$RelativeDirectory/" }
	return $allDirectoryRecords.Values |
		Where-Object {
			if ($prefix -eq '') {
				return $_.RelativePath -notlike '*/*'
			}

			$_.RelativePath.StartsWith($prefix) -and
				$_.RelativePath.Substring($prefix.Length) -notlike '*/*'
		} |
		Sort-Object RelativePath
}

function Add-DirectorySectionXml {
	param(
		[Parameter(Mandatory = $true)]
		[string] $RelativeDirectory,
		[int] $Depth = 0
	)

	$style = switch ($Depth) {
		0 { 'Heading1' }
		1 { 'Heading2' }
		default { 'Heading3' }
	}

	Add-ParagraphXml -Text $RelativeDirectory -Style $style
	Add-ParagraphXml -Text (Get-DirectoryDescription -RelativePath $RelativeDirectory)

	$childFiles = Get-DirectChildFiles -RelativeDirectory $RelativeDirectory
	foreach ($file in $childFiles) {
		Add-ParagraphRunsXml -Runs @(
			@{ Text = "$($file.RelativePath) - "; Bold = $true; Italic = $false },
			@{ Text = (Get-FileDescription -RelativePath $file.RelativePath); Bold = $false; Italic = $false }
		)
	}

	$childDirs = Get-DirectChildDirectories -RelativeDirectory $RelativeDirectory
	foreach ($directory in $childDirs) {
		Add-DirectorySectionXml -RelativeDirectory $directory.RelativePath -Depth ($Depth + 1)
	}
}

$projectFileCount = $inventoryFiles.Count
$projectDirectoryCount = $inventoryDirectories.Count

Add-ParagraphXml -Text 'DashboardIT - dokumentacja projektu i infrastruktury' -Style 'Title'
Add-ParagraphXml -Text "Wygenerowano: $($generatedAt.ToString('yyyy-MM-dd HH:mm'))" -Style 'Subtitle'
Add-ParagraphXml -Text "Zakres dokumentu: $projectFileCount plikow i $projectDirectoryCount katalogow projektowych (z pominieciem .git oraz generatora dokumentu)." -Style 'Normal'

Add-BlankParagraphXml
Add-TocFieldXml
Add-PageBreakXml

Add-ParagraphXml -Text 'Cel dokumentu' -Style 'Heading1'
Add-ParagraphXml -Text 'Ten dokument zbiera w jednym miejscu opis technologii projektu DashboardIT, minimalne potrzeby infrastrukturalne oraz inwentaryzacje folderow i plikow do poziomu pojedynczego pliku.'

Add-ParagraphXml -Text 'Krotkie podsumowanie projektu' -Style 'Heading1'
Add-ParagraphXml -Text 'DashboardIT jest aplikacja webowa dla jednego dzialu. Frontend zostal napisany w HTML, CSS/SCSS i Vanilla JavaScript, a backend w PHP. Dane wspoldzielone i konta uzytkownikow sa przygotowane do pracy z baza PostgreSQL.'
Add-ParagraphXml -Text 'W praktyce oznacza to, ze aplikacja nie jest tylko paczka statycznych plikow HTML. Zeby dzialala w trybie zespolowym, potrzebuje serwera WWW z obsluga PHP oraz bazy PostgreSQL.'

Add-ParagraphXml -Text 'Co wiadomo na pewno na dzis' -Style 'Heading1'
Add-ParagraphXml -Text '1. Serwer WWW: obecnie projekt daje sie wdrozyc przez wrzucenie plikow na serwer, ale w firmie serwer musi obslugiwac PHP, bo sama warstwa HTML/CSS/JS nie wystarczy do logowania i zapisu danych.'
Add-ParagraphXml -Text '2. Domena / subdomena: potrzebny bedzie osobny firmowy adres, najlepiej jako domena wewnetrzna lub subdomena przypisana do dzialowego narzedzia.'
Add-ParagraphXml -Text '3. Baza danych: projekt jest przygotowany pod PostgreSQL, wiec potrzebne beda dane do polaczenia z firmowa baza: host, port, nazwa bazy, login i haslo.'
Add-ParagraphXml -Text '4. Firmowy GitHub: warto miec repozytorium w firmowym GitHubie do pracy na kodzie, historii zmian i kopii zapasowej samego kodu. Trzeba tylko pamietac, ze backup kodu nie zastapi backupu bazy danych.'

Add-ParagraphXml -Text 'Minimalne potrzeby infrastrukturalne' -Style 'Heading1'
Add-ParagraphXml -Text 'Na start, bez rozbudowywania projektu do duzej architektury enterprise, potrzebne sa nastepujace elementy:'
Add-ParagraphXml -Text '- serwer WWW z obsluga PHP 8.x,'
Add-ParagraphXml -Text '- mozliwosc wdrozenia plikow aplikacji na serwer, najlepiej przez SFTP albo proces z repo,'
Add-ParagraphXml -Text '- baza PostgreSQL,'
Add-ParagraphXml -Text '- firmowa domena lub subdomena z HTTPS,'
Add-ParagraphXml -Text '- dostep do firmowego GitHuba,'
Add-ParagraphXml -Text '- backup bazy danych,'
Add-ParagraphXml -Text '- najlepiej ograniczenie dostepu do sieci firmowej lub VPN, bo z aplikacji ma korzystac tylko jeden dzial.'

Add-ParagraphXml -Text 'Uwagi funkcjonalne i bezpieczenstwa' -Style 'Heading1'
Add-ParagraphXml -Text 'W przegladarce aplikacja wykorzystuje m.in. powiadomienia systemowe do przypomnien o zadaniach, service worker do obslugi klikniec w te powiadomienia oraz geolokalizacje tylko dla modulu pogody.'
Add-ParagraphXml -Text 'W katalogu projektu sa tez artefakty developerskie i diagnostyczne, np. pliki w trash oraz lokalne skrypty buildowe. Nie sa one wymagane do samego uruchomienia aplikacji na serwerze, ale pomagaja w rozwoju i utrzymaniu projektu.'

Add-PageBreakXml

Add-ParagraphXml -Text 'Inwentaryzacja projektu' -Style 'Heading1'
Add-ParagraphXml -Text 'Ponizsza sekcja opisuje wszystkie projektowe foldery i pliki znalezione w repozytorium, z pominieciem katalogu .git oraz generatora tego dokumentu.'

Add-ParagraphXml -Text 'Pliki glowne w katalogu root' -Style 'Heading2'
Add-ParagraphXml -Text 'Sa to glowne pliki startowe, konfiguracyjne i pomocnicze znajdujace sie bezposrednio w katalogu projektu.'
$rootFiles = Get-DirectChildFiles -RelativeDirectory ''
foreach ($file in $rootFiles) {
	Add-ParagraphRunsXml -Runs @(
		@{ Text = "$($file.RelativePath) - "; Bold = $true; Italic = $false },
		@{ Text = (Get-FileDescription -RelativePath $file.RelativePath); Bold = $false; Italic = $false }
	)
}

$rootDirectories = Get-DirectChildDirectories -RelativeDirectory ''
foreach ($directory in $rootDirectories) {
	Add-DirectorySectionXml -RelativeDirectory $directory.RelativePath -Depth 0
}

$documentXml = @"
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:wpc="http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas"
	xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006"
	xmlns:o="urn:schemas-microsoft-com:office:office"
	xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
	xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math"
	xmlns:v="urn:schemas-microsoft-com:vml"
	xmlns:wp14="http://schemas.microsoft.com/office/word/2010/wordprocessingDrawing"
	xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"
	xmlns:w10="urn:schemas-microsoft-com:office:word"
	xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
	xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml"
	xmlns:w15="http://schemas.microsoft.com/office/word/2012/wordml"
	xmlns:wpg="http://schemas.microsoft.com/office/word/2010/wordprocessingGroup"
	xmlns:wpi="http://schemas.microsoft.com/office/word/2010/wordprocessingInk"
	xmlns:wne="http://schemas.microsoft.com/office/2006/wordml"
	xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape"
	mc:Ignorable="w14 w15 wp14">
	<w:body>
		$($documentBody.ToString())
		<w:sectPr>
			<w:pgSz w:w="11906" w:h="16838"/>
			<w:pgMar w:top="1440" w:right="1080" w:bottom="1440" w:left="1080" w:header="708" w:footer="708" w:gutter="0"/>
		</w:sectPr>
	</w:body>
</w:document>
"@

$stylesXml = @"
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
	<w:docDefaults>
		<w:rPrDefault>
			<w:rPr>
				<w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:eastAsia="Calibri" w:cs="Calibri"/>
				<w:sz w:val="22"/>
				<w:szCs w:val="22"/>
				<w:lang w:val="pl-PL"/>
			</w:rPr>
		</w:rPrDefault>
		<w:pPrDefault>
			<w:pPr>
				<w:spacing w:after="160" w:line="276" w:lineRule="auto"/>
			</w:pPr>
		</w:pPrDefault>
	</w:docDefaults>
	<w:style w:type="paragraph" w:default="1" w:styleId="Normal">
		<w:name w:val="Normal"/>
		<w:qFormat/>
	</w:style>
	<w:style w:type="paragraph" w:styleId="Title">
		<w:name w:val="Title"/>
		<w:basedOn w:val="Normal"/>
		<w:next w:val="Normal"/>
		<w:qFormat/>
		<w:pPr>
			<w:spacing w:before="0" w:after="240"/>
		</w:pPr>
		<w:rPr>
			<w:b/>
			<w:sz w:val="34"/>
			<w:szCs w:val="34"/>
		</w:rPr>
	</w:style>
	<w:style w:type="paragraph" w:styleId="Subtitle">
		<w:name w:val="Subtitle"/>
		<w:basedOn w:val="Normal"/>
		<w:next w:val="Normal"/>
		<w:qFormat/>
		<w:rPr>
			<w:color w:val="666666"/>
			<w:sz w:val="20"/>
			<w:szCs w:val="20"/>
		</w:rPr>
	</w:style>
	<w:style w:type="paragraph" w:styleId="Heading1">
		<w:name w:val="heading 1"/>
		<w:basedOn w:val="Normal"/>
		<w:next w:val="Normal"/>
		<w:uiPriority w:val="9"/>
		<w:qFormat/>
		<w:pPr>
			<w:spacing w:before="320" w:after="120"/>
			<w:outlineLvl w:val="0"/>
		</w:pPr>
		<w:rPr>
			<w:b/>
			<w:sz w:val="30"/>
			<w:szCs w:val="30"/>
		</w:rPr>
	</w:style>
	<w:style w:type="paragraph" w:styleId="Heading2">
		<w:name w:val="heading 2"/>
		<w:basedOn w:val="Normal"/>
		<w:next w:val="Normal"/>
		<w:uiPriority w:val="9"/>
		<w:qFormat/>
		<w:pPr>
			<w:spacing w:before="260" w:after="100"/>
			<w:outlineLvl w:val="1"/>
		</w:pPr>
		<w:rPr>
			<w:b/>
			<w:sz w:val="26"/>
			<w:szCs w:val="26"/>
		</w:rPr>
	</w:style>
	<w:style w:type="paragraph" w:styleId="Heading3">
		<w:name w:val="heading 3"/>
		<w:basedOn w:val="Normal"/>
		<w:next w:val="Normal"/>
		<w:uiPriority w:val="9"/>
		<w:qFormat/>
		<w:pPr>
			<w:spacing w:before="220" w:after="80"/>
			<w:outlineLvl w:val="2"/>
		</w:pPr>
		<w:rPr>
			<w:b/>
			<w:sz w:val="24"/>
			<w:szCs w:val="24"/>
		</w:rPr>
	</w:style>
	<w:style w:type="paragraph" w:styleId="TOCHeading">
		<w:name w:val="TOC Heading"/>
		<w:basedOn w:val="Heading1"/>
		<w:next w:val="Normal"/>
		<w:qFormat/>
	</w:style>
</w:styles>
"@

$settingsXml = @"
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:settings xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
	<w:updateFields w:val="true"/>
	<w:zoom w:percent="100"/>
</w:settings>
"@

$contentTypesXml = @"
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
	<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
	<Default Extension="xml" ContentType="application/xml"/>
	<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
	<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
	<Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/>
	<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
	<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>
"@

$rootRelsXml = @"
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
	<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
	<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
	<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>
"@

$documentRelsXml = @"
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
	<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
	<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings" Target="settings.xml"/>
</Relationships>
"@

$coreXml = @"
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties"
	xmlns:dc="http://purl.org/dc/elements/1.1/"
	xmlns:dcterms="http://purl.org/dc/terms/"
	xmlns:dcmitype="http://purl.org/dc/dcmitype/"
	xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
	<dc:title>DashboardIT - dokumentacja projektu i infrastruktury</dc:title>
	<dc:subject>Dokumentacja techniczna projektu DashboardIT</dc:subject>
	<dc:creator>OpenAI Codex</dc:creator>
	<cp:keywords>DashboardIT, dokumentacja, Word, projekt</cp:keywords>
	<dc:description>Opis technologii, potrzeb infrastrukturalnych oraz inwentaryzacja plikow projektu DashboardIT.</dc:description>
	<cp:lastModifiedBy>OpenAI Codex</cp:lastModifiedBy>
	<dcterms:created xsi:type="dcterms:W3CDTF">$($generatedAt.ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ'))</dcterms:created>
	<dcterms:modified xsi:type="dcterms:W3CDTF">$($generatedAt.ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ'))</dcterms:modified>
</cp:coreProperties>
"@

$appXml = @"
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"
	xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
	<Application>Microsoft Office Word</Application>
	<DocSecurity>0</DocSecurity>
	<ScaleCrop>false</ScaleCrop>
	<HeadingPairs>
		<vt:vector size="2" baseType="variant">
			<vt:variant><vt:lpstr>Title</vt:lpstr></vt:variant>
			<vt:variant><vt:i4>1</vt:i4></vt:variant>
		</vt:vector>
	</HeadingPairs>
	<TitlesOfParts>
		<vt:vector size="1" baseType="lpstr">
			<vt:lpstr>DashboardIT - dokumentacja projektu i infrastruktury</vt:lpstr>
		</vt:vector>
	</TitlesOfParts>
	<Company></Company>
	<LinksUpToDate>false</LinksUpToDate>
	<SharedDoc>false</SharedDoc>
	<HyperlinksChanged>false</HyperlinksChanged>
	<AppVersion>16.0000</AppVersion>
</Properties>
"@

function Add-ZipTextEntry {
	param(
		[Parameter(Mandatory = $true)]
		[System.IO.Compression.ZipArchive] $Archive,
		[Parameter(Mandatory = $true)]
		[string] $EntryName,
		[Parameter(Mandatory = $true)]
		[string] $Content
	)

	$entry = $Archive.CreateEntry($EntryName, [System.IO.Compression.CompressionLevel]::Optimal)
	$stream = $entry.Open()
	$writer = New-Object System.IO.StreamWriter($stream, (New-Object System.Text.UTF8Encoding($false)))
	try {
		$writer.Write($Content)
	} finally {
		$writer.Dispose()
	}
}

if (Test-Path $outputPath) {
	Remove-Item -LiteralPath $outputPath -Force
}

Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$fileStream = [System.IO.File]::Open($outputPath, [System.IO.FileMode]::CreateNew)
try {
	$zip = New-Object System.IO.Compression.ZipArchive($fileStream, [System.IO.Compression.ZipArchiveMode]::Create, $false)
	try {
		Add-ZipTextEntry -Archive $zip -EntryName '[Content_Types].xml' -Content $contentTypesXml
		Add-ZipTextEntry -Archive $zip -EntryName '_rels/.rels' -Content $rootRelsXml
		Add-ZipTextEntry -Archive $zip -EntryName 'docProps/core.xml' -Content $coreXml
		Add-ZipTextEntry -Archive $zip -EntryName 'docProps/app.xml' -Content $appXml
		Add-ZipTextEntry -Archive $zip -EntryName 'word/document.xml' -Content $documentXml
		Add-ZipTextEntry -Archive $zip -EntryName 'word/styles.xml' -Content $stylesXml
		Add-ZipTextEntry -Archive $zip -EntryName 'word/settings.xml' -Content $settingsXml
		Add-ZipTextEntry -Archive $zip -EntryName 'word/_rels/document.xml.rels' -Content $documentRelsXml
	} finally {
		$zip.Dispose()
	}
} finally {
	$fileStream.Dispose()
}

Write-Output "Wygenerowano dokument: $outputPath"
