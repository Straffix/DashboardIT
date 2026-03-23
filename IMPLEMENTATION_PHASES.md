# Plan Wdrożenia Zmian - Etapy

## Cel dokumentu

Ten dokument porządkuje plan rozwoju aplikacji `DashboardIT` na etapy wdrożeniowe.

Założenie:

- na ten moment aplikacja działa bez backendu
- pierwszy etap ma być wersją pokazową / demo-ready
- architektura powinna być przygotowana pod późniejsze podłączenie backendu
- frontend nie powinien być później przepisywany od zera

---

## Ogólna strategia

Najpierw budujemy fundament użytkownika i struktury danych, a dopiero później dokładamy nowe moduły.

Powód:

- logowanie wpływa na wszystkie kolejne funkcje
- role wpływają na zadania i uprawnienia
- identyfikacja autora wpływa na istniejące rekordy
- rezerwacje i notatnik powinny korzystać z tego samego systemu użytkowników

---

## Etap 1 - Fundament użytkownika i przygotowanie aplikacji

### Główny cel

Przygotować aplikację na użytkowników, sesję, role i historię zmian.

### Zakres prac

- dodać lokalny system rejestracji i logowania oparty o `localStorage`
- dodać sesję zalogowanego użytkownika
- dodać profil użytkownika:
  - imię i nazwisko
  - login
  - avatar
  - rola `user` / `admin`
- przygotować warstwę serwisów:
  - `authService`
  - `usersService`
  - `sessionService`
- przygotować wspólny sposób pobierania aktywnego użytkownika na wszystkich stronach
- rozszerzyć istniejące wpisy w modułach:
  - `Nowe zatrudnienia`
  - `Monitor laptopów`
  - `Wymiana sprzętu`
  o pola:
  - `createdBy`
  - `updatedBy`
  - `createdAt`
  - `updatedAt`
- pokazać w UI informację, kto dodał i kto ostatnio edytował rekord
- dodać kafelek `Rezerwacja obiadów` na dashboardzie
- dodać kafelek `Notatnik` na dashboardzie
- dodać prywatne zakładki użytkownika na stronie głównej dashboardu

### Efekt końcowy etapu

- użytkownik może się zarejestrować i zalogować
- system rozpoznaje, kto pracuje na aplikacji
- istniejące rekordy mogą być podpisane autorem i edytorem
- dashboard jest gotowy na nowe moduły
- zakładki działają jako funkcja przypisana do konta użytkownika

### Ryzyka

- logowanie bez backendu jest tylko wersją pokazową
- hasła w wersji lokalnej nie są rozwiązaniem produkcyjnym
- sesja użytkownika będzie lokalna dla przeglądarki

---

## Etap 2 - Prywatne zakładki użytkownika

### Główny cel

Dodać szybki dostęp do ważnych linków i plików z poziomu dashboardu.

### Zakres prac

- przygotować UI sekcji zakładek na stronie głównej
- umożliwić dodawanie zakładek przez zalogowanego użytkownika
- umożliwić edycję i usuwanie zakładek
- zapisywać:
  - nazwę zakładki
  - adres URL
  - opcjonalnie ikonę lub typ linku
- przypisać zakładki do zalogowanego użytkownika
- przygotować `bookmarksService`

### Efekt końcowy etapu

- każdy użytkownik ma własny zestaw szybkich linków
- dashboard staje się bardziej praktyczny na co dzień

### Priorytet

Ten etap można wykonać zaraz po etapie 1, bo jest stosunkowo mało ryzykowny i szybko daje widoczny efekt.

---

## Etap 3 - Rezerwacja obiadów

### Główny cel

Uruchomić osobny moduł rezerwacji godzin obiadowych.

### Zakres prac

- utworzyć nową stronę `.html` dla rezerwacji obiadów
- podpiąć nowy kafelek dashboardu do tej strony
- przygotować widok slotów czasowych od `11:00` do `15:00`
- ustawić interwał `co 30 minut`
- umożliwić kliknięcie i zapisanie się na wybrany slot
- umożliwić anulowanie własnej rezerwacji
- pokazać listę osób zapisanych na dany slot
- ograniczyć tworzenie rezerwacji tylko do zalogowanych użytkowników
- wprowadzić limit `4 osób` na jeden slot
- przygotować `lunchService`

### Proponowany zakres godzin

- `11:00`
- `11:30`
- `12:00`
- `12:30`
- `13:00`
- `13:30`
- `14:00`
- `14:30`
- `15:00`

### Efekt końcowy etapu

- działa osobny moduł obiadowy
- użytkownik może się zapisać na godzinę obiadu
- system pilnuje limitu miejsc w ramach aktualnego źródła danych

### Ograniczenie wersji bez backendu

Bez wspólnej bazy danych limit `4 osób` będzie wiarygodny tylko w obrębie jednej lokalnej bazy danych w przeglądarce.

---

## Etap 4 - Notatnik i tablica zespołu

