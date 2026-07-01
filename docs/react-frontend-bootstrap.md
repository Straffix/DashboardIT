# React Frontend Bootstrap

Nowy frontend React zostal dodany w:

- [apps/web](/C:/Users/arkadiusz.lisiecki/OneDrive%20-%20Rossmann%20SDP/Pulpit/DashboardIT/apps/web:1)

## Co juz jest

- `React + TypeScript + Vite`
- `React Router`
- `TanStack Query`
- nowy `AppShell`
- strona glowna migracji
- rzeczywiste moduly w React:
  - `Urzadzenia w domenie`
  - `Wymiana sprzetu`
  - `Rezerwacja obiadow`

## Jak odpalic

Z poziomu repo:

```bash
npm install
npm run dev:web
```

Albo bezposrednio dla web:

```bash
cd apps/web
npm install
npm run dev
```

## Co przeniesiono w pierwszym kroku

Modul monitoringu ma juz:

- routing
- komponenty React
- wyszukiwanie
- liczniki statusow
- formularz dodawania/edycji
- zapis w `localStorage`

Modul wymian ma juz:

- filtr miesiaca
- wyszukiwanie
- tabele wpisow
- formularz planowania i edycji
- finalizacje wymiany
- synchronizacje z reactowym modulem monitoringu

Modul lunch ma juz:

- siatke slotow
- limity miejsc
- liste zapisanych osob
- rezerwowanie i anulowanie
- tymczasowy selector osoby do czasu migracji auth

## Co dalej

Najblizsza sensowna kolejnosc:

1. `nowe_zatrudnienia`
2. `notatnik`
3. dashboard glowny
