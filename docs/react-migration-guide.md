# Migracja DashboardIT do React

## Cel

Chcemy przepisac aplikacje z:

- statycznych plikow HTML
- czystego JavaScriptu opartego o `window.AppUtils`, `window.AppServices` i reczne operacje na DOM
- backendu PHP

na:

- frontend w `React + TypeScript`
- backend bez PHP
- development uruchamiany przez `Docker`
- architekture gotowa pod `Kubernetes`

To nie bedzie "dodanie Reacta do istniejacej strony". To bedzie kontrolowana migracja frontendu i backendu z zachowaniem obecnych funkcji biznesowych.

## Co mamy teraz

### Frontend

Obecna aplikacja sklada sie z osobnych stron HTML:

- `index.html` - dashboard
- `dashboard.html` - shell/routing modulow
- `nowe_zatrudnienia.html`
- `monitor_laptopow.html`
- `wymiana_sprzetu.html`
- `rezerwacja_obiadow.html`
- `notatnik.html`

Frontend laduje skrypty przez [js/script.js](</C:/Users/arkadiusz.lisiecki/OneDrive - Rossmann SDP/Pulpit/DashboardIT/js/script.js:1>) i korzysta z customowego soft-routera w [js/shared/page-router.js](</C:/Users/arkadiusz.lisiecki/OneDrive - Rossmann SDP/Pulpit/DashboardIT/js/shared/page-router.js:1>).

Stan aplikacji i narzedzia sa rozproszone po globalach:

- `window.AppUtils` w [js/shared/public-api.js](</C:/Users/arkadiusz.lisiecki/OneDrive - Rossmann SDP/Pulpit/DashboardIT/js/shared/public-api.js:1>)
- `window.AppServices`
- `window.AppPageRuntime`

W praktyce oznacza to:

- duzo `innerHTML`
- duzo `createElement`
- duzo recznego `addEventListener`
- bardzo malo granic komponentowych

### Dane i backend

Warstwa danych juz jest oddzielona logicznie, co bardzo pomaga:

- [js/core/storage-service.js](</C:/Users/arkadiusz.lisiecki/OneDrive - Rossmann SDP/Pulpit/DashboardIT/js/core/storage-service.js:1>)
- [js/core/domain-services.js](</C:/Users/arkadiusz.lisiecki/OneDrive - Rossmann SDP/Pulpit/DashboardIT/js/core/domain-services.js:1>)

Backend PHP obsluguje m.in.:

- auth
- storage JSON
- chat
- health/reset

Pliki backendowe:

- [api/storage.php](</C:/Users/arkadiusz.lisiecki/OneDrive - Rossmann SDP/Pulpit/DashboardIT/api/storage.php:1>)
- [api/chat-messages.php](</C:/Users/arkadiusz.lisiecki/OneDrive - Rossmann SDP/Pulpit/DashboardIT/api/chat-messages.php:1>)
- [api/_auth.php](</C:/Users/arkadiusz.lisiecki/OneDrive - Rossmann SDP/Pulpit/DashboardIT/api/_auth.php:1>)
- [api/_store.php](</C:/Users/arkadiusz.lisiecki/OneDrive - Rossmann SDP/Pulpit/DashboardIT/api/_store.php:1>)

### Skala

Stan obecny frontendu to w przyblizeniu:

- `22` pliki JS
- `~12 300` linii JS
- kilka bardzo duzych modulow: auth, hires, weather, exchanges, monitor, notes

Wniosek:

- migracja do React ma sens
- ale to bedzie przepisanie architektury, a nie lekki refactor

## Najwazniejszy wniosek techniczny

Backend PHP nie jest wymagany przez frontend jako technologia, tylko jako zestaw kontraktow i zachowan.

To jest dobra wiadomosc, bo mozemy zachowac:

- modele danych
- logike biznesowa
- przeplywy uzytkownika
- sens obecnych endpointow

Do wymiany jest:

- runtime frontendu
- routing HTML -> React Router
- renderowanie DOM -> komponenty React
- PHP API -> nowy backend

## Rekomendowany stack docelowy

## Frontend

Rekomendacja:

- `React`
- `TypeScript`
- `Vite`
- `React Router`
- `TanStack Query`
- `React Hook Form`
- `Zod`
- `SCSS`
- `Vitest + React Testing Library`
- `Playwright`

Dlaczego tak:

