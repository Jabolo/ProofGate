# ProofGate — wizja, misja i zgodność z Goldman Sachs

**3 października 2026. Status: audyt dokumentacji COMPLETE; zgodność działającego produktu PENDING.**

Kierunek odpowiada głównemu celowi zadania Goldman Sachs: umożliwić produktywne używanie agentów AI przy egzekwowaniu ochrony danych, uprawnień i zasobów. Obecny zakres pokrywa wymagania na poziomie projektu. Nie mamy jeszcze dowodów, że cały produkt je spełnia w wykonaniu. Pozostają jawne niejasności źródeł i formalności opisane poniżej.

## Uzgodniona misja i wizja

**Misja:** umożliwiać organizacjom dawanie agentom AI użytecznej autonomii przy zachowaniu egzekwowalnej kontroli nad danymi, działaniami i wydatkami.

**Wizja:** lekka, konfigurowalna, hybrydowa warstwa kontroli AI, którą deweloper łatwo integruje, zespół bezpieczeństwa potrafi przeanalizować, a operator może sprawdzić przez zmianę polityki i obserwację rzeczywistych skutków w czytelnym, dopracowanym workbenchu.

Dokładne angielskie brzmienie zaakceptowane przez właściciela w równoległym czacie:

> **Mission:** Let organizations give AI agents useful autonomy while retaining enforceable control over data, actions and spending.

> **Vision:** ProofGate is a lightweight, configurable hybrid control layer: developers integrate it easily, security teams inspect decisions, and judges can change policies and verify real outcomes in a polished workbench.

**Obietnica demo:** „Agent kończy użyteczne zadanie, a Ty widzisz, dlaczego dana interakcja została dopuszczona, zredagowana lub zatrzymana — i możesz sprawdzić jej rzeczywisty skutek”. Jest to cel do wykazania, nie obecne twierdzenie o skuteczności.

