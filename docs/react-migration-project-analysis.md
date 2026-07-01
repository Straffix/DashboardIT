# React Migration Analysis For DashboardIT

## 1. Executive summary

This project should be migrated to React as a controlled rewrite of the frontend runtime, not as a "sprinkle React into existing HTML" exercise.

Why:

- the app is split across standalone HTML pages
- page rendering depends on global state and `window.*`
- modules mix business rules, DOM rendering, and event wiring in the same files
- routing is currently implemented by custom script loading and `.wrapper` replacement

Good news:

- a lot of business logic already exists and can be reused conceptually
- storage and domain rules are partly separated
- modules are independent enough to migrate one by one

Recommended target:

- `React + TypeScript + Vite`
- `React Router`
- `TanStack Query`
- `React Hook Form`
- `Zod`
- `SCSS`
- `Vitest + React Testing Library`

## 2. Current architecture in this repo

### Entry model

Current frontend bootstraps through:

- [js/script.js](</C:/Users/arkadiusz.lisiecki/OneDrive - Rossmann SDP/Pulpit/DashboardIT/js/script.js:1>)

It loads:

- shared scripts into every page
- page-specific scripts depending on the current HTML file

### Current pages

Standalone pages:

- [index.html](</C:/Users/arkadiusz.lisiecki/OneDrive - Rossmann SDP/Pulpit/DashboardIT/index.html:1>) - main dashboard
- [dashboard.html](</C:/Users/arkadiusz.lisiecki/OneDrive - Rossmann SDP/Pulpit/DashboardIT/dashboard.html:1>) - module shell
- [monitor_laptopow.html](</C:/Users/arkadiusz.lisiecki/OneDrive - Rossmann SDP/Pulpit/DashboardIT/monitor_laptopow.html:1>)
- [wymiana_sprzetu.html](</C:/Users/arkadiusz.lisiecki/OneDrive - Rossmann SDP/Pulpit/DashboardIT/wymiana_sprzetu.html:1>)
- [nowe_zatrudnienia.html](</C:/Users/arkadiusz.lisiecki/OneDrive - Rossmann SDP/Pulpit/DashboardIT/nowe_zatrudnienia.html:1>)
- [rezerwacja_obiadow.html](</C:/Users/arkadiusz.lisiecki/OneDrive - Rossmann SDP/Pulpit/DashboardIT/rezerwacja_obiadow.html:1>)
- [notatnik.html](</C:/Users/arkadiusz.lisiecki/OneDrive - Rossmann SDP/Pulpit/DashboardIT/notatnik.html:1>)

### Current routing/runtime

Custom module navigation lives in:

- [js/shared/page-router.js](</C:/Users/arkadiusz.lisiecki/OneDrive - Rossmann SDP/Pulpit/DashboardIT/js/shared/page-router.js:1>)

It already behaves like:

- shell page
- route map
- page scope cleanup
- async page script loading

This is a strong signal that React Router is the natural replacement.

### Shared global APIs

Shared helpers:

- [js/shared/base.js](</C:/Users/arkadiusz.lisiecki/OneDrive - Rossmann SDP/Pulpit/DashboardIT/js/shared/base.js:1>) - `765` lines
- [js/shared/public-api.js](</C:/Users/arkadiusz.lisiecki/OneDrive - Rossmann SDP/Pulpit/DashboardIT/js/shared/public-api.js:1>)

Auth and user UI:

- [js/shared/auth.js](</C:/Users/arkadiusz.lisiecki/OneDrive - Rossmann SDP/Pulpit/DashboardIT/js/shared/auth.js:1>) - `2513` lines

Storage and domain services:

- [js/core/storage-service.js](</C:/Users/arkadiusz.lisiecki/OneDrive - Rossmann SDP/Pulpit/DashboardIT/js/core/storage-service.js:1>) - `617` lines
- [js/core/domain-services.js](</C:/Users/arkadiusz.lisiecki/OneDrive - Rossmann SDP/Pulpit/DashboardIT/js/core/domain-services.js:1>) - `668` lines

### Current data integration shape

The current backend integration is simple and contract-oriented:

- [api/storage.php](</C:/Users/arkadiusz.lisiecki/OneDrive - Rossmann SDP/Pulpit/DashboardIT/api/storage.php:1>)

This is useful because the React migration does not need to prescribe backend technology. It only needs to preserve:

- auth contract
- CRUD contract
- payload shape
- error shape

That means backend technology can be changed independently later without changing the product behavior in the UI.

## 3. What should be reused vs rewritten

### Reuse conceptually or extract first

These are good candidates to move into TypeScript utility modules with small refactors:

- date parsing/formatting from `base.js`
- search normalization and matching from `base.js`
- serial normalization helpers like `normalizeSN`
- accessory normalization helpers
- audit normalization helpers
- task status and priority metadata from `domain-services.js`
- lunch slot config from `domain-services.js`
- bookmark color normalization logic