- `React + TypeScript` daje nam porzadek i bezpieczniejsze zmiany
- `Vite` jest prosty i szybki
- `React Router` zastapi obecny custom router
- `TanStack Query` uporzadkuje pobieranie i zapisywanie danych
- `React Hook Form + Zod` bardzo ulatwia formularze i walidacje
- `SCSS` pozwoli zachowac obecny kierunek wizualny i reuse tokenow

Na start nie musimy dorzucac zbyt wielu bibliotek stanowych. W wielu miejscach wystarczy:

- local component state
- query cache
- 1 lekki store tylko dla shell/app state, jesli bedzie potrzebny

## Backend

Rekomendacja:

- `NestJS`
- `TypeScript`
- `Prisma`
- `PostgreSQL`
- `Swagger/OpenAPI`

Opcjonalnie:

- `WebSocket / Socket.IO` dla chatu i presence
- `Redis` dla sesji, rate limiting albo kolejek

Dlaczego NestJS:

- dobrze wyglada na HLD
- ma czytelna strukture
- latwiej utrzymac duza aplikacje niz przy "surowym" Express
- bedzie nam wygodniej pracowac krok po kroku

## Infra

Do developmentu:

- `Docker Compose`

Do srodowisk docelowych:

- `Docker images`
- `Kubernetes`

Najbardziej sensowny uklad:

- `web` - frontend React
- `api` - backend NestJS
- `postgres` - baza danych
- opcjonalnie `redis`

W produkcji baza najlepiej jako usluga zarzadzana albo przynajmniej osobny, dobrze utrzymany komponent.

## Proponowana struktura repo

Najprostsza sensowna struktura:

```text
apps/
  web/
  api/
packages/
  ui/
  contracts/
  config/
infra/
  docker/
  k8s/
docs/
```

Opis:

- `apps/web` - React
- `apps/api` - backend
- `packages/ui` - wspolne komponenty i tokeny
- `packages/contracts` - typy DTO, ewentualnie schematy Zod
- `packages/config` - wspolne configi
- `infra/docker` - Dockerfile i compose
- `infra/k8s` - manifesty

## Jak mapowac obecna aplikacje na React

### Shell aplikacji

Obecnie:

- HTML pages
- custom router
- dynamiczna podmiana fragmentu `.wrapper`

Docelowo:

- jeden frontend SPA
- `React Router`
- layout z shell'em i podstronami

### Shared utilities

Obecnie:

- duzy worek helperow w `AppUtils`

Docelowo:

- `src/lib/date.ts`
- `src/lib/search.ts`
- `src/lib/accessories.ts`
- `src/lib/audit.ts`
- `src/lib/format.ts`

### Shared UI

Obecnie:

- reczne drawery, modale, popovery, month pickery

Docelowo:

- komponenty React:
  - `AppShell`
  - `ModuleNav`
  - `UserPanel`
  - `MonthPicker`
  - `ConfirmDialog`
  - `SearchPanel`
  - `Drawer`
  - `Table`

### Dane

Obecnie:

- storage service + domain service + local storage / PHP API fallbacki

Docelowo:

- `api client`
- `TanStack Query`
- backend REST

## Kolejnosc migracji

Nie polecam zaczynac od dashboardu albo chatu. To nie sa najlatwiejsze moduly.

### Etap 1 - fundament

1. Postawic `apps/web` i `apps/api`
2. Ustalic routing
3. Ustalic modele danych i endpointy
4. Przeniesc tokeny wizualne, kolory, spacing, fonty
5. Zbudowac shell aplikacji

### Etap 2 - auth i users

1. Logowanie
2. Sesja
3. Aktualny uzytkownik
4. Role i uprawnienia
5. Panel profilu

To warto zrobic wczesnie, bo prawie kazdy modul tego dotyka.

### Etap 3 - najlatwiejsze moduly

Polecana kolejnosc:

1. `monitor_laptopow`
2. `wymiana_sprzetu`
3. `rezerwacja_obiadow`

Dlaczego:

- maja czytelna logike
- duzo CRUD
- mniej skomplikowany UI niz dashboard/chat

### Etap 4 - sredni poziom trudnosci

1. `nowe_zatrudnienia`

To jest wiekszy modul z:

- tabela
- drawerem
- stanem miesiaca
- inline edycja
- akcesoriami

### Etap 5 - najtrudniejsze moduly

1. `notatnik`
2. `index.html` dashboard

Dlaczego:

- chat
- aktywni uzytkownicy
- zadania
- pogoda
- widgety
- wiecej zaleznosci i eventow

## Moduly i ich poziom trudnosci

### Niski / sredni

- `monitor_laptopow`
- `wymiana_sprzetu`
- `rezerwacja_obiadow`

