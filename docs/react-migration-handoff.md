# React Migration Handoff

Stan na: 2026-07-01

Ten plik ma sluzyc jako szybki handoff do wznowienia pracy z Codexem bez odtwarzania calego kontekstu z czatu.

## Prompt na jutro

Wklej do Codexa:

```text
Pracujemy dalej wedlug docs/react-migration-handoff.md.
Kontynuujemy migracje frontendowej czesci DashboardIT do React.
Backend zostawiamy poza zakresem tej migracji.
Przepisujemy to, co dzis jest w czystym JS, na React.
Zacznij od sekcji "Najblizszy krok" i od razu wdrazaj zmiany w kodzie.
```

## Glowny cel

Przeniesc frontend DashboardIT z legacy HTML + vanilla JS do `React + TypeScript`, tak zeby:

- frontend byl czytelniejszy i latwiejszy w utrzymaniu
- architektura byla latwiejsza do opisania w `HLD`
- zachowania z obecnego frontendowego runtime mogly zostac pozniej podpiete do dowolnego backendu

## Ustalenia projektowe

- Nie zajmujemy sie backendem.
- Nie inwestujemy czasu w rozwijanie starego runtime opartego o `window.*`.
- Budujemy docelowy frontend w `apps/web`.
- Legacy frontend moze chwilowo zostac w repo, ale docelowo ma przestac byc glowna sciezka aplikacji.

## Co jest juz zrobione

### 1. Nowy frontend React istnieje i dziala

Frontend w `apps/web` ma:

- `React + TypeScript + Vite`
- `React Router`
- `TanStack Query`
- wspolny `AppShell`
- podstawowy podzial na strony, features i storage

### 2. Moduly juz przeniesione albo prawie przeniesione

Status wedlug `apps/web/src/data/modules.ts`:

- `monitor` - `ready`
- `exchanges` - `ready`
- `lunch` - `ready`
- `hires` - `ready`
- `notes` - `ready`

### 3. Jest warstwa kompatybilnosci z danymi, ale backend nie jest zakresem migracji

Na frontendzie sa juz przygotowane elementy, ktore ulatwiaja pozniejsze podpienie danych:

- `apps/web/.env.example`
- `apps/web/src/config/dataSource.ts`
- `apps/web/src/lib/http.ts`
- adaptery `local/api` dla `monitor`, `exchanges` i `lunch`

Do `monitor` jest tez przygotowany pomocniczy opis shape'ow po stronie frontendu:

- `apps/web/src/features/monitor/api-contract.ts`

### 4. Wspolna sesja frontendowa

Powstala wspolna warstwa sesji:

- `apps/web/src/features/session/AppSessionProvider.tsx`
- `apps/web/src/features/session/demoUsers.ts`
- `apps/web/src/features/session/types.ts`

To zastapilo czesc rozproszonych zachowan ze starego UI.

### 5. `Nowe zatrudnienia` zostalo realnie ruszone

Reactowa wersja `hires` ma juz:

- tabele
- filtr miesiaca
- wyszukiwarke
- statystyki
- drawer CRUD
- edycje inline wybranych pol
- panel szczegolow rekordu
- zapis do nowego storage Reactowego
- odczyt legacy danych z `nowe_zatrudnienia_dane`
- import Excel
- eksport Excel

Glowne pliki:

- `apps/web/src/pages/hires/HiresPage.tsx`
- `apps/web/src/features/hires/HiresTable.tsx`
- `apps/web/src/features/hires/HiresDrawer.tsx`
- `apps/web/src/features/hires/storage.ts`
- `apps/web/src/features/hires/hooks.ts`

### 6. Parity Excela jest juz przeniesione do React

React ma juz `import/export Excel` dla:

- `monitor`
- `exchanges`
- `hires`

Technicznie doszly:

- wspolne helpery arkuszy w `apps/web/src/lib/spreadsheet.ts`
- lazy loader `xlsx` oparty o `js/vendor/xlsx.full.min.js`
- mapowanie kolumn importu/eksportu per feature
- akcje `Import Excel` i `Eksport Excel` na stronach React

Uwaga implementacyjna:

