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