### Sredni / wysoki

- `nowe_zatrudnienia`

### Wysoki

- `notatnik`
- `dashboard`
- `auth`

## Jak powinnismy pracowac razem

Ty nie musisz umiec Reacta na starcie. Najlepszy tryb pracy bedzie taki:

1. wybieramy jeden maly obszar
2. ja tlumacze Ci architekture i tworze pierwsza wersje
3. razem dopracowujemy UI i logike
4. po kazdym kroku wyjasniam:
   - co to jest komponent
   - gdzie jest state
   - gdzie idzie request
   - co jest reusable

Czyli:

- nie uczymy sie "Reacta w prozni"
- uczymy sie Reacta na Twojej aplikacji

## Czego musisz sie nauczyc po drodze

Minimalny zestaw:

1. JSX
2. komponenty
3. props
4. state
5. `useEffect`
6. routing
7. formularze
8. pobieranie danych
9. lista i tabela
10. dialogi/drawery

Nie musisz tego ogarnac przed startem. Mozemy to robic po kolei.

## Co warto zachowac z obecnego projektu

Warto zachowac:

- design direction
- nazewnictwo domenowe
- reguly biznesowe
- audyt zmian
- podzial na moduly
- wiele helperow po przepisaniu do TS

Nie warto na sile zachowywac:

- custom router HTML
- globali `window.*`
- renderowania opartego o `innerHTML`
- backendu PHP
- fallbackow pisanych pod obecny runtime

## API, ktore trzeba odtworzyc

Minimalne obszary backendowe:

- `auth`
- `users`
- `hires`
- `monitor`
- `exchanges`
- `lunch`
- `notes/chat`
- `announcements`
- `tasks`
- `bookmarks`
- `active-users`

Do tego:

- health check
- seed/reset do dev/test
- upload avatarow/tla, jesli zostaje

## Docker i Kubernetes

### Lokalnie

Potrzebujemy:

- `Dockerfile` dla web
- `Dockerfile` dla api
- `docker-compose.yml`

Compose powinien odpalac:

- `web`
- `api`
- `postgres`
- opcjonalnie `redis`

### Docelowo pod HLD

Na poziomie HLD mozna bezpiecznie mowic o:

- frontend jako osobny deployment
- backend jako osobny deployment
- Postgres jako osobny komponent
- ingress przed aplikacja
- secrets/configmaps
- readiness/liveness probes

To przechodzi znacznie lepiej niz "PHP + pliki na serwerze".

## Proponowany pierwszy milestone

Najlepszy pierwszy realny cel:

1. utworzyc nowy frontend React
2. utworzyc nowy backend NestJS
3. uruchomic oba przez Docker Compose
4. zrobic auth skeleton
5. przeniesc shell aplikacji
6. przepisac `monitor_laptopow` jako pierwszy modul end-to-end

Dlaczego akurat monitor:

- jest wystarczajaco duzy, zeby pokazac pelny wzorzec
- ale jeszcze nie tak ciezki jak hires albo chat

## Szacowanie trudnosci

Przy pracy "razem z AI, krok po kroku":

- foundation i shell: srednio trudne
- auth + backend contracts: srednio trudne
- monitor/exchanges/lunch: srednie
- hires: srednio trudne do trudnych
- notes/dashboard: trudne

Najwieksze ryzyko nie lezy w React, tylko w:

- zachowaniu wszystkich funkcji 1:1
- poprawnym przeniesieniu auth
- utrzymaniu obecnego UX bez regresji

## Decyzje, ktore polecam podjac od razu

1. `React + TypeScript + Vite`
2. `NestJS + PostgreSQL + Prisma`
3. `Docker Compose` lokalnie
4. `Kubernetes-ready` deployment docelowo
5. `REST` na start, bez przesadnego komplikowania
6. `chat` najpierw jako HTTP polling / normalne API, websocket dopiero gdy bedzie potrzebny

## Czego nie polecam

Nie polecam:

- probowac "domontowac" Reacta do obecnych HTML-i jako glowna strategia
- przepisywac wszystko naraz
- zaczynac od dashboardu
- zaczynac od chatu
- robic backend "jakis prosty byle dzialal", jesli HLD ma byc mocne

## Co zrobimy dalej razem

Najrozsadniejsza nastepna sekwencja pracy:

1. przygotowac strukture nowego projektu
2. ustalic kontrakty API
3. postawic nowy shell React
4. uruchomic Docker Compose
5. zrobic pierwszy modul

Ten dokument jest baza architektoniczna. Obok jest osobna checklista do odhaczania.
