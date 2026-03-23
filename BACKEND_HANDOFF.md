# Handoff Techniczny Do Podłączenia Backendu

## Cel dokumentu

Ten dokument opisuje aktualną architekturę aplikacji `DashboardIT` oraz założenia potrzebne do przyszłego podłączenia backendu.

Obecnie aplikacja działa jako frontend oparty o statyczne pliki HTML/CSS/JS i przechowuje dane lokalnie w `localStorage`.
Docelowo frontend ma zostać zachowany możliwie bez większej przebudowy, a warstwa danych oraz uwierzytelniania ma zostać przepięta na backend / API.

Najważniejsze założenie:

- aktualny frontend ma zostać zachowany
- należy podmienić źródło danych z `localStorage` na backend
- najlepiej utrzymać warstwę serwisów po stronie frontu, aby UI nie wymagało dużych zmian

---

## Aktualny stan aplikacji

Aktualnie aplikacja zawiera następujące moduły:

- `Dashboard` strony głównej
- `Nowe zatrudnienia`
- `Monitor laptopów`
- `Wymiana sprzętu`

Pliki wejściowe:

- `index.html`
- `nowe_zatrudnienia.html`
- `monitor_laptopow.html`
- `wymiana_sprzetu.html`

Pliki JS:

- `js/script.js` - wspólne utilities i logika współdzielona
- `js/dashboard.js`
- `js/zatrudnienia.js`
- `js/monitor.js`
- `js/wymiany.js`

Aktualnie dane są trzymane lokalnie pod kluczami:

- `monitor_laptopow_dane`
- `nowe_zatrudnienia_dane`
- `wymiana_sprzetu_dane`

Docelowo dojdą kolejne moduły:

- użytkownicy / logowanie / sesja / role
- rezerwacja obiadów
- notatnik / tablica / zadania
- prywatne zakładki użytkownika na dashboardzie

---

## Założenia architektoniczne na przyszłość

Frontend powinien korzystać z warstwy pośredniej typu serwisy:

- `authService`
- `usersService`
- `hiresService`
- `monitorService`
- `exchangesService`
- `lunchService`
- `notesService`
- `tasksService`
- `bookmarksService`

Na dziś serwisy mogą mieć implementację opartą o `localStorage`.
Docelowo implementacja powinna zostać podmieniona na komunikację z API.

Zalecenie:

- nie przepisywać UI
- nie mieszać bezpośrednich wywołań API w komponentach / plikach stron
- utrzymać jeden kontrakt danych po stronie frontu

---

## Moduł 1: Użytkownicy, logowanie, role

### Wymagania biznesowe

- użytkownik może się zarejestrować
- użytkownik może się zalogować i wylogować
- użytkownik posiada avatar
- użytkownik posiada rolę:
  - `user`
  - `admin`
- aplikacja ma wiedzieć, kto jest aktualnie zalogowany
- rekordy w systemie mają przechowywać informację:
  - kto utworzył rekord
  - kto ostatnio edytował rekord
  - kiedy rekord został utworzony
  - kiedy rekord został ostatnio zmieniony

### Proponowany model danych `User`

```json
{
  "id": "user_001",
  "fullName": "Jan Kowalski",
  "login": "jkowalski",
  "email": "jan.kowalski@firma.pl",
  "passwordHash": "docelowo po stronie backendu",
  "avatarUrl": "/avatars/jan.png",
  "role": "admin",
  "createdAt": "2026-03-23T10:00:00Z",
  "updatedAt": "2026-03-23T10:00:00Z",
  "isActive": true
}
```

### Proponowany model sesji

```json
{
  "userId": "user_001",
  "loginAt": "2026-03-23T10:00:00Z",
  "expiresAt": "2026-03-23T18:00:00Z"
}
```

### Ważne uwagi

- na etapie `localStorage` hasła mogą być jedynie rozwiązaniem pokazowym
- produkcyjnie logowanie musi zostać przeniesione do backendu
- role powinny być walidowane po stronie backendu, nie tylko w UI

---

## Moduł 2: Nowe zatrudnienia

### Obecna funkcja

Moduł służy do planowania onboardingów i wydania sprzętu dla nowych pracowników.

### Docelowe pola wpisu `Hire`

```json
{
  "id": "hire_001",
  "name": "JAN KOWALSKI",
  "ru": "Administracja",
  "sn": "PF123456",
  "date": "2026-07-23",
  "accessories": ["mouse", "keyboard"],
  "createdBy": "user_001",
  "updatedBy": "user_002",
  "createdAt": "2026-03-23T09:00:00Z",
  "updatedAt": "2026-03-23T11:00:00Z"
}
```

### Wymagania

- zapis autora utworzenia
- zapis autora ostatniej edycji
- możliwość pokazania tych informacji w UI

---

## Moduł 3: Monitor laptopów

### Obecna funkcja

Moduł służy do kontroli urządzeń w domenie i ich dat ważności.

### Docelowe pola wpisu `MonitorDevice`