- w `monitor` i `exchanges` import zastepujacy dane jest na razie dostepny tylko w trybie `local demo`
- to jest swiadoma decyzja, bo backend i bulk endpointy beda dopinane osobno

### 7. `Notes` nie jest juz placeholderem

Reactowa wersja `notes` ma juz:

- liste wiadomosci
- dodawanie wiadomosci
- edycje swoich wpisow
- usuwanie swoich wpisow
- przypinanie i odpinanie wiadomosci
- panel przypietych wpisow
- aktywnych viewerow miedzy kartami
- sesje robocza oparta o wspolny `AppSessionProvider`

Glowne pliki:

- `apps/web/src/pages/notes/NotesPage.tsx`
- `apps/web/src/features/notes/hooks.ts`
- `apps/web/src/features/notes/storage.ts`
- `apps/web/src/features/notes/storage.local.ts`
- `apps/web/src/features/notes/presence.ts`

### 8. Dashboard home przestal byc placeholderem

Reactowa wersja `dashboard home` ma juz:

- zywy zegar i date
- sesje robocza z wyborem osoby
- live podsumowanie `monitor`, `exchanges`, `hires`, `lunch` i `notes`
- trzy panele operacyjne: priorytety, kolejka ruchu i wspolpraca
- karty modulow z prawdziwym summary zamiast samego statusu migracji
- liste pozostalych widgetow legacy do dopiecia: pogoda, zakladki, planer i aktywni uzytkownicy

Glowne pliki:

- `apps/web/src/pages/dashboard-home/DashboardHomePage.tsx`
- `apps/web/src/layouts/AppShell.tsx`
- `apps/web/src/styles/globals.scss`

### 9. Weryfikacja techniczna

Przeszly:

- `npm.cmd run typecheck:web`
- `npm.cmd run build:web`

Przy buildzie zostal tylko znany warning z Sass o legacy JS API.

## Co jeszcze zostalo

### 1. W dashboardzie zostaly jeszcze widgety z legacy strony glownej

Reactowy `dashboard home` nie jest juz pustym ekranem, ale nadal brakuje czesci funkcji ze starego `index.html`:

- pogoda
- zakladki
- planer zadan
- aktywni uzytkownicy

Legacy zrodlo:

- `index.html`
- `dashboard.html`
- `js/pages/dashboard/*`

### 2. Legacy frontend nadal jest obecny w repo

Nadal istnieja m.in.:

- pliki `.html` w katalogu glownym
- `js/pages/*`
- `js/core/*`
- `js/shared/*`
- stary `service-worker`

To oznacza, ze migracja jest funkcjonalnie zaawansowana, ale repo nie jest jeszcze oczyszczone z poprzedniej architektury.

## Najblizszy krok

Najbardziej sensowny nastepny ruch:

1. przeniesc `zakladki` ze starego dashboardu do React
2. potem ruszyc `pogode` albo `planer + aktywnych uzytkownikow`
3. nastepnie wygaszac albo usuwac legacy frontend, gdy parity bedzie wystarczajace
4. na biezaco dopinac testy lub smoke-checki, jesli beda potrzebne do wdrozenia

Jesli jutro nie bedzie innej decyzji, startujemy od dashboardowych `zakladek`.

## Czego nie robic bez nowej decyzji

- nie rozwijac backendu
- nie wracac do NestJS-owych zalozen z dawnych notatek
- nie narzucac finalnej technologii ani kontraktow backendowi w ramach tej migracji
- nie przebudowywac starego vanilla JS jako rozwiazania docelowego
- nie usuwac legacy kodu w ciemno, jesli React nie ma jeszcze tej samej funkcji

## Szybkie pliki referencyjne

- `apps/web/src/data/modules.ts`
- `apps/web/src/app/AppRouter.tsx`
- `apps/web/src/pages/notes/NotesPage.tsx`
- `apps/web/src/pages/dashboard-home/DashboardHomePage.tsx`
- `apps/web/src/pages/hires/HiresPage.tsx`
- `apps/web/src/lib/spreadsheet.ts`
- `apps/web/src/lib/xlsx.ts`
