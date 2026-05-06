# Status Wdrozenia DashboardIT

## Status ogolny

Aktualny stan projektu:

- frontend dziala na statycznych plikach `HTML/CSS/JS`
- backend dziala w katalogu `api/` na `PHP`
- zapis danych jest oparty o `PostgreSQL`
- aplikacja startuje od pustych danych
- mechanizm przykladowych danych i przyciski demo zostaly usuniete

## Co jest gotowe

- logowanie i sesje `PHP`
- role `user` i `admin`
- prywatne zakladki uzytkownika
- rezerwacja obiadow
- notatnik, ogloszenia i zadania
- monitor laptopow
- nowe zatrudnienia
- wymiana sprzetu
- wspolna warstwa serwisow po stronie frontu
- relacyjny model danych po stronie backendu

## Architektura danych

Najwazniejsze zalozenie pozostaje bez zmian:

- frontend korzysta z jednej warstwy serwisow
- UI nie powinno wykonywac bezposrednich zapytan SQL
- backend odpowiada za walidacje i zapis do bazy
- frontend moze lokalnie cache'owac dane tylko pomocniczo

## Co zostalo jeszcze do sprawdzenia

- pierwsze polaczenie z docelowym hostingiem
- potwierdzenie czy hosting wymaga `sslmode=require`
- reczne QA po wdrozeniu na serwer
- potwierdzenie, ze `pdo_pgsql` jest aktywne na hostingu

## Najkrotszy wniosek

Projekt jest przygotowany do pracy na `PHP + PostgreSQL` bez wersji pokazowej i bez danych startowych.
