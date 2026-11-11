# Test report: úvodní stránka, Filipovy komentáře 11. 11. 2026 (issue #9)

Zadání: [`product.md`](./product.md). Implementace: [`implementation.md`](./implementation.md).
Testovaný commit: `059b407` (větev `feat/9-home-comments`). Datum: 11. 11. 2026.

## Verdikt

**Prošlo s výhradou.** Všech 14 akceptačních kritérií prošlo. Skript obsahu má jednu chybu
střední závažnosti (C1). Ta dnešní nasazení neblokuje, protože v produkci pole `link` ještě není.
Doporučuji C1 opravit před během skriptu v produkci.

## Prostředí

- Vlastní worktree `~/Projects/robopipe-web-h9test` (odpojený `059b407`), databáze `robopipe_h9t`, vlastní složka `media/`.
- Databázi jsem naplnil kódem `541b256` (stav po #6). Potom jsem spustil skript z `059b407`.
- `next build` a `next start` na portu 3830.
- Srovnání s `master` (`9371383`): worktree `~/Projects/robopipe-web-h9master`, databáze `robopipe_h9m` (kopie výchozího stavu), `next dev` na portu 3831.
- Prohlížeč: `chrome-headless-shell` 1248. Stažený Chromium 1208 spadne (SIGABRT), proto `PLAYWRIGHT_CHROMIUM_PATH`.
- Produkci jsem nečetl ani nezapisoval.

## Akceptační kritéria

| # | Výsledek | Důkaz |
|---|---|---|
| 1.1 | prošlo | Pořadí bloků v `main` (cs i en, 320, 375, 768, 1440 px): hero, loga zákazníků, „AI kontrola kvality, kterou zvládne…“, obory, úlohy, „AI kontrola v provozu…“, příběh zákazníka, **Jsme součástí**, Z blogu, CTA. Pruh není pod logy zákazníků. |
| 1.2 | prošlo | Pruh je mezi příběhem zákazníka a „Z blogu“ (cs „Jsme součástí“, en „Part of“). Kód `LogoCloud` se nezměnil. `screens/test/memberships-{cs,en}-{375,1440}.jpg` |
| 2.1 | prošlo | Snímek z videa v6 v čase 5,9 s. Kód PART je čitelný. `screens/test/card-label-cs-1440.jpg` |
| 2.2 | prošlo | Lime rohové závorky kolem kódu a štítek `PART 256355-80` (lime výplň, tmavé písmo Space Mono). |
| 2.3 | prošlo | Nezávislé čtení, viz kap. „Obrázek karty“. Dva dekodéry a OCR dávají stejnou hodnotu jako štítek. |
| 2.4 | prošlo | Soubor 1200×900 (4:3). Ostrost v oblasti kódu je stejná jako ve zdrojovém snímku. Bez procent a skóre. |
| 2.5 | prošlo | Stejný soubor `label-inspection-card-768x576.jpg` na `/cs` i `/en`. Alt „Kontrola etiket“ / „Label inspection“. |
| 3.1 | prošlo | Sekce „Automatická anotace: rámečky navrhne AI…“ na `/cs` ani `/en` není (všechny šířky). |
| 3.2 | prošlo | `/cs/automaticka-anotace` a `/en/auto-annotation` vrací 200. Karta „Automatická anotace“ v sekci úloh zůstala. |
| 3.3 | prošlo | Jeden odkaz v kartě „Nastavíte si sami“: `/cs/automaticka-anotace` („Snímky vám pomůže označit automatická anotace.“), `/en/auto-annotation` („Auto annotation helps you label the images.“). `screens/test/feature-link-{cs,en}-{375,1440}.jpg` |
| 4.1 | prošlo | Mezera nad „Jsme součástí“ v patičce: `master` 20 px, větev 52 px (375 i 1440 px). Ověřeno na 14 stránkách včetně 404. `screens/test/footer-{home,post}-{375,1440}.jpg` |
| 5.1 | prošlo | cs i en se chovají stejně. Jiné stránky se změnily jen v patičce (pořadí bloků jiných stránek skript nemění, `updated` hlásí jen `home page` a `page kontrola-etiket`). |
| 5.2 | prošlo | Nic není v produkci. Testy běžely jen na lokálních databázích. |

## Obrázek karty „Kontrola etiket“

Nezávislé čtení. Použil jsem jiné nástroje než vývojář: zxing-cpp (Python) a zbar (`zbarimg`). OCR: vlastní skript Apple Vision.

| Soubor | zxing-cpp | zbar | OCR (Vision) |
|---|---|---|---|
| snímek z videa, 5,9 s (vlastní `ffmpeg`) | `P256355-80`, `Q250`, `V360565097`, `SK0347118311` | `P256355-80`, `Q250`, `V360565097` | „256355-80“, „Shape Corp. Czech Republic s.r.o.“, „KeyTec Ceske Budejovice s.r.o.“ a adresy |
| `seed-assets/img/label-inspection-card.jpg` 1200×900 | `P256355-80` (365,254 až 800,298), `Q250`, `V360565097`, `SK0347118311` | `P256355-80`, `Q250`, `V360565097` | „256355-80“, „PART 256355-80“. Žádné jméno ani adresa firmy. |
| `og` 1200×630 | `P256355-80` a další tři | `P256355-80`, `Q250`, `V360565097` | „256355-80“, „PART 256355-80“. Žádná firma. |
| `card` 768×576 (zobrazuje se na webu) | jen `Q250` | `P256355-80`, `Q250`, `V360565097` | „256355-80“, „PART 256355-80“. Žádná firma. |
| `thumbnail` 400×300 | nic | nic | „256355-80“, „PART 256355-80“. Žádná firma. |
| `hero` (1600 px) | Payload velikost nevytvořil, protože zdroj má jen 1200 px. Platí řádek originálu. | | |

- Hodnota kódu `P256355-80` bez identifikátoru `P` je `256355-80`. Štítek `PART 256355-80` se shoduje s kódem, s tištěným číslem na etiketě a s `implementation.md` kap. 3.
- Poloha rámečku odpovídá výstupu zxing-cpp z `implementation.md` (365, 254, 800, 298).
- Ostrost (rozptyl Laplaceova operátoru) v oblasti kódu: karta 2361, zdrojový snímek 2334. Výřez je 1:1, bez změny měřítka.
- Soubor: RGB, bez EXIF, JPEG progresivní, 134 kB.
- Jména a adresy firem nejsou čitelná v žádné velikosti. Vidět zůstává „PLANT NAME“, datum „10/09/26“ a „REV. LVL 01“. Tyto údaje nikoho neidentifikují.

## Skript obsahu

| Případ | Výsledek |
|---|---|
| Dry run na stavu po #6 | Plán stejný jako v `implementation.md` kap. 5 bod 2. Data v databázi beze změny: porovnal jsem `pg_dump` před a po. Rozdíl jsou jen nové prázdné sloupce `link` (schéma) a záznam `dev` v `payload_migrations`. Složka `media/` beze změny. |
| První běh | `created (1)`, `updated (7)`, stejné řádky jako dry run. Cílový stav ověřen v prohlížeči. |
| Druhý běh | `created (0)`, `updated (0)`. `skipped` obsahuje `home page (memberships position)` a `home feature link home_2_features_0 (set)`. |
| Ruční úpravy (přesunutý pruh, vlastní text odkazu, jiný `seo.image`) | Zůstanou. Pokrývá `homeComments.int.spec.ts`, prošlo. **Výjimka: cílová stránka odkazu, viz C1.** |
| Chybí blok „Jsme součástí“ | Skript ho vloží hned za `testimonialBar` s nadpisem cs i en. Nový test, prošlo. |
| Sekce automatické anotace dvakrát | Skript odebere obě kopie. Nový test, prošlo. |
| Chybí blok karet `home_2` | Report `home feature link home_2_features_0 (not found)`, `home page` beze změny. Nový test, prošlo. |
| Chybí cílová stránka `auto-annotation` | Nedosažitelné: skript stránku z `landing-pages.json` vždy vytvoří (nebo naplánuje) dřív, než řeší odkaz. Netestoval jsem. |
| Vyplněný jen jeden jazyk odkazu | Chyba C1 (skript) a C2 (web). |

## Nalezené chyby

### C1 Skript přepíše cílovou stránku odkazu, který Filip nastavil v jednom jazyce (střední)

Pole `link.page` není lokalizované, `link.label` ano. Skript zapisuje odkaz v každém jazyce, kde je `label` prázdný (`seoGeo.ts:783` a `:801–808`).
V tom jazyce zapíše i `page`. Tak přepíše stránku, kterou Filip vybral pro druhý jazyk. Porušuje architekturu kap. 5.3 d („Hodnota, kterou tam dal Filip, zůstane“).

Reprodukce:

1. V kartě „Nastavíte si sami“ dej v cs text „Ceník od Filipa“ a stránku „Ceník“. V en nech text prázdný.
2. Spusť `pnpm seed:seo-geo --status=published`.
3. Výsledek: cs text zůstane „Ceník od Filipa“, ale odkaz vede na `/cs/automaticka-anotace`. Očekávání: vede na `/cs/cenik`.

Automatický test: `tests/int/homeCommentsEdge.int.spec.ts`, „keeps the target page of a link Filip set in one locale only“. Dnes selže (`expected 11 to be 2`).
Návrh: když má odkaz v některém jazyce text, skript `page` nemění a v ostatních jazycích zapíše jen `label`.

### C2 Prázdný anglický text odkazu ukáže na `/en` český text (nízká)

Payload má `localization.fallback: true`. Když má odkaz text jen v cs, `/en` ukáže český text odkazu.
Skript vyplní oba jazyky, takže chyba nastane jen po ruční úpravě.

Reprodukce:

1. V kartě „Přehled o výrobě v reálném čase“ dej v cs text odkazu a stránku. V en nech text prázdný.
2. Otevři `/en`.
3. Výsledek: karta má odkaz s českým textem.

Návrh: v `FeatureGrid` číst `link` bez záložního jazyka, nebo to zapsat do README jako pravidlo pro editory. Automatický test nepřidávám, e2e testy data nemění.

### C3 Dlouhé slovo bez mezer v textu odkazu přeteče z karty (nízká)

Text odkazu nemá `break-words`. Slovo delší než karta se ořízne na okraji karty. Stránka se do strany neposouvá.
Je to stejný druh chyby jako známá chyba L1 u blogu. Se současným textem nenastane.

Reprodukce: dej do textu odkazu slovo o 100 znacích a otevři `/cs` na šířce 320 px. `screens/test/edge-long-link-cs-320.jpg`.

### Poznámky bez chyby

- Odkaz na nepublikovanou stránku ani odkaz bez stránky se nevykreslí (`CMSLink` vrátí `null`). Za textem karty pak zůstane jedna mezera. Uživatel ji nevidí.
- Ve velikosti `card` (768 px) čte kód PART jen zbar, zxing-cpp ne. Člověk kód i štítek přečte. Kritérium 2.1 to nemění.
- Klávesnice: odkaz v kartě je dostupný klávesou Tab (12. prvek), má viditelný obrys fokusu. Čtečka: `link "Snímky vám pomůže označit automatická anotace."`. Karta nemá vnořené odkazy. Barva odkazu `#3f6b00` na bílé.
- Na 320, 375, 768 a 1440 px se stránka do strany neposouvá (cs i en).

## Automatické kontroly

| Kontrola | Výsledek |
|---|---|
| `tsc --noEmit` | 0 chyb |
| `eslint .` | 0 chyb, 2 stávající varování |
| `next build` | OK (57 stránek) |
| `test:int` | 115 prošlo, 1 selhal (21 souborů). Selhal nový test chyby C1. Bez nového souboru 112/112 jako u vývojáře. |
| `test:e2e` | 76 prošlo, 2 selhaly (78). Nové `homeCommentsEdge.e2e.spec.ts`: 7/7. |

Dvě selhání e2e jsou i na `master` (`9371383`), nejsou z této větve:

- `blogFeaturedCard.e2e.spec.ts` „long unbroken title“: `Expected <= 359, Received 749.6875` (známá L1).
- `seo-stage2.e2e.spec.ts` „every internal link … answers 200“: `Expected 200, Received 404` (článek jen v produkci, `implementation.md` kap. 6 bod 3).

## Nové testy

- `tests/int/homeCommentsEdge.int.spec.ts`: odkaz v jednom jazyce (C1, dnes selže), chybějící pruh, sekce dvakrát, chybějící blok karet.
- `tests/e2e/homeCommentsEdge.e2e.spec.ts`: mezera v patičce na 5 typech stránek (včetně 404) na 320 a 1440 px. Odkaz v kartě je uvnitř karty, není vnořený a stránka se na 320 px neposouvá (cs, en).

## Screenshoty

Složka `screens/test/`:

- `home-{cs,en}-{320,375,768,1440}.jpg`: celá úvodní stránka (en jen 375 a 1440).
- `card-label-{cs,en}-{375,1440}.jpg`: karta „Kontrola etiket“.
- `memberships-{cs,en}-{375,1440}.jpg`: pruh „Jsme součástí“ mezi příběhem zákazníka a blogem.
- `feature-link-{cs,en}-{375,1440}.jpg`: odkaz v kartě „Nastavíte si sami“.
- `footer-{home,post}-{375,1440}.jpg`: patička na úvodní stránce a na článku.
- `edge-long-link-{cs,en}-320.jpg`, `edge-long-link-cs-1440.jpg`: chyba C3 (testovací data, ne skutečný obsah).

## Kola 2 a 3

Testovaný commit: `7bae574` (kód `cba553f`). Datum: 11. 11. 2026, 13:35 až 14:10.
Během testu se větev dostala do `master` (PR #11, `84a605d`) a do produkce. Zpráva proto popisuje stav, který už běží.

### Verdikt

**Neprošlo.** Ze 13 kritérií prošlo 11, kritérium 7.4 prošlo s výhradou (D3) a kritérium 7.7 neprošlo (D1, D4).

- D4 (vysoká): v produkci detail obou případů neukazuje „95 %“. Řádek údaje v produkci chybí. Kód větve ho lokálně nechá, příčinu z veřejných dat neurčím.
- D1 (střední): skript znovu skryje údaj, který Filip v administraci vrátil na kartu.
- D2 a D3 (nízká): chybné hlášení skriptu a ořezané dlouhé slovo u karty se třemi údaji.

### Prostředí

- Server: worktree `robopipe-web-home`, `next build` a `next start` na portu 3820 (ukončen podle PID).
- Databáze `robopipe_h9r3`: prázdná, migrace a `pnpm seed` z `master` `917e87c` (stav po kole 1). Kopie před migrací kola 3: `robopipe_h9r3_pre`.
- Okrajové případy: kopie `robopipe_h9r3_edge`, úpravy přes REST API. Int testy: kopie `robopipe_h9r3_int`.
- Prohlížeč: `chrome-headless-shell` 1248. Šířky 1440, 1280, 1024, 768, 640, 375 a 320 px.
- Produkci jsem jen četl přes HTTP GET (`robopipe.io`, veřejné API a stránky).

### Akceptační kritéria

| Kritérium | Výsledek | Důkaz |
|---|---|---|
| 6.1 Pořadí úvodní stránky | Prošlo | Pořadí sekcí v DOM (cs, en, 1440 a 375 px) odpovídá 6.1. `homeComments.e2e.spec.ts` prošlo. `home-{cs,en}-{1440,375}.jpg` |
| 6.2 Žádné dvě mřížky za sebou | Prošlo | Mezi mřížkami je tmavá sekce, obory, příběh zákazníka. e2e prošlo. |
| 6.3 Přechody pozadí | Prošlo | Tmavé sekce nesousedí. Čáru nahoře má jen pruh „Jsme součástí“, žádná sekce nemá spodní čáru. `home-cs-1440-transitions.jpg` |
| 6.4 Idempotence a ruční pořadí | Prošlo | 1. běh ze stavu po kole 1: `home page (order)`. 2. běh: `created (0)`, `updated (0)`. Ručně prohozené `processSteps` a `industryCards` přes API: `home page (order changed by hand)`, pořadí zůstane. |
| 6.5 Texty a kritéria kola 1 | Prošlo | e2e testy kola 1 prošly. Pruh je za řešeními a před blogem. |
| 6.6 C1, C2, C3 | Prošlo | `homeCommentsEdge.int.spec.ts` (C1, C2) a `homeCommentsEdge.e2e.spec.ts` (C3) prošly. |
| 7.1 Fotka hlavního případu | Prošlo | Soubor 1080×756 jsem prohlédl v plné velikosti: kamera nad linkou s bagetami, bez lidí. Štítek na kameře je nečitelný, vpravo nahoře je jen bezpečnostní piktogram. Alt cs „Kamera Robopipe nad linkou s plněnými bagetami“, en „Robopipe camera above a line of filled baguettes“. Viz D2. |
| 7.2 Bez 95 % na kartě Crocodille | Prošlo | Karta: „3 600“ a „19“ (cs, en, všechny šířky). |
| 7.3 Bez 95 % na třetí kartě | Prošlo | Karta MG Servis: jen „5 různých kontrol na balení“ (cs, en). |
| 7.4 Údaje vedle sebe | Prošlo s výhradou | Se současným obsahem jsou údaje v jednom řádku na 1440, 1024 a 768 px. Na 375 px se karta Crocodille a druhá karta zalomí pod sebe. Vodorovné posouvání na 375 a 320 px není. Na 1024 px slovo „zdokumentovaných“ přesahuje sloupec o 4 px do okraje karty, není to vidět. Viz D3. |
| 7.5 Citát nad „Řešení podle úlohy“ | Prošlo | Pořadí v DOM: citát, „Řešení podle úlohy“, výzva (cs, en). |
| 7.6 Nadpis výzvy | Prošlo | „Třeba je na řadě právě váš provoz.“ a „Your operation could be next.“ |
| 7.7 Detail a ruční změny | Neprošlo | Lokálně detail obou případů ukazuje 95 % (cs, en, 1440 a 375 px, `detail-*.jpg`). Skript nepřepíše ručně změněnou fotku, text údaje ani smazaný řádek. Přepíše ale ručně vypnuté `hideInListing` (D1). V produkci 95 % na detailu chybí (D4). |

### Migrace `20261111_121632_case_study_metric_listing`

| Kontrola | Výsledek |
|---|---|
| `payload migrate` na kopii stavu před kolem 3 (`NODE_ENV=production`) | Prošlo za 10 ms. Sloupec `hide_in_listing` je v `case_studies_metrics` a `_case_studies_v_version_metrics`, 9 stávajících řádků má `false`. |
| `payload migrate:down` | Prošlo. Oba sloupce zmizely. |
| Znovu `payload migrate` | Prošlo. |
| Stránka po migraci, skript ještě neběžel | `/cs`, `/en`, `/{cs,en}/case-studies` a detail: 200. Karty ukazují 95 % jako dřív. |

### Skript obsahu

1. běh ze stavu po kole 1: `created (1): media crocodille-camera-line.jpg`, `updated (8)` (fotka, údaje Crocodille, údaje MG Servis, pořadí úvodní stránky, zveřejnění).
2. běh: `created (0)`, `updated (0)`. Hlášení ale říká `case study crocodille-line-quality (hero image) changed by hand` (D2).

| Ruční změna po 1. běhu | Výsledek |
|---|---|
| Jiná fotka | Zůstane. Hlášení `(hero image) changed by hand`. Prošlo (int test vývojáře). |
| Upravený text údaje (95% na 97%) | Zůstane, údaj se neskryje. Prošlo (int test vývojáře). |
| Smazaný řádek 95 % | Ostatní řádky zůstanou. Hlášení `(listing results) changed by hand`. Prošlo (nový int test). |
| Vypnuté `hideInListing` u 95 % | **Skript ho znovu zapne.** Chyba D1. |

### Okrajové případy (kopie databáze, REST API)

| Případ | Výsledek |
|---|---|
| Případ bez údajů | Karta nemá čáru ani prázdný řádek. Bez chyby. |
| Jeden údaj | Bez chyby. |
| Tři viditelné údaje, dlouhé české slovo | Slovo se ořízne na okraji karty. Chyba D3. |
| Čtyři údaje (jeden skrytý) | Viz řádek výše, tři viditelné. |
| Velmi dlouhý popis údaje (100 znaků s mezerami) | Zalomí se ve sloupci. Bez chyby. |
| Hodnota údaje jako slovo o 43 znacích bez mezer | Na 375 a 320 px se stránka posouvá do strany. Hodnota je číslo, takový obsah není reálný. Stejné chování má `master` (údaje měly `flex-wrap` už dřív). Poznámka, ne chyba. |
| Případ bez fotky | Karta ukáže logo, štítek, text a údaje. Bez chyby. `edge-cards-cs-1440.jpg` |
| Případ jen v češtině | `/cs/case-studies` ho ukáže, `/en/case-studies` ne, `/en/...` detail 404. Bez chyby. |

### Nalezené chyby

#### D4 V produkci detail případu neukazuje „95 %“ (vysoká)

Veřejné API `robopipe.io/api/case-studies` (GET, 11. 11. 14:05) vrací:

- `crocodille-line-quality`: údaje `3,600` a `19`. Řádek `95%` chybí.
- `mg-servis-packaging-checks`: jen řádek `mg-servis-packaging-checks_m1` (`5`). Řádek `_m0` chybí.
- Obě změny mají `updatedAt` 12:45 UTC (13:45 místního času).

Stránky `/cs/case-studies/crocodille-kvalita-na-lince`, `/en/case-studies/crocodille-line-quality` a `/cs/case-studies/mg-servis-kontrola-baleni` údaj 95 % neukazují. Kritérium 7.7 v produkci neplatí.
Kód větve řádek nemaže (lokálně ověřeno, detail 95 % ukazuje). Příčinu z veřejných dat neurčím. Návrh: v administraci podívat se do historie verzí obou případů kolem 12:45 UTC a řádky vrátit s `hideInListing` zapnutým.

#### D1 Skript znovu skryje údaj, který Filip vrátil na kartu (střední)

Skript skryje řádek, kdykoli najde řádek `95%` / `detection precision` s `hideInListing` vypnutým (`src/seed/seoGeo.ts:476` až `:481`). Nerozliší „skript ještě neběžel“ od „Filip pole vypnul“. Porušuje 7.7 a princip 6.4.

Reprodukce:

1. Spusť skript (`pnpm seed:seo-geo --status=published`).
2. V administraci u údaje 95 % případu MG Servis vypni „Show this result only on the detail page“ a ulož.
3. Spusť skript znovu.
4. Výsledek: `updated: case study mg-servis-packaging-checks (listing results)`, karta 95 % znovu nemá. Očekávání: změna zůstane.

Automatický test: `tests/int/caseStudiesListingEdge.int.spec.ts`, „keeps a result Filip put back on the listing by hand“. Dnes selže.

#### D2 Druhý běh hlásí ručně změněnou fotku, i když je fotka nová (nízká)

Skript porovná název souboru fotky přesně s `crocodille-camera-line.jpg` (`seoGeo.ts:454`). Payload při shodném názvu soubor přejmenuje (`crocodille-camera-line-1.jpg`), stejně jako `tablet-line-2.png` v produkci. Druhý běh pak hlásí `(hero image) changed by hand`. Data se nezmění, hlášení ale klame toho, kdo skript spouští.

Stejná citlivost na název souboru shodí int testy vývojáře: na čisté databázi a se složkou `media/`, kde soubor už je, selžou 3 testy v `caseStudiesListing.int.spec.ts` (a navazující `seoGeo` a `solutions`). Helper `media()` soubor nenajde a vytvoří ho znovu. Pod `jsdom` pak `payload.create` selže na `ValidationError: file`. S přesným názvem v databázi prošlo 124/124.

Reprodukce: čistá databáze, `pnpm seed`, v `media/` už je `crocodille-camera-line.jpg`. Spusť skript dvakrát. Automatický test: `caseStudiesListingEdge.int.spec.ts`, „reports the new hero image as in place when Payload renamed the file“. Dnes selže.
Návrh: porovnat název se stejným vzorem jako `replaceIf` (přípona `-\d+`).

#### D3 Dlouhé slovo v popisu údaje se ořízne na okraji karty, když má karta tři údaje (nízká)

Na `sm` a výš jsou údaje ve stejně širokých sloupcích. Popis nemá `break-words` ani `hyphens`. Slovo delší než sloupec přeteče a `overflow-hidden` karty ho ořízne. Implementace (K3, 7.4) tvrdí, že se dlouhý popis zalomí ve svém sloupci. To platí jen pro text s mezerami.
Se současným obsahem nenastane (karta má nejvýš dva viditelné údaje).

Reprodukce: karta MG Servis s údaji „5 různých kontrol na balení“, „24/7 nepřetržitý provoz“, „100 % zdokumentovaných balení“. Otevři `/cs/case-studies` na 1440 px. Slovo „zdokumentovaný“ je oříznuté (`edge-three-results-cs-{1440,1024}.jpg`).
Automatický test: `tests/e2e/caseStudiesListingEdge.e2e.spec.ts` (1440, 1024 a 768 px, údaje přidá jen do DOM). Dnes selže, přesah 13 až 28 px.

### Poznámky bez chyby

- V `CaseStudyMetrics` je `dd` před `dt`. HTML chce `dt` před `dd`. Stav je stejný jako na `master`.
- Mé první spuštění e2e šlo bez `DATABASE_URL`, takže testy zapsaly testovacího uživatele do `robopipe_h9`. Výsledek toho běhu (7 selhání) jsem zahodil.

### Automatické kontroly

| Kontrola | Výsledek |
|---|---|
| `tsc --noEmit` | 0 chyb |
| `eslint .` | 0 chyb, 2 stávající varování |
| `next build` | OK (57 stránek), třikrát bez chyby spojení |
| `test:int` | 125 prošlo, 2 selhaly (127, 23 souborů). Selhaly nové testy D1 a D2. Bez nového souboru 124/124, jen s přesným názvem fotky v databázi (D2). |
| `test:e2e` | 92 prošlo, 5 selhalo (97). Selhaly 3 nové testy D3 a 2 známé testy. |

Dvě známá selhání e2e jsou stejná jako v kole 1 a selhávají i na `master` `9371383` (část „Automatické kontroly“ výše):
`blogFeaturedCard.e2e.spec.ts` „long unbroken title“ (`Expected <= 359, Received 749.6875`) a `seo-stage2.e2e.spec.ts` „every internal link … answers 200“ (404 na článek, který je jen v produkci).

### Nové testy

- `tests/int/caseStudiesListingEdge.int.spec.ts`: vypnuté `hideInListing` zůstane (D1), smazaný řádek 95 % (prošlo), přejmenovaný soubor fotky (D2).
- `tests/e2e/caseStudiesListingEdge.e2e.spec.ts`: tři údaje s dlouhým slovem zůstanou v kartě (D3).

### Screenshoty

Složka `screens/test-round23/`:

- `case-studies-{cs,en}-{1440,375}.jpg`: stránka Případy užití, cílový stav.
- `case-studies-{cs,en}-{1440,375}-edge.jpg`: okrajové případy (bez fotky, bez údajů, jeden údaj, dlouhé texty).
- `edge-cards-cs-1440.jpg`: karty bez fotky, s jedním údajem, se třemi údaji a případ jen v češtině.
- `edge-three-results-cs-{1440,1024}.jpg`: chyba D3.
- `detail-*-1440.jpg`, `detail-mg-servis-*-375.jpg`: detail Crocodille a MG Servis s údajem 95 % (cs, en, lokálně).
- `home-{cs,en}-{1440,375}.jpg`, `home-cs-1440-transitions.jpg`: úvodní stránka a přechody sekcí.
