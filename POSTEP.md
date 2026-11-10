# Postęp porządkowania DashboardIT

> Plik prowadzony wspólnie z Claude. Claude tylko podpowiada i aktualizuje ten plik, a kod w projekcie piszę ja.
> Ostatnia aktualizacja: 2026-11-06

## Cel

- Zrozumieć cały kod aplikacji (napisanej przez Codex) i umieć go obronić.
- Uprościć kod tam, gdzie jest zbyt skomplikowany.
- Aplikacja ma działać **offline**, bez połączeń z zewnętrznymi serwerami (CDN, Excel itp.).

## Struktura projektu

- `index.html` to menu główne z 3 kafelkami prowadzącymi do modułów.
- Moduły: `nowe_zatrudnienia.html`, `monitor_laptopow.html`, `wymiana_sprzetu.html`.
- `js/script.js` zawiera kod wspólny dla wszystkich stron. Pozostałe pliki JS obsługują po jednej stronie:
  `dashboard.js`, `monitor.js`, `wymiany.js`, `zatrudnienia.js`.
- `sass/` to źródła stylów. Kompilują się do `styles/css/`, a stron dotyczą tylko pliki z `styles/css/`.
- `img/icons/` zawiera ikony SVG (Font Awesome Free) pobrane lokalnie.
- Git: branch `cleanup`.

---

## ✅ Zrobione

- [x] Usunięte zewnętrzne połączenia sieciowe (CDN, w tym Font Awesome).
- [x] Ikony SVG pobrane lokalnie do `img/icons/`.
- [x] Utworzony branch `cleanup`.
- [x] Omówiony `index.html`.
- [x] Kolory w jednym miejscu: `sass/_colors.scss`. **Od 2026-11-09 tylko zmienne SASS (`$primary` itd.)** —
      blok `:root` i wszystkie `var(--...)` usunięte (decyzja: „definicja koloru w `_colors.scss` i koniec”).
  - `_colors.scss` nie tworzy żadnego CSS (same `$`), więc `@use 'colors' as *;` może być w każdym pliku, który go potrzebuje
    (`style.scss`, `monitor.scss`, `dashboard.scss`).
  - Przezroczystość: `rgba($primary, 0.2)` — SASS sam przelicza kolor.
  - Konsekwencja: ewentualny dark mode w przyszłości wymagałby powrotu do zmiennych CSS.
- [x] Decyzja: ikony przez maskę CSS (a nie `<img>`), żeby zachować kolory, hover i możliwość dark mode.

## 🔧 W toku: naprawa ikon

Problem: `<i class="fa-solid fa-...">` nic nie pokazuje, bo nie ma już biblioteki Font Awesome.
Rozwiązanie: własny plik `sass/_icons.scss` (pseudo-element `::before` + `mask-image` + `currentColor`).

- [x] Krok 1: utworzony `sass/_icons.scss` (wspólna reguła `.fa-solid::before` + reguła dla każdej z 28 ikon).
- [x] Krok 2: `@use 'icons';` dopisane w `sass/style.scss`.
- [x] Krok 3: SASS skompilowany, ikony widać na `index.html`.
- [x] Krok 4a: stary prefiks `class="fas ` zamieniony na `class="fa-solid ` (28 miejsc w 6 plikach).
- [x] Krok 4b: stare nazwy ikon (Font Awesome 5) zamienione na nowe:

| było (stara nazwa) | jest (nowa nazwa)   |
| ------------------ | ------------------- |
| `fa-edit`          | `fa-pen-to-square`  |
| `fa-mouse`         | `fa-computer-mouse` |
| `fa-times`         | `fa-xmark`          |
| `fa-times-circle`  | `fa-circle-xmark`   |
| `fa-info-circle`   | `fa-circle-info`    |
| `fa-shield-alt`    | `fa-shield-halved`  |
| `fa-save`          | `fa-floppy-disk`    |
| `fa-calendar-day`  | `fa-calendar-days`  |

- [x] Krok 5: poprawiona nazwa `.fa-calendar-days` w `sass/_icons.scss:35` (wcześniej przez „Replace All” było podwójne „s”).
- [x] Krok 6: sprawdzone 4 strony; jedyny kwadrat to `fa-file-excel` — zniknie przy zamianie Excela na CSV.
- [ ] Wyjaśnić 4 „pudełka” w akcesoriach (ikona zastępcza `fa-box` z `js/script.js:97`): najechać myszką i odczytać nazwy.

