# Dashboard IT

Projekt zawiera statyczny dashboard w głównym katalogu oraz wersję React w `apps/web`.
GitHub Pages publikuje dashboard z głównego katalogu, zachowując jego obecny interfejs.

## Konto testowe

- Login: `tester`
- Hasło: `test123`
- Rola: DEV — pozwala sprawdzić funkcje interfejsu.

Otwórz panel użytkownika i wybierz „Zaloguj się”. Konto jest dostępne od razu,
także w nowej przeglądarce i na innym urządzeniu; nie wymaga rejestracji.
W wersji React formularz „Zaloguj się” jest w nagłówku.

Konto jest zdefiniowane w `js/shared/test-account.js`, z którego korzystają obie wersje strony.
Zmiana loginu lub hasła dla wszystkich urządzeń wymaga zmiany tego pliku i ponownej publikacji.
Panel nie pozwala zmienić loginu, hasła, roli ani usunąć tego konta.
Pozostałe lokalne konta i ich dane zostają zachowane.

**To konto demonstracyjne.** Login i hasło znajdują się w publicznych plikach strony.
Logowanie służy do testowania interfejsu i nie zabezpiecza dostępu do danych.
Dane dashboardu i sesja są zapisane w przeglądarce; nie są wspólne między urządzeniami.
Wyczyszczenie danych przeglądarki usuwa lokalne wpisy, ale konto testowe pozostaje dostępne.

## GitHub Pages

1. Wyślij projekt do repozytorium GitHub na gałęzi `main` albo `master`.
2. W repozytorium otwórz **Settings → Pages → Build and deployment → Source** i wybierz **GitHub Actions**.
3. W **Actions** uruchom **Publish GitHub Pages** przez **Run workflow** albo wykonaj kolejny push.
4. Otwórz adres pokazany w **Settings → Pages**. Dla obecnego repozytorium będzie to
   `https://straffix.github.io/DashboardIT/`, jeśli nie skonfigurujesz własnej domeny.
5. Zaloguj się danymi konta testowego.

Workflow publikuje wyłącznie pliki strony, skrypty, style, grafiki i fonty.
Ścieżki względne działają także pod adresem zawierającym nazwę repozytorium.
Nie trzeba uruchamiać PHP, bazy danych ani serwera aplikacji.

Można także użyć **Deploy from a branch → main/master → /(root)**: plik `.nojekyll`
pozwala opublikować statyczną stronę bez przetwarzania przez Jekyll.

## Sprawdzenie lokalne

```sh
npm run build:pages
node --test --test-isolation=none tests/*.test.cjs
```

Wynik przygotowania publikacji znajduje się w `_site/`. Nie jest zapisywany w Git.

Wersja React:

```sh
npm ci
npm run dev:web
npm run build:web
```