### Rewrite in React

These parts should be rewritten, not copied line for line:

- anything built with `innerHTML`
- anything built with `document.createElement`
- manual `addEventListener` orchestration
- DOM-driven modal state
- direct DOM sync for auth/theme/profile UI
- page lifecycle cleanup implemented through custom scope objects

### Backend migration rule

Do not start by redesigning business rules. First preserve behavior:

- same entities
- same validation intent
- same permissions
- same key user flows

Then improve schema and API step by step.

## 4. Module-by-module migration difficulty

### 1. `monitor_laptopow` - best first module

File:

- [js/pages/monitor/index.js](</C:/Users/arkadiusz.lisiecki/OneDrive - Rossmann SDP/Pulpit/DashboardIT/js/pages/monitor/index.js:1>) - `692` lines

Why first:

- clear CRUD flow
- list + search + drawer form
- limited cross-module coupling
- no real-time behavior
- data model is understandable

React shape:

- `MonitorPage`
- `MonitorToolbar`
- `MonitorSearchPanel`
- `MonitorTable`
- `MonitorDrawer`
- `MonitorForm`

Hooks/services:

- `useMonitorDevicesQuery`
- `useCreateMonitorDeviceMutation`
- `useUpdateMonitorDeviceMutation`
- `useDeleteMonitorDeviceMutation`

### 2. `wymiana_sprzetu` - second

File:

- [js/pages/exchanges/index.js](</C:/Users/arkadiusz.lisiecki/OneDrive - Rossmann SDP/Pulpit/DashboardIT/js/pages/exchanges/index.js:1>) - `786` lines

Why second:

- same CRUD style as monitor
- month filter is a good React component candidate
- some dependency on monitor data, but manageable

React shape:

- `ExchangesPage`
- `ExchangeMonthPicker`
- `ExchangeTable`
- `ExchangeDrawer`
- `AccessoryPicker`

### 3. `nowe_zatrudnienia` - medium/high complexity

File:

- [js/pages/hires/index.js](</C:/Users/arkadiusz.lisiecki/OneDrive - Rossmann SDP/Pulpit/DashboardIT/js/pages/hires/index.js:1>) - `1577` lines

Why later:

- biggest CRUD module
- import/export aliases
- inline editing
- expanded accessory rows
- more fields than other forms

React note:

This should be split immediately into subcomponents. Do not build it as one page component.

Recommended split:

- `HiresPage`
- `HireTable`
- `HireTableRow`
- `HireAccessoriesRow`
- `HireDrawer`
- `HireForm`
- `HireInlineStatusEditor`

### 4. `rezerwacja_obiadow` - easy/medium

File:

- [js/pages/lunch/index.js](</C:/Users/arkadiusz.lisiecki/OneDrive - Rossmann SDP/Pulpit/DashboardIT/js/pages/lunch/index.js:1>) - `281` lines

Why relatively easy:

- small bounded domain
- simple entity model
- card-based UI
- good showcase for query + mutation + optimistic refresh

React shape:

- `LunchPage`
- `LunchDateHeader`
- `LunchSlotGrid`
- `LunchSlotCard`

### 5. `notatnik` / chat - medium/high

File:

- [js/pages/notes/index.js](</C:/Users/arkadiusz.lisiecki/OneDrive - Rossmann SDP/Pulpit/DashboardIT/js/pages/notes/index.js:1>) - `557` lines

Why later:

- pseudo real-time refresh
- presence tracking
- pinned messages
- edit mode
- auth-sensitive behavior

Decision point:

- phase 1: polling is enough
- phase 2: websocket only if really needed

React shape:

- `NotesPage`
- `NotesAuthState`
- `NotesMessageList`
- `NotesComposer`
- `PinnedMessagesPanel`
- `ActiveViewersPanel`

### 6. Main dashboard - medium/high

Files:

- [js/pages/dashboard/index.js](</C:/Users/arkadiusz.lisiecki/OneDrive - Rossmann SDP/Pulpit/DashboardIT/js/pages/dashboard/index.js:1>) - `621` lines
- [js/pages/dashboard/weather.js](</C:/Users/arkadiusz.lisiecki/OneDrive - Rossmann SDP/Pulpit/DashboardIT/js/pages/dashboard/weather.js:1>) - `1034` lines
- [js/pages/dashboard/bookmarks-enhanced.js](</C:/Users/arkadiusz.lisiecki/OneDrive - Rossmann SDP/Pulpit/DashboardIT/js/pages/dashboard/bookmarks-enhanced.js:1>) - `555` lines

Why not first:

- many widgets in one screen
- drag/drop menu order
- weather integration
- bookmarks modal
- active users summary
- task planner/calendar

