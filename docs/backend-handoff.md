# Handoff Techniczny Backendu DashboardIT

## Cel dokumentu

Ten dokument opisuje aktualna architekture aplikacji `DashboardIT` po przejsciu na backend `PHP + PostgreSQL`.

Najwazniejsze zalozenia:

- obecny frontend ma zostac zachowany
- logika UI pozostaje po stronie `HTML/CSS/JS`
- backend odpowiada za zapis, odczyt, walidacje i sesje
- baza danych jest relacyjna

## Stack projektu

- frontend: statyczne pliki `HTML/CSS/JS`
- backend: `PHP 8.4`
- serwer WWW: `Nginx`
- baza danych: `PostgreSQL`
- auth: sesje `PHP`

## Najwazniejsze pliki

- `index.html`
- `monitor_laptopow.html`
- `nowe_zatrudnienia.html`
- `wymiana_sprzetu.html`
- `rezerwacja_obiadow.html`
- `notatnik.html`
- `js/core/storage-service.js`
- `js/core/domain-services.js`
- `js/shared/base.js`
- `js/shared/auth.js`
- `js/shared/global-ui.js`
- `api/_store.php`
- `api/_auth.php`
- `api/storage.php`
- `api/auth/*.php`
- `api/sql/dashboard-schema.sql`

## Moduly aplikacji

- Uzytkownicy, sesje i role
- Dashboard strony glownej
- Prywatne zakladki uzytkownika
- Rezerwacja obiadow
- Notatnik
- Ogloszenia
- Zadania zespolowe
- Monitor laptopow
- Nowe zatrudnienia
- Wymiana sprzetu
- Panel testerow

## Warstwa danych po stronie frontu

Frontend nadal korzysta z warstwy serwisow, zeby UI nie bylo zwiazane bezposrednio z backendem.

Najwazniejsze obiekty na `window.AppServices`:

- `storageService`
- `usersService`
- `sessionService`
- `authService`
- `hiresService`
- `monitorService`
- `exchangesService`
- `bookmarksService`
- `preferencesService`

Serwisy domenowe pozostaja w:

- `js/core/domain-services.js`

## Klucze danych po stronie aplikacji

Klucze sa dalej uzywane przez frontend jako kontrakt, ale backend mapuje je na tabele PostgreSQL:

- `monitor_laptopow_dane` -> `dashboard_monitor_devices`
- `nowe_zatrudnienia_dane` -> `dashboard_hires`
- `wymiana_sprzetu_dane` -> `dashboard_exchanges`
- `dashboard_users` -> `dashboard_users`
- `dashboard_user_bookmarks` -> `dashboard_bookmarks`
- `dashboard_active_users` -> `dashboard_active_users`
- `dashboard_lunch_reservations` -> `dashboard_lunch_reservations`
- `dashboard_notes_entries` -> `dashboard_notes`
- `dashboard_notes_active_viewers` -> `dashboard_notes_active_viewers`
- `dashboard_notes_announcements` -> `dashboard_announcements`
- `dashboard_notes_tasks` -> `dashboard_tasks`
- `dashboard_testers_feedback` -> `dashboard_tester_feedback`

## Auth i role

System logowania jest oparty o sesje `PHP`.

Role:

- `user`
- `admin`

Backend odpowiada za:

- rejestracje
- logowanie
- wylogowanie
- odczyt aktualnej sesji
- walidacje uprawnien

## Zasady biznesowe

### Uzytkownicy

- pierwszy utworzony uzytkownik dostaje role `admin`
- kazdy uzytkownik ma profil, avatar i login
- backend przechowuje hash hasla, nigdy nie zapisujemy hasla jawnie

### Obiady

- rezerwacje moze tworzyc tylko zalogowany uzytkownik
- jeden uzytkownik moze miec tylko jedna aktywna rezerwacje dziennie
- jeden slot moze miec maksymalnie `4` aktywne rezerwacje
- anulowanie dotyczy wlasnej rezerwacji

### Notatki i ogloszenia

- notatki moze dodawac zalogowany uzytkownik
- ogloszenia sa przechowywane osobno od zwyklych notatek
- rekordy maja znaczniki czasu i autora

### Zadania

- zadania tworzy i przypisuje `admin`
- zadanie ma status `todo`, `in_progress` albo `done`
- zadanie moze byc przypisane do konkretnego uzytkownika

### Zakladki

- zakladki sa prywatne
- widzi je tylko wlasciciel

### Monitor, zatrudnienia i wymiany

- rekordy przechowuja `createdBy`, `updatedBy`, `createdAt`, `updatedAt`
- frontend wysyla dalej ten sam kontrakt danych, backend mapuje go na relacyjne kolumny

## Tabele w PostgreSQL

Glowne tabele aplikacji:

- `dashboard_users`
- `dashboard_user_permissions`
- `dashboard_bookmarks`
- `dashboard_active_users`
- `dashboard_lunch_reservations`
- `dashboard_notes`
- `dashboard_notes_active_viewers`
- `dashboard_announcements`
- `dashboard_tasks`
- `dashboard_tester_feedback`
- `dashboard_monitor_devices`
- `dashboard_hires`
- `dashboard_exchanges`

Schemat jest utrzymywany w:

- `api/sql/dashboard-schema.sql`

## Endpointy

Najwazniejsze endpointy:

- `POST /api/auth/register.php`
- `POST /api/auth/login.php`
- `POST /api/auth/password.php`
- `POST /api/auth/profile.php`
- `POST /api/auth/access.php`
- `GET /api/auth/session.php`
- `GET|POST|DELETE /api/storage.php`
- `GET /api/health.php`

## Czyszczenie danych

Aplikacja startuje od pustych danych. Dodatkowo projekt zawiera:

- `api/reset-app-data.php` - jednorazowy reset danych bazy
- `api/sql/dashboard-reset.sql` - reczny skrypt SQL do wyczyszczenia tabel
- `js/shared/runtime-config.js` - jednorazowe wyczyszczenie lokalnego `localStorage` i `sessionStorage`

## Wdrozenie

Minimalne wymagania po stronie hostingu:

- `PHP 8.4`
- aktywne rozszerzenie `pdo_pgsql`
- dostep do PostgreSQL
- mozliwosc wykonywania `CREATE`, `ALTER`, `INDEX`

## Najkrotsze podsumowanie

DashboardIT jest teraz przygotowany do pracy na jednym frontendzie i backendzie `PHP + PostgreSQL`, bez przykladowych danych i bez osobnej wersji pokazowej.