Wnioski:

- Pełny kwadrat zamiast ikony = brak reguły w `_icons.scss` dla tej nazwy albo zła ścieżka do SVG.
- Ścieżka w `url()` liczy się od pliku CSS (`styles/css/`), więc zaczyna się od `../../img/icons/`.
- „Replace All”: zawsze ustawiać _files to include_ i sprawdzać podgląd; uważać, gdy szukany tekst jest częścią innej nazwy
  (`fa-times` ⊂ `fa-times-circle`, `fa-calendar-day` ⊂ `fa-calendar-days`).

## 🎯 Docelowy wygląd (wzór: wersja React z brancha `react`, przepisywana prostym JS)

> **Zasada:** robimy **tylko front-end**, w zwykłym HTML + SASS + JavaScript. **Bez Reacta.** Backend (serwer, API)
> robi kolega. Najnowsza wersja wzorcowa jest na branchu **`react`** (nie `main`) i służy wyłącznie jako podgląd
> „co miało być” (zrzuty, znaczenie pól) — nie kopiujemy z niej kodu.
> Dane trzymamy tak, żeby łatwo było je potem wysyłać do serwera: każdy wpis ma `id`, `createdAt`, `updatedAt`,
> a zapis/odczyt jest w jednym miejscu w kodzie.

Decyzje (2026-11-09):
- **NIE BĘDZIE:** chatu, wymian sprzętu, logowania/kont użytkowników (więc też licznika użytkowników w stopce),
  widgetu pogody, kafelka „W budowie”, przycisku „Edytuj” w menu, pływających przycisków eksportu/importu w lewym dolnym rogu.
- **BĘDZIE (z ekranów wzorcowych):**
  - Menu: nagłówek „SEKCJA WSPARCIA UŻYTKOWNIKÓW / DASHBOARD IT”, kafelki: Nowe Zatrudnienia, Urządzenia w domenie,
    Rezerwacja Obiadów; sekcja **Zakładki** z „+”.
  - Moduły: wspólny pasek nawigacji z ikonami (dom + moduły), nagłówek modułu z ikoną.
  - Nowe Zatrudnienia: przyciski 🔍 szukaj i ➕ dodaj (formularz chowany), nowe kolumny: Service Desk, Użytkownik, Start,
    Laptop SN, Laptop RU, Laptop status, Laptop eMag, Monitor RU, Monitor status, Monitor eMag;
    wybór roku i miesiąca z liczbą wpisów w każdym miesiącu.
- Odpowiedzi (2026-11-09):
  - Zegar z datą w menu: **usuwamy**.
  - Rezerwacja obiadów: **na później**, dla ok. 12 osób; prawdopodobnie będzie serwer (klaster), ale to niepewne.
    → robić na końcu; zapis danych oddzielić od reszty kodu, żeby dało się podmienić `localStorage` na serwer.
  - Eksport/import CSV: przyciski **nad tabelą, obok 🔍 i ➕**.
  - Statusy w zatrudnieniach (listy rozwijane, każda wartość ma swój kolor):
    - Laptop status: W trakcie · Gotowy do wydania · Wydany · Nie odebrano · Ponowna dystrybucja
    - Monitor status: jak laptop + **Nie zamówiono**
    - Laptop eMag: Brak konta · Do potwierdzenia · Potwierdzony
    - Monitor eMag: Brak konta · Dokument wystawiony, do potwierdzenia · Dokument potwierdzony
  - Na zrzutach w formularzu widać akcesoria z nazwami sprzętu (Lenovo, Yealink, Logi Zone, Plecak, Podstawka) — do potwierdzenia
    przy etapie formularza.
  - Urządzenia w domenie (zrzut 2026-11-09): nagłówek z ikoną tarczy i podtytułem „Lista nie odbija komputera automatycznie.
    Ty tylko informacja dla nas!”; 4 karty statystyk z kolorowym dolnym paskiem; tabela w karcie z 🔍 ➕ (+ CSV);
    kolumny: Nazwa (+ druga linia „Imię Nazwisko | data”), RU, Sprzęt/SN (plakietka), W domenie do (plakietka statusu),
    Akcje: ↻ +60 dni, ✎ edycja, 🗑 usuń.
  - Druga linia pod nazwą w monitorze: na branchu `react` (i `main`) to data ostatniej zmiany (`updatedAt`); na zrzucie
    także imię osoby (pola z imieniem nie ma w kodzie na GitHubie — pewnie wersja lokalna z logowaniem). Bez logowania → **„Aktualizacja: RRRR-MM-DD”** (imię można dodać, gdy backend da konta).
  - Wpisy dostaną `id`, `createdAt`, `updatedAt` (Etap 3 i 5) zamiast rozpoznawania po pozycji w tablicy (`data-index`).