```json
{
  "id": "device_001",
  "name": "REKRUTACJA746",
  "ru": "243621351",
  "sn": "PF928402",
  "date": "2026-05-20",
  "lastExtendedOn": "2026-03-23",
  "createdBy": "user_001",
  "updatedBy": "user_003",
  "createdAt": "2026-03-23T09:00:00Z",
  "updatedAt": "2026-03-23T12:00:00Z"
}
```

### Wymagania

- autor dodania wpisu
- autor ostatniej edycji
- data utworzenia
- data ostatniej zmiany

---

## Moduł 4: Wymiana sprzętu

### Obecna funkcja

Moduł służy do planowania wymian laptopów i akcesoriów.

### Docelowe pola wpisu `Exchange`

```json
{
  "id": "exchange_001",
  "name": "JAN KOWALSKI",
  "plannedDate": "2026-07-23",
  "oldSn": "PF123111",
  "newSn": "PF999222",
  "accessories": ["mouse", "bag"],
  "notes": "stary laptop uszkodzony",
  "status": "pending",
  "createdBy": "user_001",
  "updatedBy": "user_002",
  "createdAt": "2026-03-23T09:00:00Z",
  "updatedAt": "2026-03-23T11:30:00Z"
}
```

### Wymagania

- zapis autora wpisu
- zapis ostatniej edycji
- historia dat zmian

---

## Moduł 5: Rezerwacja obiadów

### Założenia biznesowe

- osobna strona `.html`
- osobny kafelek na dashboardzie
- rezerwacje mogą robić tylko zalogowani użytkownicy
- sloty od `11:00` do `15:00`
- interwał co `30 minut`
- maksymalnie `4 osoby` na jeden slot
- użytkownik może zarezerwować godzinę i ewentualnie anulować własną rezerwację
- system powinien pokazywać, kto zapisał się na dany slot

### Przykładowe sloty

- `11:00`
- `11:30`
- `12:00`
- `12:30`
- `13:00`
- `13:30`
- `14:00`
- `14:30`
- `15:00`

### Docelowy model danych `LunchReservation`

```json
{
  "id": "lunch_001",
  "date": "2026-03-23",
  "timeSlot": "12:00",
  "userId": "user_001",
  "createdAt": "2026-03-23T08:10:00Z",
  "updatedAt": "2026-03-23T08:10:00Z",
  "status": "active"
}
```

### Reguły biznesowe

- na jeden slot może przypadać maksymalnie `4` aktywnych rezerwacji
- tylko zalogowany użytkownik może utworzyć rezerwację
- użytkownik może anulować swoją własną rezerwację
- docelowo limit powinien być egzekwowany po stronie backendu, aby uniknąć konfliktów równoczesnych zapisów

### Uwaga do wersji bez backendu

W wersji `localStorage` limit działa tylko lokalnie w obrębie jednej przeglądarki / jednego środowiska danych.
Nie jest to w pełni wiarygodne dla wielu użytkowników na różnych komputerach.

---

## Moduł 6: Notatnik / tablica / zadania

### Założenia biznesowe

- osobna strona `.html`
- osobny kafelek na dashboardzie
- notatki może pisać każdy zalogowany użytkownik
- notatki mają służyć jako podręczne teksty, ważne informacje, komunikacja operacyjna
- zadania mają mieć możliwość przypisania do użytkownika
- zadania może przypisywać tylko `admin`
- przy przypisanym zadaniu ma być widoczny:
  - avatar użytkownika
  - imię i nazwisko użytkownika
- sekcja ważnych tematów / tablica ma być widoczna na górze

### Proponowany podział logiczny

- `notes` - zwykłe notatki
- `announcements` - ważne informacje / przypięte tematy
- `tasks` - zadania przypisane do użytkowników

### Model danych `Note`

```json
{
  "id": "note_001",
  "content": "Zwrot do zamykania SD: ...",
  "authorId": "user_001",
  "createdAt": "2026-03-23T09:00:00Z",
  "updatedAt": "2026-03-23T09:10:00Z",
  "isPinned": false
}
```

### Model danych `Announcement`

```json
{
  "id": "announcement_001",
  "title": "Pilny temat",
  "content": "Najważniejsza informacja dla zespołu",
  "authorId": "user_002",
  "createdAt": "2026-03-23T07:30:00Z",
  "updatedAt": "2026-03-23T08:00:00Z",
  "isPinned": true
}
```

### Model danych `Task`

```json
{
  "id": "task_001",
  "title": "Sprawdzić zgłoszenie SD",
  "description": "Zweryfikować status laptopa i domeny",
  "assignedToUserId": "user_003",
  "createdBy": "user_001",
  "updatedBy": "user_001",
  "createdAt": "2026-03-23T10:00:00Z",
  "updatedAt": "2026-03-23T10:30:00Z",
  "status": "todo",
  "priority": "high"
}
```

### Reguły biznesowe

- notatki może tworzyć każdy zalogowany użytkownik
- zadania przypisuje tylko użytkownik z rolą `admin`
- zadanie może mieć statusy:
  - `todo`
  - `in_progress`
  - `done`