Produkt to warstwa kontroli. Asystent przygotowania wydania demonstruje jej działanie. Zachowujemy ten wybór: jest bliski pracy dewelopera i pozwala czytelnie pokazać konflikt między produktywnością, poufnością, integralnością wyniku i kosztem. Brief wprost pozwala zbudować własnego agenta lub użyć istniejącego, a ocenia warstwę kontroli. Nie wymaga scenariusza tradingowego ani danych bankowych. [Brief, §§1–3,5](https://drive.google.com/file/d/1oGwpQ5sD-x5I9ERwCQJvz-gfbHJ5aGYG/view).

## Jak pokazać wartość

Przepływ ekranu: **Evidence → Control Decision → Useful Result**.

1. Agent czyta syntetyczne prywatne notatki projektu oraz niezależne, czyste fakty o zależności. Powstaje wewnętrzny draft ze źródłową i docelową wersją, breaking change i dopuszczonymi cytowaniami. Niezależny rejestr narzędzia potwierdza zapis.
2. Zatruty advisory próbuje skłonić agenta do ujawnienia notatek lub pominięcia breaking change. Checker faktycznie ocenia treść przed jej udostępnieniem aktorowi. Podejrzany advisory trafia w całości do kwarantanny; przydatne fakty pochodzą z osobnego czystego źródła.
3. Workbench pokazuje powód decyzji, wersję polityki, wykluczone źródło, wynik oraz liczbę rzeczywistych zapisów. Brak wystarczających faktów daje jawny wynik niekompletny.
4. Sędzia zmienia kontrolę, próg, feed albo budżet. Kolejny przebieg pokazuje rzeczywiście obowiązującą politykę i wynik. Eksport i testy potwierdzają to samo zachowanie.

Deterministyczna blokada publicznego zapisu wykazuje ochronę przepływu danych. Nie dowodzi wkładu AI. Dlatego przypadek zatajenia breaking change przy dozwolonym zapisie wewnętrznym ma wykazać osobno semantyczne wykluczenie źródła. Poprawę wyniku przypisujemy semantyce tylko wtedy, gdy rzeczywiste przebiegi on/off to potwierdzają. Jeśli aktor sam odpiera atak w obu wariantach, raportujemy ten wynik uczciwie. Ręczny replay pozostaje replayem; „próba agenta” wymaga propozycji rzeczywistego modelu.

## Co potwierdziliśmy

- Ponownie odczytano oba aktualne PDF-y przez konektor Google Drive. Znormalizowana treść obu jest identyczna z zachowanymi kopiami źródłowymi; metadane modyfikacji: brief 08:50:58.140Z, regulamin 08:50:47.117Z, 3 października.
- Odczytano zaakceptowaną przez właściciela misję/wizję oraz bieżące README, PROJECT, REQUIREMENTS, ROADMAP i TASK-CONTRACT w głównym checkoutcie. Obecny zakres ma 21 wymagań z przypisaniem do czterech faz; wszystkie mają status Pending.
- W istniejącym materiale readiness są cztery poprawnie sparsowane, zgodne ze schematem odpowiedzi syntetyczne: jedna aktora i trzy checkera. Było też wcześniejsze czterowywołaniowe badanie ze zbyt restrykcyjnym parserem. Osiem wywołań łącznie nie oznacza ośmiu zaakceptowanych wyników. To gotowość integracji, nie dowód działających kontroli produktu.
- Zapisano hashe źródeł i pięciu bieżących dokumentów wejściowych w [SOURCE-EVIDENCE.json](../.planning/quick/261003-s4v-clarify-proofgate-vision-mission-and-aud/SOURCE-EVIDENCE.json).

**Pochodzenie i integracja:** audyt powstał w worktree opartym na `94556bd`, podczas konsolidacji głównego checkoutu `/Users/michaljablonski/Documents/ChatGPT/HackYeah`. Odczytał nowe dokumenty głównego checkoutu jako wejście; SOURCE-EVIDENCE zachowuje hashe tego historycznego odczytu. Na polecenie właściciela 3 października scalono gałąź audytu z `master`, zachowując nowszy zakres i kontekst fazy End-to-End Governed Workbench. Aktualnymi wejściami planera pozostają PROJECT, REQUIREMENTS, ROADMAP i kontekst tej fazy; audyt jest dodatkowym materiałem kontrolnym. Starszy zakres incydentowy pozostaje w archiwum.

## Mapa wymagań → zakres → dowód

G01–G22 pochodzą z TASK-CONTRACT, a identyfikatory CORE/SAFE/POL/RES/OBS/TEST/SHIP z aktualnego REQUIREMENTS głównego checkoutu. „Pokryte w projekcie” oznacza zapisane zobowiązanie; nie oznacza testu PASS.

| ID | Oczekiwanie źródłowe | Pokrycie w aktualnym projekcie | Dowód wymagany przed odbiorem |
|---|---|---|---|
| G01 | Lekka, łatwa do integracji warstwa przechwytująca | CORE-01, CORE-02, SAFE-01 | Udokumentowany gateway, rzeczywisty MCP, użyteczny wynik i odmowa przed niedozwolonym wywołaniem. |
| G02 | Kontrole deterministyczne **i** semantyczne AI | SAFE-02, SAFE-03, SAFE-04, TEST-02 | Obie ścieżki wykonane; faktyczna decyzja AI zmienia dopuszczenie treści. Allow AI nie znosi zakazu deterministycznego. |
| G03 | Jedno źródło polityki: kontrole, czułość, modele, budżety | POL-01, POL-02, SAFE-03 | Zmiana każdej kategorii bez edycji kodu; identyfikator aktywnej polityki w następnym przebiegu. |
| G04 | Przykładowe poziomy strictness i budżetu | POL-01 | Dwa udokumentowane profile z przewidywalną różnicą i jawne jednostki. |
| G05 | Zarządzanie zasobami/budżetem; rozważenie API i modeli lokalnych | RES-01, RES-02, RES-03, SHIP-01 | Below/above-limit, wspólny allowance aktora/checkera/narzędzi, zgodność prób i ledgeru; opis rozszerzenia lokalnego. Hosted-only pozostaje kwalifikacją. |
| G06 | Znany atak historyczny i aktualizowalne sygnatury | SAFE-06, POL-01, POL-03, TEST-01 | Nazwany przypadek ze źródłem, bezpieczny analog i benign counterpart; zmiana feedu niebędącego kodem; niezależny pomiar skutków. |
| G07 | Diagram architektury | SHIP-01 | Diagram odpowiada uruchomionej topologii, granicom danych, poświadczeń i egzekwowania. |
| G08 | Interaktywny dashboard | OBS-02 | Rzeczywiste sterowanie/odczyt polityki, posture, decyzje, zasoby i skutki. |
| G09 | Reporting live i eksportowalny audyt | OBS-01, OBS-02 | Sanitized eksport, powód/policy/feed/usage, uzgodnienie z niezależnymi zapisami narzędzi. |
| G10 | Uruchamialne pozytywne i negatywne testy | TEST-01, TEST-02, TEST-03 | Każda wdrożona kontrola, budżet i historical fixture mają asercje; błąd daje nonzero exit. Test offline nie zastępuje hosted acceptance. |
| G11 | Ad-hoc prompts i zmiany polityki/feedu/progów przez sędziego | POL-02, POL-03, TEST-01, TEST-03 | Walidowany reload bez restartu, zachowanie ostatniej poprawnej polityki przy błędzie, rzeczywiste efekty usunięcia kontroli. |
| G12 | Telemetria wydajności | OBS-03 | Faktyczne czasy dla kontroli, checkera i aktora, workload, liczba próbek, hardware i model. |
| G13 | Własne środowisko, zależności i licencje | SHIP-01 | Lockfile i sprawdzony setup; prerequisites hosted, licencje; brak założonej subskrypcji od organizatora. |
| G14 | Tytuł, zespół, 1–6 członków, opis | SHIP-02; prawdziwe dane PENDING | Rzeczywiste pola zespołu; limity tytułu/opisu według formularza. |
| G15 | PDF maksymalnie 10 slajdów | SHIP-02 | Czytelny gotowy PDF, zmierzona liczba stron i prawdziwe materiały z demo. |
| G16 | Język angielski według zapisanego task page | SHIP-02 | Angielskie materiały spełniają bardziej restrykcyjną wersję; regulamin dopuszcza też polski. |
| G17 | Czas dostarczenia | SHIP-02 | Cel właściciela: działające demo 4 października 08:00 Warsaw, polish do final 11:00. Konflikt PM w źródłach nie jest rozstrzygnięty. |
| G18 | Brak ocenianych zmian po cutoff | SHIP-02 | Zamrożona wersja i hashe artefaktów; lokalny pakiet nie oznacza submission. |
| G19 | Pola platformy: kategoria, obraz, członkowie/Discord | SHIP-02; dane/dostęp PENDING | Sprawdzone wymagania formularza i prawdziwe dane; niczego nie wymyślać. |
| G20 | Dostęp sędziów do pakietu i przypisanie reuse | SHIP-01, SHIP-02 | Kompletny pakiet, setup/test/demo, attribution i uzgodniony sposób dostępu. |
| G21 | Wybrana strategia: użyteczny wynik mimo ataku | CORE-02, SAFE-02, SAFE-06, TEST-02 | Zapisany draft z breaking change i cytowaniami oraz zero zabronionych skutków w zdefiniowanej granicy. |
| G22 | Wybrana strategia: błędy, konkurencja, uczciwy zakres | SAFE-01, POL-03, RES-02, RES-03, TEST-03 | Fault/race/concurrency/unknown-outcome asercje i jawne ograniczenia. |

Źródło technicznych wymagań: [brief §§2–7](https://drive.google.com/file/d/1oGwpQ5sD-x5I9ERwCQJvz-gfbHJ5aGYG/view). Formalności PDF/zespołu/języka/cutoff: [regulamin §§5,13](https://drive.google.com/file/d/1n8Crzx4HjyQFZFudeF5QnEcpY2OZt4LP/view). G21/G22 są naszymi kryteriami jakości, nie dodatkowymi nakazami Goldman.

## Luki i kwalifikacje

**Hosted-only: zgodność wymaga jawnego zastrzeżenia.** §7 briefu oczekuje modeli lokalnych; §2 omawia również komercyjne API, a §7 mówi, że organizator nie dostarcza płatnych subskrypcji. Tekst nie zawiera jednoznacznego zakazu własnego hosted API, ale to nie jest potwierdzenie od organizatora. Respektujemy zaakceptowany Vertex/global z danymi syntetycznymi, ujawniamy prerequisites i brak lokalnego modelu. Opis lokalnego meteringu to projekt rozszerzenia, nie drugi działający backend. Interpretację organizatora można ustalić poza tym audytem; nie otrzymano ani nie wysłano takiego potwierdzenia. [Brief §§2,7](https://drive.google.com/file/d/1oGwpQ5sD-x5I9ERwCQJvz-gfbHJ5aGYG/view).

**Historyczny atak: sam wymyślony poisoned changelog nie wystarczy jako historia.** Rekomendowany istniejący punkt odniesienia to opis Invariant z 26 maja 2025: złośliwy publiczny issue przekierował agenta do danych prywatnego repozytorium i ich publikacji. Nasz advisory/private notes/public-demo sink może być bezpiecznym analogiem tej sekwencji. W dokumentacji i testach należy wymienić źródło oraz różnice; nie twierdzić, że odtworzono dokładną podatność GitHub albo wykazano ochronę przed dowolnym supply-chain exploit. [Pierwotny opis Invariant](https://invariantlabs.ai/blog/mcp-github-vulnerability).

**Ochrona danych obejmuje również wysyłkę do modelu.** Secret/PII oraz source/model/provider clearance muszą zadziałać przed checkerem i aktorem. Blokada finalnej publikacji nie cofa danych wysłanych wcześniej do hosted checkera. Aktualne SAFE-03 obejmuje tę granicę. Syntetyczne notatki oznaczone „private” demonstrują przepływ, nie uprawniają do rzeczywistych danych firmy.

**Zmiana polityki ma być prawdziwa.** Suwak musi zmieniać kanoniczną politykę i obserwowalne zachowanie odpowiedniego przypadku. Wyłączenie pojedynczej reguły sink nie musi dopuszczać wycieku, jeśli nadal obowiązuje niezależna audience policy. Wyjaśniamy pozostałe kontrole; nie aranżujemy fałszywego „bypass”.

**Production-ready to aspiracja briefu, nie nasz obecny status.** Zakres ma jedną własną pętlę i ograniczone narzędzia fixture. Nie obejmuje dowolnych agentów/MCP, shell execution, deserializacji, multitenancy ani wszystkich eksploitów. Lekki komponent i udokumentowana granica są sensowną odpowiedzią hackathonową; skalowalność, dokładność i invoice cap wymagają osobnych dowodów.

**Wagi różnią się w źródłach.**

| Kategoria | Brief §8 | Regulamin §11 | Priorytet dowodu |
|---|---:|---:|---|
| Guardrails | 30% | 30% | Kontrole hybrydowe, allowed utility, rzeczywiste skutki. |
| Architektura/wydajność | 20% | 20% | Integracja, granice, pomiary. |
| Reporting | 20% | 20% | Workbench i eksport z tych samych danych. |
| Testy | 15% | 20% | Runnable positive/negative suite i niezależne asercje. |
| Implementowalność/skalowalność | 15% | 10% | Powtarzalny setup i uczciwe ograniczenia. |

Źródła: [brief](https://drive.google.com/file/d/1oGwpQ5sD-x5I9ERwCQJvz-gfbHJ5aGYG/view), [regulamin](https://drive.google.com/file/d/1n8Crzx4HjyQFZFudeF5QnEcpY2OZt4LP/view). Każda wersja daje 100%; nie wybieramy dowolnie jednej jako ostatecznej. Dopracowane demo wspiera ocenę, lecz nie zastępuje ocenianych testów, architektury i reporting.

**Formalności i terminy są jeszcze otwarte.** Aktualny regulamin dosłownie podaje 11 PM dla startu i końca, podczas gdy właściciel wskazuje final 4 października 11 AM. Cel roboczy pozostaje 08:00–11:00 Europe/Warsaw. Team/account/submission access nie są potwierdzone. Limity ≤5 słów tytułu, ≤500 słów opisu, obraz i English-only task-page są odziedziczone z wcześniejszego odczytu strony/FAQ w TASK-CONTRACT; obecny web extraction pokazał placeholdery. Ten audyt świeżo potwierdza regułę ≤10-slajdowego PDF i 1–6 członków z regulaminu, lecz nie potwierdza na nowo wszystkich pól HackTribe. Przy finalnym pakiecie sprawdzić rzeczywisty formularz.

## Bounded handoff dla planera

Zachować zaakceptowaną misję/wizję i release assistant. Nie wracać do selekcji stacku, full APPA, dodatkowych providerów ani zaawansowanego recovery. Przy plan check sprawdzić:

1. CORE-02 kończy użyteczny draft przez rzeczywistego aktora i MCP; evidence recorder niezależnie potwierdza zapis.
2. SAFE-04/TEST-02 wykazują faktyczną semantic exclusion, benign/active/quoted/paraphrased wyniki oraz błędy. Osobno badać zatajenie breaking change; nie deklarować causal improvement bez on/off dowodu.
3. SAFE-02/SAFE-03 obejmują odpowiedzi i oba model egress, a negatywne testy mierzą zero rzeczywistych zabronionych efektów.
4. POL-01–03 i RES-01–03 udostępniają realną mutację policy/feed/model/strictness/budget, wspólny allowance i zachowują nieznany koszt.
5. OBS i TEST udostępniają workbench, eksport, telemetrię i kompletną suite; SHIP zapewnia powtarzalny pakiet oraz jawne hosted/formal qualifications.

Nie dodajemy nowego wymogu lokalnego modelu wbrew decyzji właściciela. Nie tworzymy phase acceptance z audytu dokumentów. Fazę można przyjąć dopiero po REVIEW.md i kanonicznym `verification.status: passed`, zgodnie z istniejącą instrukcją projektu.

**Terminal report:** COMPLETE dla misji/wizji i audytu zgodności dokumentacji; lokalna integracja z master wykonana na późniejsze polecenie właściciela. Evidence: oba świeżo odczytane źródła z normalized match, jawna decyzja właściciela, 21 bieżących wymagań i mapa G01–G22. Ograniczenia: brak runtime acceptance, kwalifikacja hosted-only, konflikty punktacji/czasu i niepotwierdzone formalności platformy. Remaining: wykonanie planu i dowodów oraz finalny pakiet/formularz. Child state: brak nowych subagentów; praca równoległego czatu pozostaje niezależna i nie jest uznana za zakończoną przez ten audyt. Szczegóły integracji są w quick task 261003-t29.
