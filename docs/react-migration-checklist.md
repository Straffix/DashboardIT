# React Migration Checklist

> Aktualna decyzja zakresowa: ta checklista dotyczy migracji frontendu do React.
> Punkty backendowe, NestJS i infra traktuj jako archiwalne notatki, nie jako aktywny plan prac dla tego repo.

## Zasady

- Nie migrujemy wszystkiego na raz.
- Zaczynamy od nowego projektu obok starego.
- Stary projekt sluzy jako referencja funkcji i UI.
- Kazdy modul konczymy end-to-end: UI + zachowanie + test podstawowy.

## Faza 0 - Przygotowanie

- [ ] Potwierdzic stack: `React + TypeScript + Vite`
- [ ] Potwierdzic zakres: `frontend only`, backend poza zakresem
- [ ] Zamrozic liste funkcji obecnej aplikacji
- [ ] Zrobic screenshoty referencyjne wszystkich widokow
- [ ] Spisac role i uprawnienia uzytkownikow

## Faza 1 - Nowe repo app/runtime

- [ ] Dodac `apps/web`
- [ ] Dodac `apps/api`
- [ ] Dodac `packages/contracts`
- [ ] Dodac `packages/ui`
- [ ] Dodac podstawowy workspace
- [ ] Dodac `.env.example`
- [ ] Dodac linting i formatowanie

## Faza 2 - Docker

- [ ] Przygotowac `Dockerfile` dla web
- [ ] Przygotowac `Dockerfile` dla api
- [ ] Przygotowac `docker-compose.yml`
- [ ] Dodac `postgres`
- [ ] Dodac wolumeny developerskie
- [ ] Sprawdzic lokalny start wszystkiego jednym poleceniem

## Faza 3 - Backend foundation

- [ ] Skonfigurowac NestJS
- [ ] Skonfigurowac Prisma
- [ ] Utworzyc schemat bazy
- [ ] Dodac migracje
- [ ] Dodac health endpoint
- [ ] Dodac OpenAPI/Swagger
- [ ] Dodac podstawowy error handling
- [ ] Dodac config i secrets handling

## Faza 4 - Auth

- [ ] Model `User`
- [ ] Login
- [ ] Logout
- [ ] Session / token refresh
- [ ] Endpoint `current user`
- [ ] Zmiana hasla
- [ ] Role i permissions
- [ ] Frontend auth guard
- [ ] User panel

## Faza 5 - React shell

- [ ] App shell
- [ ] Routing
- [ ] Navigation
- [ ] Theme handling
- [ ] User panel slot
- [ ] Modal/dialog system
- [ ] Drawer system
- [ ] Search panel
- [ ] Month picker

## Faza 6 - Design system

- [ ] Przeniesc zmienne kolorow
- [ ] Przeniesc typography tokens
- [ ] Przeniesc spacing/radius/shadows
- [ ] Przeniesc ikony
- [ ] Zrobic bazowe buttony
- [ ] Zrobic bazowe inputy/selecty/textarea
- [ ] Zrobic table primitives

## Faza 7 - Pierwszy modul

Rekomendacja: `monitor_laptopow`

- [ ] Lista urzadzen
- [ ] Filtrowanie / wyszukiwanie
- [ ] Dodawanie
- [ ] Edycja
- [ ] Usuwanie
- [ ] Import/export
- [ ] Audit fields
- [ ] Test podstawowy UI/API

## Faza 8 - Kolejne moduly

### Wymiana sprzetu

- [ ] Lista
- [ ] Drawer formularza
- [ ] Search
- [ ] Finalizacja wymiany
- [ ] Import/export
- [ ] Audit

### Obiady

- [ ] Sloty
- [ ] Rezerwacja
- [ ] Anulowanie
- [ ] Widok zajetosci

### Nowe zatrudnienia

- [ ] Lista
- [ ] Drawer
- [ ] Inline edit
- [ ] Akcesoria
- [ ] Search
- [ ] Audit
- [ ] Import/export

### Notatnik / chat

- [ ] Lista wiadomosci
- [ ] Dodawanie
- [ ] Edycja
- [ ] Usuwanie
- [ ] Pinning
- [ ] Active viewers
- [ ] Strategia live updates

### Dashboard

- [ ] Menu
- [ ] Zakladki
- [ ] Zadania
- [ ] Aktywni uzytkownicy
- [ ] Pogoda
- [ ] Zegar/topbar

## Faza 9 - API mapping

- [ ] `auth`
- [ ] `users`
- [ ] `monitor`
- [ ] `exchanges`
- [ ] `hires`
- [ ] `lunch`
- [ ] `notes`
- [ ] `announcements`
- [ ] `tasks`
- [ ] `bookmarks`
- [ ] `active-users`

## Faza 10 - Testy

- [ ] Unit tests dla helperow
- [ ] Component tests dla kluczowych formularzy
- [ ] API tests dla auth
- [ ] API tests dla CRUD
- [ ] E2E dla logowania
- [ ] E2E dla pierwszego modulu

## Faza 11 - Kubernetes readiness

- [ ] Docker images buduja sie poprawnie
- [ ] Config przez env vars
- [ ] Health/readiness endpoints
- [ ] Manifest `Deployment` dla web
- [ ] Manifest `Deployment` dla api
- [ ] Manifest `Service`
- [ ] Manifest `Ingress`
- [ ] Manifest `Secret`
- [ ] Manifest `ConfigMap`

## Faza 12 - Cutover

- [ ] Porownanie funkcji stare vs nowe
- [ ] Zamkniecie brakow UX
- [ ] Smoke test wszystkich modulow
- [ ] Plan uruchomienia produkcyjnego
- [ ] Plan rollbacku

## Pierwsze zadania, ktore polecam zrobic od razu

- [ ] Postawic nowe `apps/web`
- [ ] Postawic nowe `apps/api`
- [ ] Dodac Docker Compose
- [ ] Uzgodnic kontrakt auth
- [ ] Przepisac shell aplikacji
- [ ] Wybrac `monitor_laptopow` jako pierwszy modul
