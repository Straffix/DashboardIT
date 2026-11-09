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
- [x] Kolory w jednym miejscu: blok `:root` (zmienne CSS) przeniesiony do `sass/_colors.scss`;
      `@use 'colors'` tylko w `style.scss`; w pozostałych plikach kolory przez `var(--nazwa)`. Sprawdzone: `:root` jest tylko w `style.css`.
  - Zasada: zmienne `$` (SASS) istnieją tylko przy kompilacji; zmienne `--` (CSS) żyją w przeglądarce i można je zmieniać (np. dark mode).
  - Do sprzątnięcia: zakomentowana linia `// color: $text-main;` w `sass/dashboard.scss:173`.
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
  - [ ] **▶ NASTĘPNE — Krok 4B: `wymiany.js`** (eksport `js/wymiany.js:227-246`, import `248-288`):
    - eksport: `asExcelText` dla `'Stary SN'` i `'Nowy SN'`; **dodać kolumnę `Uwagi: exchange.notes || ''`**;
      4 linie `XLSX` → `AppUtils.downloadCSV(data, \`wymiany_....csv\`)`,
    - import: `parseCSV` + `rows.map`, `plannedDate: AppUtils.normalizeDate(row.Data) || new Date().toISOString().split('T')[0]`,
      `exchanges = imported`, nowy `confirm`, `readAsText(file, 'UTF-8')`, tekst błędu w `catch` → „Błąd importu pliku CSV.”,
    - do decyzji: usunąć „zapasowe” nazwy kolumn Codexa (`row.Użytkownik`, `'SN do zwrotu'`, `'SN do wydania'`,
      `'Data planowanej wymiany'`), skoro plik robi tylko nasza aplikacja,
    - sprawdzenie: `Ctrl+Shift+F` „XLSX” → mają zostać tylko 3 linie `<script>` w HTML (wtedy Krok 5).
  - [ ] Krok 5: DOPIERO TERAZ usunąć `<script src="https://cdn.sheetjs.com/...">` z 3 plików HTML; przeklikać eksport/import, Konsola bez błędów.
  - [ ] Krok 6: teksty i ikona przycisków, `accept=".csv"`, podpowiedź „zapisz w Excelu jako CSV UTF-8”.
  - Sprawdzone: w JS nie ma `fetch`/`XMLHttpRequest`/`WebSocket`/adresów http; Blob + `blob:` URL działa tylko lokalnie.
- [ ] **Bezpieczeństwo: XSS przy wyświetlaniu danych (zaraz po CSV, przed importem prawdziwych danych).**
  Dane trafiają do `innerHTML` bez zabezpieczenia: `js/monitor.js:132-134`, `js/zatrudnienia.js:77-79`,
  `js/wymiany.js:100`, `js/wymiany.js:116` (+ sprawdzić `renderAccessoryIcons` i popover w `script.js`).
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
