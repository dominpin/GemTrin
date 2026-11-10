# GemTrin

Rozszerzenie przeglądarki (Manifest V3), które dokłada panel boczny do `gemini.google.com`.
Powstało na wzór [groundtron-side-tree](../../groundtron-side-tree) (ten sam panel, układ i
zwyczaje, tylko dla Claude) i jest przerobione pod Gemini: pod to, co pokazuje strona Gemini,
pod zalecenia Google dotyczące promptów i pod limity kontekstu aplikacji Gemini.

Czyta tylko stronę, która i tak jest na ekranie, niczego nie wysyła i nie prosi o żadne
uprawnienia. English version: [README.md](../README.md).

## Co pokazuje panel

**Pasek u góry.** Mniej więcej ile tokenów zajmuje rozmowa wobec okna Twojego planu Google AI
(`≈ 18,2k / 32k tok · 57%`). Pasek robi się żółty od połowy i czerwony od 80%. Gdy w ostatnich
odpowiedziach Gemini jest lista zadań (`☑ / ☐`, `- [x] / - [ ]`), niżej widać pasek postępu.
Kliknięcie paska otwiera zakładkę Kontekst, a `×` zwija panel do uchwytu przy krawędzi okna.
Uchwyt pokazuje kolor zajętości jako kropkę.

**Pliki.** To, co rozmowa dostała i wytworzyła, jako drzewko:

| Folder | Co | Znak |
| --- | --- | --- |
| Załączone | pliki dołączone przez Ciebie (kafelki w Twoich wiadomościach) | `↑` niebieski |
| Canvas | dokumenty Canvas i Deep Research (kafelki w odpowiedziach) | `✚` zielony przy utworzeniu, `●` fioletowy, gdy wrócił zmieniony |
| Kod | bloki kodu, które nazywają plik, jako drzewko ścieżek | `✚` / `●` jak wyżej |
| Obrazy | obrazy w odpowiedziach | `▣` żółty |

Nazwę blokowi kodu daje jego pierwszy komentarz (`// file: src/app.ts`, `# lib/format.py`,
`<!-- index.html -->`) albo wiersz tuż przed nim („Wstaw to do `utils/dates.py`:”). Słowa, które
tylko wyglądają jak pliki (`object.Property`, `v2.1.3`, `onet.pl`, adres e-mail), nigdy nimi nie
są. Bloki bez nazwy pliku chowa przełącznik **fragmenty**.

Wiersz zapala się, gdy Gemini doda albo zmieni element, i przez 8 sekund zostaje z paskiem z
boku; **podążaj** przewija drzewko do najnowszego. Kliknięcie wiersza przewija stronę do
elementu, który mignie. Wiersz Canvas klika kafelek, więc Gemini sam otwiera dokument. Gdy
Canvas jest otwarty, panel zwija się do uchwytu i wraca, gdy Canvas się zamknie.

**Podpowiedzi.** Piszesz jak zwykle w polu wiadomości Gemini. Dziewięć wzorców odhacza się,
gdy szkic je spełnia. Wszystkie pochodzą z zaleceń Google:

- **rola** (persona), **zadanie wprost**, **kontekst**, **format**: cztery części przewodnika
  *Prompting guide 101* i rada *pisz precyzyjnie i bezpośrednio* dla Gemini 3;
- **granice** i **przykład**: ograniczenia i przykłady few-shot z *Prompt design strategies*
  („zawsze dawaj przykłady”);
- **rozdziel części**: znaczniki XML *albo* nagłówki Markdown, jeden styl, nie oba;
- **pytanie na końcu**: tylko przy długich szkicach, najpierw materiał, na końcu pytanie, jak w
  przewodniku *Long context*;
- **powiedz, jak szczegółowo**: Gemini 3 domyślnie odpowiada zwięźle.