### Plan etapów (każdy etap = osobny commit)

- [x] **Etap 1 — wspólne elementy modułów:** nagłówek modułu (ikona + tytuł + podtytuł) i pasek nawigacji
  (🏠 menu, 👤 zatrudnienia, 💻 urządzenia; 🍴 obiady dopiero w Etapie 8). Aktywny moduł podświetlony.
  - Decyzje: moduły otwierają się **w tej samej karcie**; kolor przewodni **czerwony** (jak we wzorze);
    **tryb pełnoekranowy usunięty** — aplikacja zawsze na pełną szerokość.
  - [x] 1a: podpięte `monitor.css` i `zatrudnienia.css` zamiast `dashboard.css` (audyt B7 — style statystyk i tabeli działają).
  - [x] 1b: ikona `fa-house` (SVG + reguła w `_icons.scss`).
  - [x] 1c: usunięty tryb pełnoekranowy (przycisk, kod w `script.js`, style `.fullscreen-btn` i `body.wide-mode`),
    `.wrapper` na pełną szerokość.
  - [x] 1d: przejście w tej samej karcie; przy okazji usunięty martwy `js/dashboard.js` (klasa `is-ready` bez żadnego stylu).
    Commit `fe213b7`.
  - [x] 1e: HTML nagłówka z paskiem nawigacji (`<nav class="module-nav">`, `is-active` + `aria-current="page"`) w obu modułach.
  - [x] 1f: style `.header`, `.module-nav`, `.module-nav-link`, `.module-nav-divider`; tytuł bez Audiowide, w kolorze `--primary`.
  - [x] 1g: kolor przewodni czerwony (`$primary: #c8102e`, `$primary-strong: #8f0b22`, `$primary-soft: #fdecef`);
    wszystkie `var(--x)` → `$x` (regex `var\(--([a-z-]+)\)` → `$$$1`), ręczny fiolet → `rgba($primary, …)`.