- przy zadaniu należy zwracać lub łatwo pobierać dane przypisanego użytkownika

---

## Moduł 7: Zakładki użytkownika

### Założenia biznesowe

- zakładki są prywatne
- są przypisane do zalogowanego użytkownika
- mają być widoczne na stronie głównej dashboardu
- mają prowadzić m.in. do:
  - linków SharePoint
  - plików `.xlsx`
  - innych ważnych adresów firmowych

### Model danych `Bookmark`

```json
{
  "id": "bookmark_001",
  "userId": "user_001",
  "label": "Raport tygodniowy",
  "url": "https://firma.sharepoint.com/...",
  "icon": "fa-file-excel",
  "createdAt": "2026-03-23T10:00:00Z",
  "updatedAt": "2026-03-23T10:00:00Z"
}
```

### Reguły biznesowe

- zakładki widzi tylko właściciel
- zakładki nie są współdzielone między użytkownikami

---

## Role i uprawnienia

### `user`

- może się zalogować
- może edytować własny profil / avatar
- może dodawać i edytować standardowe wpisy zgodnie z zakresem modułów
- może dodawać notatki
- może robić rezerwacje obiadowe
- może zarządzać własnymi zakładkami

### `admin`

Posiada wszystkie uprawnienia użytkownika oraz dodatkowo:

- może przypisywać zadania do innych użytkowników
- może zarządzać zadaniami zespołowymi w szerszym zakresie
- docelowo może mieć dodatkowe uprawnienia administracyjne

---

## Minimalny kontrakt API do rozważenia

Poniżej przykładowy kierunek, nie jest to sztywne wymaganie technologiczne.

### Auth

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`

### Users

- `GET /api/users`
- `GET /api/users/:id`
- `PATCH /api/users/:id`

### Hires

- `GET /api/hires`
- `POST /api/hires`
- `PATCH /api/hires/:id`
- `DELETE /api/hires/:id`

### Monitor

- `GET /api/monitor-devices`
- `POST /api/monitor-devices`
- `PATCH /api/monitor-devices/:id`
- `DELETE /api/monitor-devices/:id`

### Exchanges

- `GET /api/exchanges`
- `POST /api/exchanges`
- `PATCH /api/exchanges/:id`
- `DELETE /api/exchanges/:id`

### Lunch

- `GET /api/lunch-reservations?date=2026-03-23`
- `POST /api/lunch-reservations`
- `DELETE /api/lunch-reservations/:id`

### Notes / Announcements / Tasks

- `GET /api/notes`
- `POST /api/notes`
- `PATCH /api/notes/:id`
- `DELETE /api/notes/:id`

- `GET /api/announcements`
- `POST /api/announcements`
- `PATCH /api/announcements/:id`
- `DELETE /api/announcements/:id`

- `GET /api/tasks`
- `POST /api/tasks`
- `PATCH /api/tasks/:id`
- `DELETE /api/tasks/:id`

### Bookmarks

- `GET /api/bookmarks`
- `POST /api/bookmarks`
- `PATCH /api/bookmarks/:id`
- `DELETE /api/bookmarks/:id`

---

## Rekomendacja wdrożeniowa

Najbezpieczniejsza ścieżka migracji:

1. Zachować obecny frontend
2. Wydzielić lub utrzymać serwisy danych po stronie frontu
3. Ustalić finalne modele danych
4. Przygotować backend i endpointy
5. Podmienić implementację serwisów z `localStorage` na `fetch/API`
6. Zostawić UI możliwie bez zmian

---

## Co należy wiedzieć o obecnej wersji demo

Aktualna lub planowana wersja bez backendu jest wersją pokazową / lokalną.

Ograniczenia:

- dane nie są współdzielone między komputerami
- logowanie lokalne nie jest rozwiązaniem produkcyjnym
- limit `4 osób` na obiady nie jest w pełni bezpieczny bez wspólnej bazy i blokad po stronie serwera
- wspólny notatnik bez backendu będzie tylko lokalny dla danego środowiska przeglądarki

Mimo tego wersja demo pozwala:

- pokazać pełny przepływ działania aplikacji
- ustalić wygląd i UX modułów
- przygotować frontend pod przyszłe wdrożenie backendowe

---

## Najkrótsze podsumowanie dla kolejnego programisty

Ta aplikacja działa obecnie na statycznym frontendzie i `localStorage`, ale została zaplanowana tak, aby w kolejnym etapie podmienić wyłącznie warstwę danych i auth na backend.

Kluczowe wymagania:

- zachować UI
- dodać prawdziwe logowanie i użytkowników
- wdrożyć role `user/admin`
- podpiąć `createdBy`, `updatedBy`, `createdAt`, `updatedAt`
- obsłużyć prywatne zakładki użytkownika
- wdrożyć współdzielone rezerwacje obiadów z limitem `4 osób`
- wdrożyć notatnik, ogłoszenia i zadania przypisywane do użytkowników