Brakujący wzorzec mówi, po co jest, a kliknięcie wstawia przykład do pola. Nad wzorcami licznik
słów porównuje szkic z „udane prompty mają średnio ok. 21 słów” z przewodnika. Pod nimi jest
siedem gotowych promptów (streszczenie PDF, porównanie dokumentów, zlecenie dla Deep Research,
szkic w Canvas, wyjaśnienie kodu, przeredagowanie e-maila, długi dokument z pytaniem na końcu)
oraz zasady z linkami do źródeł. Odhaczenia są liczone ze słów, więc to wskazówka, nie ocena.

**Kontekst.** Wybierasz plan (strona go nie zdradza) i widzisz, co jest liczone: Twoje
wiadomości, odpowiedzi Gemini, obrazy, pliki, których nie da się policzyć, szkic w polu,
najdłuższą odpowiedź (klik przewija do niej) i rady, gdy okno się zapełnia. **Kontrola strony**
pokazuje, który selektor znalazł każdą część strony. Tam warto zajrzeć najpierw, gdy strona
Gemini się zmieni.

## Liczby i ich źródła

| | Wartość | Źródło |
| --- | --- | --- |
| Okno kontekstu bez planu | 32k tokenów | Centrum pomocy Gemini, *Gemini Apps limits & upgrades* |
| AI Plus | 128k tokenów | to samo |
| AI Pro, AI Ultra | 1M tokenów | to samo |
| Tekst | ok. 4 znaki na token; 100 tokenów to ok. 60–80 słów angielskich | Gemini API, *Understand and count tokens* |
| Obraz | 258 tokenów do 384 px; większe w kafelkach 768 × 768 po 258 | to samo |
| API, dla porównania | 1 048 576 wejścia / 65 536 wyjścia (Gemini 3 i 2.5) | to samo |
| „Udane prompty mają średnio ok. 21 słów” | | *Prompting guide 101* (znane z omówień przewodnika) |

Wszystko to leży w [`src/limits.js`](../src/limits.js) razem z datą sprawdzenia (2026-11-10).
Gdy Google zmieni limit, poprawia się tylko ten plik.

To są **szacunki**. Rozszerzenie nie widzi prawdziwej liczby tokenów. Liczy tylko tekst widoczny
na stronie i tylko wczytane tury (w długiej rozmowie przewiń w górę, by wczytać starsze). Nie
liczy zawartości plików, ukrytego myślenia Gemini, zawartości Canvas ani instrukcji Gemów.
Języki inne niż angielski, także polski, zwykle potrzebują więcej tokenów niż jeden na 4 znaki.

## Instalacja

### Chrome, Edge, Brave

1. Otwórz `chrome://extensions` (`edge://extensions`, `brave://extensions`) i włącz **Tryb
   dewelopera**.
2. Kliknij **Załaduj rozpakowane** i wskaż ten folder.

Chrome może ostrzec o nieznanym kluczu `browser_specific_settings`. To klucz dla Firefoksa,
rozszerzenie działa mimo niego.

### Firefox (128 lub nowszy)

1. Otwórz `about:debugging#/runtime/this-firefox`.
2. Kliknij **Wczytaj tymczasowy dodatek** i wskaż `manifest.json` w tym folderze.

Tymczasowy dodatek znika po restarcie; na stałe trzeba go podpisać na `addons.mozilla.org`.
Manifest deklaruje, że dodatek nie zbiera danych (`data_collection_permissions: none`). Firefox
może poprosić o zgodę na działanie na `gemini.google.com`.

## Uprawnienia i prywatność

Żadnych. W `manifest.json` nie ma `permissions` ani `host_permissions`. Skrypt działa tylko na
`https://gemini.google.com/*`. Własne ustawienia panelu (zwinięcie, zakładka, szerokość, język,
plan, zwinięte foldery) zapisuje w `localStorage` tej strony pod kluczami `gtr:`. Niczego nie
wysyła i nigdy sam nie pisze ani nie wysyła wiadomości: gotowe prompty trafiają do pola dopiero
po kliknięciu.