Recommended split:

- `DashboardHomePage`
- `DashboardTopbar`
- `WeatherWidget`
- `ClockWidget`
- `DashboardMenuGrid`
- `DashboardMenuEditor`
- `BookmarksSection`
- `BookmarkModal`
- `TaskPlannerModal`
- `ActiveUsersSummary`

## 5. What the target React app should look like

## Frontend structure

```text
apps/
  web/
    src/
      app/
        router.tsx
        providers.tsx
      layouts/
        AppShell.tsx
        DashboardShell.tsx
      pages/
        dashboard-home/
        monitor/
        exchanges/
        hires/
        lunch/
        notes/
        auth/
      components/
        ui/
        forms/
        tables/
        dialogs/
      features/
        auth/
        users/
        bookmarks/
        tasks/
        weather/
      services/
        api/
        storage/
      hooks/
      utils/
      styles/
```

## Suggested routes

```text
/
/dashboard
/dashboard/monitor
/dashboard/exchanges
/dashboard/hires
/dashboard/lunch
/dashboard/notes
/login
```

If you want parity with the current mental model, use one dashboard shell and render module pages inside it.

## 6. How to translate current patterns into React

### Current pattern -> React equivalent

- `document.getElementById(...)` -> component props, refs only when needed
- `innerHTML = ...` -> JSX
- manual form state -> `react-hook-form`
- manual validation -> `zod`
- `window.AppServices.*` -> typed API clients + hooks
- `window.AppUtils.*` -> `src/utils/*`
- `document.addEventListener('app-auth-changed', ...)` -> auth context/store
- `.wrapper` swap router -> `React Router`
- storage polling -> `TanStack Query` refetch or websocket later

### Important migration rule

Do not port DOM code literally.

Bad path:

- making React components that still manually rewrite DOM in `useEffect`

Good path:

- extract rules
- model state
- render UI from state

## 7. Backend isolation rule

## Data migration principle

Start with current browser/PHP payloads and map them into DTOs first.

Only after that:

- clean up schema names
- normalize relations
- remove legacy compromises

For this migration:

- do not prescribe final backend technology
- do not block React work on backend redesign
- treat backend integration as an external boundary owned separately

## 8. Best migration order

### Phase 0 - foundation

1. Create `apps/web` with Vite React TS.
2. Add workspace config, lint, prettier, test setup.
3. Preserve legacy JS screens as the parity reference.

### Phase 1 - shared app shell

1. Build React shell, navigation, auth context, theme system.
2. Move shared tokens and SCSS foundations.
3. Create reusable primitives: button, input, drawer, modal, table, search panel.

### Phase 2 - first real module

1. Migrate `monitor_laptopow`.
2. Finish UI + behavior + tests end to end.
3. Use it as the template for the next modules.

### Phase 3 - operational modules

1. `wymiana_sprzetu`
2. `rezerwacja_obiadow`
3. `nowe_zatrudnienia`

### Phase 4 - collaborative/dashboard features

1. `notatnik`
2. bookmarks
3. tasks/planner
4. active users
5. weather
6. full dashboard home

## 9. What helps with code quality review

React alone does not solve quality by itself. The main win comes from structure:

- smaller files
- smaller functions
- fewer side effects
- typed contracts
- isolated components
- extracted helpers
- unit-testable business logic

Biggest current code quality risks in this repo:

- very large files, especially auth and hires
- mixed responsibilities in single files
- global mutable state
- lots of manual DOM mutation
- duplicated patterns across modules

## 10. What helps with HLD

For HLD, this migration will look much stronger if you present it as:

- frontend SPA in React
- clear frontend state and view boundaries
- explicit data adapters at the integration boundary
- backend handled separately by another developer
- optional websocket for live collaboration
- deployment details described independently from the React rewrite

Use these architecture layers in your HLD:

1. Presentation layer - React web app
2. Frontend application layer - routing, state, forms, feature flows
3. Integration layer - data adapters, contracts, storage boundaries
4. External services layer - backend owned separately
5. Infra layer - hosting, CI/CD, runtime environment

## 11. Risks

Main risks:

- trying to migrate all pages at once
- copying old DOM code directly into React
- rebuilding auth and dashboard first
- mixing final backend redesign with frontend migration in the same phase

Mitigation:

- migrate module by module
- keep DTOs close to current shapes first
- ship one finished module before starting the hardest ones

## 12. Short recommendation for you

If you want the safest path:

1. Start new React app next to the old project.
2. Rebuild shell, auth context, and UI primitives.
3. Migrate `monitor_laptopow` first.
4. Use that pattern for `wymiana_sprzetu` and `rezerwacja_obiadow`.
5. Leave dashboard home, weather, and chat for later.

If you want the best story for HLD and long-term maintainability, this is much better than trying to "reactify" the current HTML files in place.