- [ ] **Etap 2 — menu główne:** nowy nagłówek („SEKCJA WSPARCIA UŻYTKOWNIKÓW / DASHBOARD IT”), kafelki modułów,
  sekcja **Zakładki** (dodawanie nazwa + adres, zapis w `localStorage`).
  - [x] 2a: jasne tło (`$page-gradient` w `_colors.scss`, jedno dla wszystkich stron), usunięte ukośne paski `::before`
    i ozdobne „kule” (`dashboard-orb`, `dashboard-grid-glow`).
    - [ ] resztka: reguła `.dashboard-orb, .dashboard-grid-glow { display: none }` w `dashboard.scss:362-365`.
  - [x] 2b: nagłówek „Sekcja wsparcia użytkowników / Dashboard IT” (wielkie litery robi CSS), `<title>Dashboard IT</title>`,
    usunięty podtytuł.
  - [x] 2a+: karta menu na pełną szerokość (usunięty `max-width`).
  - [x] 2a+: lokalne czcionki: `sass/_fonts.scss` z `@font-face` (Audiowide 400, Poppins 400/600/700) + `@use 'fonts'`
    w `style.scss` (audyt B8). Commit `09f0e20`.
  - [x] 2c: kafelki jak na zrzucie (niskie, poziome: ikona po lewej, tytuł + opis, biała karta, kolorowa kreska u góry).
    - Lekcja: usuwając regułę CSS, usuwa się **cały blok** (selektor + `{ … }`). Usunięcie samej nazwy klasy zostawia
      np. `body.dashboard-page { width: 58px }`, które działa na całą stronę.
    - [x] HTML w `index.html`: usunięte `card-meta`, nowe teksty („Urządzenia w domenie”, krótsze opisy).
    - [x] Nowa sekcja `Dashboard Navigation Tiles` w `dashboard.scss` (3 kolumny, `display: flex` w kafelku).
    - [x] Usunięte stare nadpisania kafelków w `dashboard.scss` (sekcja `Dashboard Responsive`; `.menu-grid` zostaje).
    - [x] Dokończone usuwanie starych nadpisań kafelków (2026-11-10):
      - `sass/_responsive-large.scss`: `body.dashboard-page .menu-grid { ... }` (2 razy: z 3 i z 4 kolumnami, ok. linie 24 i 47)
        oraz `body.dashboard-page .dashboard-card { min-height: 320px; }` (ok. linia 29);
      - `sass/_responsive-small.scss` (ok. linie 98-125): `body.dashboard-page .dashboard-card`, `.card-icon-shell`,
        `.card-copy`, `.card-copy span`, `.card-copy small`, `.card-meta strong`.
      - Sprawdzenie: kompilacja; `card-meta` w `sass/` i `index.html` → 0 wyników; zwęzić okno (3 → 2 → 1 kolumna). Commit.
  - [x] 2d: stopka jak we wzorze (linia + „© rok IT Support Dashboard by **Arkadiusz Lisiecki**” po prawej) w 3 plikach;
    usunięte: domena z zieloną kropką, `footer-content/-status/-separator`, `@keyframes pulseStatus`.
    Rok przez `getElementById` (audyt C1), bez `DOMContentLoaded` — działa, bo `<script>` jest na końcu `<body>`.
  - [ ] 2e: Zakładki — plan:
    - [ ] 2e-1: HTML + CSS sekcji „Zakładki” z przyciskiem „+” (bez JS).
    - [ ] 2e-2: okienko `<dialog>` z formularzem (Nazwa, Adres), otwierane „+”, zamykane „Anuluj” / Esc.
    - [ ] 2e-3: zapis/odczyt w `localStorage` (nowy klucz w `APP_CONFIG.STORAGE_KEYS`, `try/catch` przy `JSON.parse`).
    - [ ] 2e-4: wyświetlanie zakładek (`createElement` + `textContent`, link w nowej karcie).
    - [ ] 2e-5: dodawanie z walidacją adresu (tylko `http://` / `https://`).
    - [ ] 2e-6: usuwanie zakładki (× z potwierdzeniem).
    - Kod w nowym pliku `js/bookmarks.js`, ładowanym tylko w `index.html`.
  - [ ] 2e: Zakładki — **decyzja (2026-11-09): A, osobiste.** Każdy przypina swoje linki (np. instrukcje na SharePoincie,
    pliki Word/Excel), widoczne tylko dla niego. Zapis w `localStorage` (bez logowania to jedyny sposób na „tylko moje”).
    - Ograniczenia: zakładki są przypisane do przeglądarki na danym komputerze; wyczyszczenie danych przeglądarki je usuwa.
    - Bezpieczeństwo (obowiązkowo): dopuszczać tylko adresy `https://` / `http://` (blokada `javascript:...` w `href`),
      nazwę wstawiać przez `textContent`, nie `innerHTML`.
    - Linki są w przeglądarce użytkownika, nie w kodzie → nie trafiają do publicznego repo.
- [ ] **Etap 3 — Urządzenia w domenie, wygląd i akcje:** karty statystyk, tabela w karcie, pasek narzędzi (🔍 ➕ eksport/import),
  formularz w okienku pod ➕ (`<dialog>`), druga linia pod nazwą, akcje ↻ / ✎ edycja / 🗑.
- [ ] **Etap 4 — Urządzenia: wyszukiwarka** (🔍 filtruje po nazwie, RU, SN).
- [ ] **Etap 5 — Nowe zatrudnienia, dane i tabela:** nowe pola (Service Desk, Laptop SN/RU/status/eMag, Monitor RU/status/eMag,
  nowe akcesoria), kolorowe statusy, formularz w `<dialog>` pod ➕, eksport/import CSV nad tabelą z nowymi kolumnami,
  przeniesienie starych wpisów do nowego formatu.
- [ ] **Etap 6 — Zatrudnienia: wyszukiwarka** we wszystkich miesiącach (pomysł z notatek).
- [ ] **Etap 7 — wybór roku i miesiąca z liczbą wpisów** (prostsza wersja `createMonthPicker`, bez martwego kodu — audyt C4).
- [ ] **Etap 8 — Rezerwacja obiadów** (na końcu; zapis danych w osobnym module, gotowym do podmiany na serwer).
- [ ] **Etap 9 — poprawki z audytu** (bezpieczeństwo A1/A4, B1–B4, B6, B8, porządki C, dostępność).
- Audyt (sekcja „Bezpieczeństwo” i lista priorytetów) — **na samym końcu**.

## 🗑️ Usunięcie modułu „Wymiana sprzętu” (zrobione)