### Główny cel

Zbudować osobny moduł wspólnych notatek, ważnych informacji i komunikacji operacyjnej.

### Zakres prac

- utworzyć nową stronę `.html` dla notatnika
- podpiąć nowy kafelek dashboardu do tej strony
- przygotować sekcję zwykłych notatek
- przygotować sekcję ważnych tematów / tablicy u góry ekranu
- pozwolić każdemu zalogowanemu użytkownikowi dodawać notatki
- zapisywać autora notatki oraz czas utworzenia / edycji
- przygotować `notesService`

### Efekt końcowy etapu

- użytkownicy mają jedno wspólne miejsce na gotowe teksty i ważne informacje
- aplikacja zyskuje realną wartość organizacyjną dla zespołu

---

## Etap 5 - Zadania przypisywane do użytkowników

### Główny cel

Rozszerzyć notatnik o zadania przypisywane do konkretnych osób.

### Zakres prac

- dodać sekcję zadań do modułu notatnika
- umożliwić tworzenie zadania przez `admina`
- umożliwić przypisanie zadania do użytkownika
- przy zadaniu pokazywać:
  - avatar użytkownika
  - imię i nazwisko
- dodać statusy zadań:
  - `todo`
  - `in_progress`
  - `done`
- dodać priorytet zadania
- dodać autora zadania i historię zmian
- przygotować `tasksService`

### Uprawnienia

- zwykły użytkownik może widzieć zadania
- tylko `admin` może przypisywać zadania innym użytkownikom

### Efekt końcowy etapu

- notatnik staje się operacyjną tablicą zadań
- w systemie pojawia się prosty podział odpowiedzialności

---

## Etap 6 - Uporządkowanie UX i spójności systemu

### Główny cel

Dopiąć spójność działania wszystkich modułów i poprawić doświadczenie użytkownika.

### Zakres prac

- ujednolicić widok użytkownika na wszystkich stronach
- dodać wspólny panel profilu / avatara
- ujednolicić komunikaty systemowe
- dopracować walidacje i błędy
- dopracować responsywność nowych modułów
- sprawdzić spójność kolorów, typografii i komponentów
- uporządkować serwisy i modele danych

### Efekt końcowy etapu

- aplikacja wygląda jak jeden spójny system
- nowe moduły nie odstają od już istniejących

---

## Etap 7 - Przygotowanie do migracji na backend

### Główny cel

Zamknąć wersję demo tak, aby późniejsze podpięcie backendu było możliwie proste.

### Zakres prac

- uporządkować strukturę serwisów
- ujednolicić modele danych na froncie
- dodać krótkie `TODO` przy miejscach planowanej integracji z API
- opisać kontrakty danych
- przygotować dokument handoffu dla programisty backendowego
- ograniczyć bezpośrednie użycia `localStorage` tylko do warstwy serwisów

### Efekt końcowy etapu

- frontend jest gotowy do migracji
- inny programista może podmienić źródło danych bez rozwalania UI

---

## Docelowy etap po uzyskaniu backendu

### Zakres

- przenieść logowanie do backendu
- przenieść użytkowników do wspólnej bazy danych
- przenieść wszystkie moduły danych do wspólnego API
- dodać prawdziwe ograniczenia i walidacje po stronie serwera
- zapewnić współdzielenie danych między wszystkimi użytkownikami i komputerami

### Co zostaje z frontu

- układ stron
- komponenty UI
- logika formularzy
- widoki tabel
- warstwa interakcji użytkownika

### Co się zmienia

- implementacja serwisów danych
- logowanie i sesja
- trwałe przechowywanie danych
- egzekwowanie ról i limitów po stronie backendu

---

## Kolejność rekomendowana

Najbardziej rozsądna kolejność realizacji:

1. Etap 1 - użytkownicy, role, sesja, historia zmian, kafelki nowych modułów
2. Etap 2 - prywatne zakładki
3. Etap 3 - rezerwacja obiadów
4. Etap 4 - notatnik
5. Etap 5 - zadania przypisywane do użytkowników
6. Etap 6 - spójność UX i dopracowanie
7. Etap 7 - przygotowanie do migracji backendowej

---

## MVP wersji pokazowej

Jeśli celem jest szybkie pokazanie działającej aplikacji, minimalny sensowny zakres `MVP` to:

- lokalne logowanie i użytkownik
- role `user/admin`
- podpisy autora i edytora przy rekordach
- prywatne zakładki
- osobna strona rezerwacji obiadów
- osobna strona notatnika
- zadania przypisywane przez admina

---

## Najkrótsze podsumowanie

Plan rozwoju aplikacji powinien zacząć się od fundamentu użytkownika i danych, a dopiero potem przechodzić do nowych modułów funkcjonalnych.

Wersja bez backendu ma pełnić rolę działającego demo, ale architektura powinna być od początku przygotowana tak, aby w kolejnym kroku przepiąć warstwę danych na API i wspólną bazę.