Panel jest budowany wyłącznie przez `createElement` i `textContent`, nigdy z napisów HTML, więc
działa też na stronach z wymuszonym Trusted Types, jakie Google często stosuje.

## Języki

Angielski i polski, wybierane według języka przeglądarki i przełączane po prawej stronie paska
zakładek. Każdy język to jeden plik w [`src/i18n`](../src/i18n); `test/unit.html` sprawdza, czy
każdy język ma wszystkie teksty. Nazwa i opis w manifeście są w [`_locales`](../_locales).

## Gdy strona Gemini się zmieni

Wszystkie selektory GemTrin są w [`src/selectors.js`](../src/selectors.js), jako łańcuchy
próbowane po kolei. **Kontrola strony** na zakładce Kontekst pokazuje, który wpis każdego
łańcucha zadziałał. Gdy wiersz mówi *brak na stronie*, a strona wyraźnie to ma, sprawdź element
w DevTools, dopisz jego selektor na początek łańcucha i przeładuj rozszerzenie.

## Czego nie sprawdzono

- **Prawdziwej strony gemini.google.com.** Wszystko testowano na `test/harness.html`, który
  odtwarza strukturę opisaną przez otwarte narzędzia do Gemini (`user-query`, `model-response`,
  `message-content`, `code-block`, `rich-textarea .ql-editor`). Te części są pewnie dobre.
  Selektory **kafelków załączników, kafelków i panelu Canvas, obrazów w odpowiedziach, panelu
  myślenia i linku logowania** to rozsądne przypuszczenia z ogólnymi zapasowymi wpisami: żadne
  publiczne źródło ich nie opisuje. Na prawdziwej rozmowie zacznij od Kontroli strony.
- **Wczytania w prawdziwej przeglądarce** (*Załaduj rozpakowane* w Chrome, tymczasowy dodatek w
  Firefoksie). Manifest, pliki i kolejność skryptów sprawdza `test/unit.html`, ale rozszerzenie
  nie było zainstalowane i otwarte na Gemini.
- **Prawdziwego telefonu.** Wąski układ sprawdzono tylko w oknie o szerokości 500 px.
- **Liczby „~21 słów”**: pochodzi z omówień *Prompting guide 101*; strona samego przewodnika
  nie wczytała się podczas sprawdzania.

## Testy

W tym folderze:

```bash
python -m http.server 8731
```

- `http://127.0.0.1:8731/test/unit.html`: ok. 170 sprawdzeń estymatora, wzorców podpowiedzi,
  reguł nazw plików, obu języków, selektorów, manifestu oraz przegląd źródeł pod kątem napisów
  HTML i `eval`.
- `http://127.0.0.1:8731/test/harness.html`: udawana rozmowa w Gemini z prawdziwym panelem.
  Przyciski u dołu streamują odpowiedź z blokiem kodu, dołączają plik, zmieniają Canvas,
  dodają obraz, wypełniają szkic, przełączają motyw, otwierają Canvas, zmieniają rozmowę i
  wylogowują. W konsoli `gtrCheck()` porównuje to, co znalazł panel, z tym, co jest na stronie.
- `http://127.0.0.1:8731/test/harness.html?auto=1`: ta sama strona sama przechodzi scenariusz
  (41 sprawdzeń) i zapisuje wynik na stronie i w tytule (`GTR PASS 41/41`).
  `?shot=files|hints|context|context-warn|light|collapsed|pl` ustawia jeden stan do zrzutu
  ekranu.

Obie strony testowe włączają Trusted Types, więc zabłąkane `innerHTML` w rozszerzeniu wywraca
test.

Foldery `test/` i `tools/` nie są częścią rozszerzenia; przy wysyłce do sklepu można je pominąć.

Ikony: `powershell -ExecutionPolicy Bypass -File tools/make-icons.ps1`.