Decyzja (2026-11-09): moduł zastępuje inne, osobne narzędzie. Przy okazji znikają problemy z audytu A3, B5, B10 i większość B6.

- [x] Krok 0: commit obecnych zmian (ikony, kolory, CSV): `667666f`.
- [x] Krok 1: `index.html:59-73`: usunąć kafelek `<a href="wymiana_sprzetu.html" ...>…</a>` (siatka sama dopasuje się do 2 kafelków).
- [x] Krok 2: usunąć pliki: `wymiana_sprzetu.html`, `js/wymiany.js`, `sass/wymiany.scss`,
  `styles/css/wymiany.css`, `styles/css/wymiany.css.map` (`.css` i `.map` ręcznie, SASS ich nie skasuje).
- [x] Krok 3: pozostałości w kodzie wspólnym:
  - `js/script.js:34`: `EXCHANGES: 'wymiana_sprzetu_dane',`
  - `sass/dashboard.scss:324-330` i `342-345`: style kafelka `.menu-item.wymiana-sprzetu`
  - `sass/style.scss`: `.btn-submit-warning/-primary/-muted` (454-464), `.btn-submit-spaced/-tight` (470-476),
    `&.is-tapped` (579-581), `.col-acc` (869-872). **Zostawić** `.btn-submit-soft-danger` (używają zatrudnienia).
  - `sass/_icons.scss`: `fa-calendar-check`, `fa-calendar-days`, `fa-circle-info`, `fa-floppy-disk`,
    `fa-pen-to-square`, `fa-right-left`, `fa-user`, `fa-xmark` (SVG w `img/icons/` opcjonalnie).
- [x] Krok 4: kompilacja SASS; `Ctrl+Shift+F` (bez `POSTEP.md` i `trash/`): `wymian`, `exchange`, `EXCHANGES` → 0 trafień;
  składnia JS OK; tagi SheetJS usunięte z obu stron (= Krok 5 CSV). **Projekt nie łączy się już z żadnym serwerem.**
- [x] Krok 5 (wyczyszczone w DevTools): dane w przeglądarce: usunąć klucz `wymiana_sprzetu_dane` z Local Storage (DevTools → Aplikacja),
  ewentualnie wcześniej przenieść dane do nowego narzędzia; w Monitorze przejrzeć urządzenia z RU `WYMIANA`.
- [x] Decyzja: bez kafelka/linku do nowego narzędzia — menu ma 2 moduły.
- [x] Commit usunięcia modułu: `950d729`. **Moduł wymian usunięty.**

## 📋 Do zrobienia

- [ ] **Następne: Excel (SheetJS z CDN) → własny CSV.** Cel: kopia zapasowa + edycja pliku w Excelu poza aplikacją.
  - Decyzja: CSV bez biblioteki (nie SheetJS lokalnie: ~900 KB cudzego kodu, wersja 0.20.1 ma podatność CVE-2024-22363).
  - Plan: 2 wspólne funkcje w `AppUtils` (`js/script.js:451`): `downloadCSV(rows, fileName)` i `parseCSV(text)`;
    w `monitor.js`, `zatrudnienia.js`, `wymiany.js` podmienić tylko linie z `XLSX.*` (+ `readAsText` zamiast `readAsArrayBuffer`).
  - Pułapki PL Excela: separator `;`, BOM `﻿` dla polskich znaków, zapis jako „CSV UTF-8”, daty `19.11.2026`,
    cudzysłowy dla tekstu z `;`/`"`/nową linią, zera wiodące w SN.
  - Błędy do poprawy przy okazji: import dopisuje zamiast zastępować (`[...devices, ...imported]`) → duplikaty;
    `wymiany.js` eksport nie zapisuje kolumny `Uwagi` (import ją czyta).
  - Decyzja: import **zastępuje** wszystkie dane (z `confirm`).
  - [x] Krok 1: `escapeCSVValue` + `downloadCSV` w `js/script.js` (sekcja „Shared CSV”), dopisane do `AppUtils`.
  - [x] Krok 2: eksport w `monitor.js` → `AppUtils.downloadCSV(...)`. Test w Excelu: kolumny OK, polskie znaki OK.
    - Excel traktuje cyfry jako liczby: znikają zera wiodące, >15 cyfr się psuje. **SN/RU mogą zaczynać się od 0** → Krok 3c.
    - Excel pokazuje datę jako `05-01-2027` (aplikacja: `2027-01-05`) → import musi to odwracać (`normalizeDate`).
    - Decyzja: zapis daty w aplikacji ZOSTAJE `rok-miesiąc-dzień` (wymaga tego `new Date()` w `monitor.js:83,109` i `<input type="date">`).
      Ewentualnie później: tylko wyświetlanie w tabeli jako `05.01.2027`.
  - [x] Krok 3: `splitCSV`, `parseCSV`, `normalizeDate` w `script.js` (+ do `AppUtils`); import w `monitor.js`
    (`readAsText`, `devices = imported`, nowy `confirm`). W `monitor.js` nie ma już `XLSX`.
  - [x] Krok 3c: zera wiodące: `asExcelText` (eksport `="00123"`) dla SN i RU + zdejmowanie `="..."` w `parseCSV`.
    Test na sucho (Node) OK: zera, polskie znaki, `;`/`"`/nowa linia w tekście, puste wiersze, 4 formaty dat.
    - Zasada: funkcja z `script.js` używana w innym pliku musi być dopisana do `window.AppUtils`.
    Ograniczenie: nowe wartości wpisywane w Excelu z apostrofem `'00456` (dopisać podpowiedź przy imporcie).
  - [x] Test kroku 3 w Excelu: OK. RU/SN jako tekst, daty wracają jako `rok-miesiąc-dzień`, brak duplikatów,
    nowy SN `'00456` wpisany w Excelu wrócił jako `00456`. **Monitor laptopów: CSV gotowe.**
  - [x] Krok 4A: `zatrudnienia.js` (2026-11-09): eksport (`asExcelText` dla SN, `downloadCSV`) i import
    (`readAsText`, nowy `confirm`, akcesoria `split(',')` + `trim()`) gotowe; składnia OK.
    - [x] test w Excelu (eksport → edycja → zapis „CSV UTF-8” → import): działa. **Nowe zatrudnienia: CSV gotowe.**
  - ~~Krok 4B: wymiany na CSV~~ → **niepotrzebne: moduł wymian zostaje usunięty** (decyzja 2026-11-09, patrz niżej).
  - [x] Krok 5: usunięte `<script src="https://cdn.sheetjs.com/...">` z `monitor_laptopow.html` i `nowe_zatrudnienia.html`.
  - [x] Krok 6: ikona `fa-file-csv` (nowy SVG, `file-excel` usunięty), napisy „Eksport CSV” / „Import CSV”,
    `accept=".csv"`, podpowiedź `.backup-hint` (CSV UTF-8 + apostrof dla zer) w obu modułach. **CSV zakończone.**
    - Wyjaśnione: zera giną w Excelu w chwili wpisania, kod tego nie odzyska → apostrof albo kolumna w formacie „Tekst”.
  - Sprawdzone: w JS nie ma `fetch`/`XMLHttpRequest`/`WebSocket`/adresów http; Blob + `blob:` URL działa tylko lokalnie.
- [ ] **Bezpieczeństwo: XSS przy wyświetlaniu danych (zaraz po CSV, przed importem prawdziwych danych).**
  Dane trafiają do `innerHTML` bez zabezpieczenia: `js/monitor.js:128-130`, `js/zatrudnienia.js:77-79`
  (+ `renderAccessoryIcons` w `script.js:99,104`).
  Komórka z CSV typu `<img src=x onerror=...>` wykonałaby kod. Poprawka: funkcja `escapeHTML` albo `textContent`.
- [ ] `js/script.js:408`: zamienić `querySelectorAll('#current-year')` na `getElementById('current-year')` (id jest unikalne).
- [ ] Omówić `js/script.js` (kod wspólny), a potem pozostałe pliki JS. Przy okazji: sprawdzić, czy nie ma starego `var` (zamienić na `let`/`const`).
- [ ] Odpowiedzieć na pytania kontrolne z `index.html`:
  - Po co jest `<meta name="viewport">`?
  - Czemu `<script>` jest na końcu `<body>`?
  - Co robi `target="_blank"`?

## 💡 Pomysły na później (z `trash/notatki.txt`)

- Blokada podwójnego kliknięcia „+60 dni” w monitorze laptopów albo pytanie potwierdzające.
- Wyszukiwanie rekordów w całym systemie, nie tylko w danym miesiącu.
- Edycja dodanych rekordów, a nie tylko usuwanie.
- Rezerwacja obiadów (klik na godzinę, limit 4 osoby).
- Podręczny notatnik dostępny na każdej stronie (ikonka w lewym dolnym rogu).
