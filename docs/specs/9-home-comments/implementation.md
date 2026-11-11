# Implementace: úvodní stránka, Filipovy komentáře 11. 11. 2026 (issue #9)

Zadání: [`product.md`](./product.md). Architektura: [`architecture.md`](./architecture.md).
Větev `feat/9-home-comments`. Nic není v produkci. Produkci jsem jen četl (velikost `/cs`).

## 1. Co je hotové

| Kritérium | Změna | Kde |
|---|---|---|
| 1.1, 1.2 | Skript obsahu přesune pruh „Jsme součástí“ ze staré pozice za první `testimonialBar`. Na čerstvé databázi ho tam rovnou vloží. Jinou pozici nechá. | `src/seed/seoGeo.ts` (home page) |
| 2.1 až 2.5 | Nový obrázek `seed-assets/img/label-inspection-card.jpg`. Skript ho zapíše do `seo.image` stránky „Kontrola etiket“, jen když je pole prázdné. | `landing-pages.json` (`cardImage`), `seoGeo.ts` |
| 3.1 | Skript odebere blok `seo-geo-auto-annotation` (`removeBlocks`). Kód, který ho přidával, je pryč. | `home.json`, `seoGeo.ts` |
| 3.2 | Stránka a karta „Automatická anotace“ se nemění. Článek bere obrázek z `heroImage` ve frontmatteru. | `post-auto-annotation.cs.md` |
| 3.3 | Nové volitelné pole `link` u položky `featureGrid`. Karta „Nastavíte si sami“ má na konci textu odkaz na stránku automatické anotace (cs i en). | `src/blocks/FeatureGrid/*`, migrace `20261111_111049_feature_grid_link`, `home.json` (`featureLinks`) |
| 4.1 | Blok „Jsme součástí“ v patičce má `pt-8`. Mezera nad ním je 52 px. | `src/components/Footer.tsx` |
| 5.1, 5.2 | Platí pro `/cs` i `/en`. Nic nebylo nasazeno ani zapsáno do produkce. | |

Ostatní: README (tabulka obsahu), typy `src/payload-types.ts`, testy (kap. 4).

## 2. Otázky z architektury, kap. 3

Řešeno podle doporučení architekta:

- 3.1 Snímek etikety na přepravce s díly (video v6), ne vaničky.
- 3.2 Jména a adresy firem na etiketě jsou rozmazané.
- 3.3 `seo.image` stránky „Kontrola etiket“ se mění. Náhled při sdílení stránky bude tento snímek.
- 3.4 Věta je v kartě „Nastavíte si sami“: „Snímky vám pomůže označit automatická anotace.“ / „Auto annotation helps you label the images.“ Filip ji schválí v náhledu.

## 3. Obrázek karty a výstup dekodérů

Skript: `~/.openclaw/workspace/output/robopipe-web/hero-video/scripts/label_card.py` (spuštění `uv run scripts/label_card.py <out.jpg>`).
Druhý čtecí nástroj: `scripts/vision_read.swift` (Apple Vision). Zápis je v `catalogue.md`, sekce Build.
Skript skončí a nic nezapíše, když se oba dekodéry neshodnou nebo OCR hodnotu nepotvrdí. Text štítku čte z výstupu dekodéru.

Snímek: video `detekceSpravnehoPoctuKusuVKrabici.MOV`, čas 5,9 s. Výřez x 480–1680, y 180–1080 (1200×900).

Celý snímek:

```
zxing-cpp: Code 128 P256355-80 (845, 434, 1280, 478), Q250, V360565097, SK0347118311
vision:    Code128  P256355-80 (846, 427, 1279, 485), Q250, V360565097, SK0347118311
```

Výřez po rozmazání (poloha rámečku je z tohoto výstupu):

```
zxing-cpp: Code 128 P256355-80 (365, 254, 800, 298), Q250, V360565097, SK0347118311
vision:    Code128  P256355-80 (366, 247, 799, 305), Q250, V360565097, SK0347118311
OCR (Vision): "256355-80", jistota 1.00
```

Hotový JPEG s překryvem (kontrola po zápisu): zxing-cpp i Vision znovu čtou `P256355-80`. OCR čte tištěné číslo „256355-80“ i štítek „PART 256355-80“.

Štítek: `PART 256355-80` (hodnota kódu bez identifikátoru dat `P`). Bez procent a skóre. Soubor 1200×900, JPEG kvalita 85, 130 kB, bez EXIF.

## 4. Odchylky od architektury

1. **Řádky reportu úvodní stránky.** Architektura uvádí jednotlivé řádky (5.3) i souhrnný `home page` (kap. 10). Skript píše oboje: souhrnný `home page` v `updated`, když se stránka mění, a podrobné řádky `home page (removed block …)`, `home page (memberships moved after testimonialBar)`, `home page (feature link …)`. Druhý běh hlásí `home page (memberships position)` a `home feature link home_2_features_0 (set)` ve `skipped`.
2. **Přesun pruhu bez `testimonialBar`.** Architektura tento případ neřeší. Skript pruh v tom případě nepřesune a hlásí `skipped`.
3. **Cílová stránka odkazu chybí.** Když stránka `auto-annotation` neexistuje a není ani plánovaná, skript odkaz nezapíše a hlásí `home feature link … (page auto-annotation not found)`. Odkaz bez stránky by zablokoval pozdější doplnění.
4. **Rozmazání.** Maska má měkký okraj Gaussovým rozmazáním poloměru 8 px. Hodnota není v architektuře.

## 5. Ověření

Lokální databáze `robopipe_h9` (Postgres na `localhost:5432`), server `next start` na portu 3820.

1. Databázi jsem naplnil kódem před změnou (`541b256`): stav jako po #6.
2. Lokální dry run (`--status=published --dry-run`):
   ```
   created (1): media label-inspection-card.jpg
   updated (7): page kontrola-etiket (card image), home page (removed block seo-geo-auto-annotation),
     home page (memberships moved after testimonialBar), home page, home page (feature link home_2_features_0),
     page kontrola-etiket published, home page published
   ```
   Odpovídá očekávání z architektury, kap. 10, krok 3.
3. Ostrý lokální běh dal stejný výpis. Druhý běh: `created (0)`, `updated (0)`.
4. Pořadí bloků (cs i en): hero, logoCloud `home_1`, featureGrid, industryCards, industryCards `seo-geo-solutions`, processSteps, testimonialBar, logoCloud `seo-geo-memberships`, splitSection, ctaBanner.
5. Čerstvý `pnpm seed` na prázdné databázi dal stejné pořadí, odkaz i obrázek.
6. Migrace na prázdné databázi s `NODE_ENV=production`: všechny migrace prošly, nová za 10 ms. Migrace jen přidává sloupce, typy a cizí klíče.

| Kontrola | Výsledek |
|---|---|
| `tsc --noEmit` | 0 chyb |
| `eslint .` | 0 chyb, 2 stávající varování |
| `next build` | OK |
| `test:int` | 112/112 (20 souborů), z toho nové `homeComments.int.spec.ts` 3/3 |
| `test:e2e` | 76 prošlo, 2 selhaly (kap. 6, body 2 a 3). Nové `homeComments.e2e.spec.ts` 10/10 |

Screenshoty (`/cs` a `/en`, 1440 px a 375 px, celá stránka): `screens/home-{cs,en}-{desktop,mobile}.jpg`.

Jak ověřit znovu:

```bash
cd ~/Projects/robopipe-web-home
NODE_OPTIONS=--no-deprecation node_modules/.bin/tsx src/seed/applySeoGeo.ts --status=published --dry-run
node_modules/.bin/vitest run --config ./vitest.config.mts tests/int/homeComments.int.spec.ts
E2E_BASE_URL=http://localhost:<port> PLAYWRIGHT_CHROMIUM_PATH=<chrome-headless-shell> \
  node_modules/.bin/playwright test tests/e2e/homeComments.e2e.spec.ts
```

## 6. Známá omezení

1. **Hlavička nese celé stránky.** `Header` je klientská komponenta a dostává globál `header` s `depth: 2`. Odkaz „Úvod“ tak nese celou úvodní stránku. Nový odkaz v kartě přidá do toho celou stránku automatické anotace: asi 11 kB HTML navíc na každé stránce webu (lokálně `/cs` 215 kB). Problém je starší než tato změna. Návrh na samostatný úkol: v `getLayoutGlobals` (`src/lib/queries.ts`) omezit stránky v hlavičce na `slug` (`populate: { pages: { slug: true } }`).
2. **E2E: známá chyba L1.** Test `Blog featured card … long unbroken title` selhává i na `master` (viz `docs/specs/2-seo-geo/implementation.md`, bod 11).
3. **E2E: článek jen v produkci.** Odkaz ze stránky `/cs/kamerova-kontrola-kvality` na článek `co-je-vizualni-system-…` vrací lokálně 404. Lokální seed ten článek nemá (skript hlásí `post … (not found)`). Změna #9 tuto stránku nemění.
4. **Pořadí nasazení.** Kód s migrací musí být v produkci před během skriptu (architektura, kap. 8). Jinak Payload pole `link` zahodí.
5. **Sdílená složka `media/`.** Dvě lokální databáze v jednom worktree sdílejí `./media`. Druhá databáze pak dostane soubory s příponou `-1` a skript média nenajde podle názvu. Pro testy používej jednu databázi na worktree.
6. **Produkční dry run** podle architektury, kap. 10, krok 2, spustí Arthur. Já jsem ho nespouštěl.

## 7. Co má ověřit tester

- `/cs` a `/en` na šířce 375 px a 1440 px: pruh „Jsme součástí“ mezi příběhem zákazníka a blogem, žádná sekce automatické anotace.
- Odkaz v kartě „Nastavíte si sami“ vede na `/cs/automaticka-anotace` a `/en/auto-annotation`.
- Karta „Kontrola etiket“: ostrý snímek, štítek `PART 256355-80` odpovídá číslu na etiketě, jména firem nejsou čitelná.
- Patička: větší mezera nad „Jsme součástí“ na všech stránkách.
- Ruční úpravy zůstanou: přesunutý pruh, vlastní text odkazu, jiný `seo.image` (pokrývá `homeComments.int.spec.ts`).

## Kolo 2

Zadání: [`product.md`](./product.md), část „Kolo 2“ (kritéria 6.1 až 6.6). Chyby: [`test-report.md`](./test-report.md), C1 až C3.
Nic není v produkci. Produkci jsem jen četl (pořadí bloků přes veřejné API).

### K2.1 Co je hotové

| Kritérium | Změna | Kde |
|---|---|---|
| 6.1, 6.2 | Skript obsahu nastaví nové pořadí úvodní stránky. Mřížky karet (`featureGrid`, oba `industryCards`) už nejdou za sebou. | `src/seed/seoGeo.ts` (`homeOrders`, home page) |
| 6.3 | Přechody sekcí jsem prohlédl na 375 px a 1440 px. Styl se nemění (K2.3). | |
| 6.4 | Pořadí se mění jen ze známého stavu. Druhý běh nic nezapíše. Ruční pořadí zůstane. | `seoGeo.ts`, testy |
| 6.5 | Texty a obsah bloků se nemění. Skript jen přeskládá existující bloky. | |
| C1 | Když má karta text odkazu v některém jazyce, skript nemění `link.page`. V ostatních jazycích zapíše jen text. | `seoGeo.ts` (`labelled`) |
| C2 | Na `/en` se odkaz v kartě bez vlastního anglického textu nezobrazí. `getPageBySlug` čte rozložení ještě jednou bez záložního jazyka a prázdným odkazům smaže text. Ostatní texty dál používají záložní jazyk. | `src/lib/queries.ts` (`withoutFallbackCardLinks`) |
| C3 | Odkaz v kartě má `wrap-anywhere`. Dlouhé slovo se zalomí uvnitř karty. | `src/blocks/FeatureGrid/Component.tsx` |

README: tabulka obsahu (`home.json`) popisuje nové pravidlo pořadí, C1 a C2.

### K2.2 Pravidlo pořadí

Blok má klíč: `blockName` (bloky ze skriptu, `seo-geo-solutions`, `seo-geo-memberships`), jinak `blockType`. Bloky z #6 mají `blockName` prázdný a typy na stránce jsou kromě těchto dvou jedinečné.

Skript nejdřív odebere bloky z `removeBlocks` a doplní chybějící blok řešení. Pak porovná celý seznam klíčů se známými stavy:

1. produkce po #6: hero, loga, **Jsme součástí**, featureGrid, industryCards, řešení, processSteps, testimonialBar, splitSection, ctaBanner,
2. po kole 1: stejné, ale **Jsme součástí** za testimonialBar (také čerstvý `pnpm seed`),
3. cíl: hero, loga, featureGrid, processSteps, industryCards, testimonialBar, řešení, **Jsme součástí**, splitSection, ctaBanner.

Když chybí blok „Jsme součástí“, porovnává se seznam bez něj. Výsledek:

- Známý stav: skript bloky přeskládá do cíle (chybějící pruh vloží za řešení). Report `updated: home page (order)`, v cíli `skipped: home page (order)`.
- Jiný stav: pořadí zůstane. Filip ho změnil v administraci. Report `skipped: home page (order changed by hand)`. Chybějící pruh jde za první `testimonialBar` jako v kole 1.

Důvody:

- Porovnání celého seznamu je nejpřísnější „známý stav“. Jakákoli ruční změna (i jinde na stránce) přesun zastaví. Stejný princip jako u pruhu v kole 1, jen pro celou stránku.
- Jeden běh převede produkci po #6 i stav po kole 1. Mezistav kola 1 tak nemusí v produkci nikdy být.
- Pravidlo nahrazuje pravidlo pruhu z kola 1 (`memberships moved after testimonialBar`). Dvě pravidla pro jedno pořadí by si odporovala.
- Seznamy jsou v kódu, ne v `home.json`. Architektura (kap. 5.3 a 2) drží pravidla pozice v kódu.

### K2.3 Přechody sekcí (6.3)

Nové sousedství: světlá mřížka karet, tmavá sekce s čísly, světlé obory, příběh zákazníka (bílé pozadí), světlá řešení, pruh „Jsme součástí“ (čára nahoře), blog a otázky, tmavá výzva. Tmavé sekce spolu nesousedí. Dvojitá čára nevzniká: čáru má jen pruh „Jsme součástí“ a nad ním jsou karty bez spodní čáry. Mezery mezi světlými sekcemi (`py-16`/`py-24`, příběh `py-20`) jsou stejné jako dřív mezi mřížkami. Styl jsem neměnil.

### K2.4 Ověření

Lokální databáze `robopipe_h9`, server `next start` na portu 3830 (ukončen podle PID).

| Kontrola | Výsledek |
|---|---|
| `tsc --noEmit` | 0 chyb |
| `eslint .` | 0 chyb, 2 stávající varování |
| `next build` | OK (57 stránek) |
| `test:int` | 120/120 (21 souborů). Test C1 testera prochází. |
| `test:e2e` | 86 prošlo, 2 selhaly (88). Obě selhání jsou známá i na `master` (kap. 6 body 2 a 3). |

Nové a upravené testy:

- `homeComments.int.spec.ts`: stav po #6 se staví explicitně v pořadí produkce. Nové testy: stav po kole 1 jedním během do cíle a druhý běh beze změny (počet verzí stejný), ruční pořadí v cílovém stavu zůstane, ruční pruh v produkčním stavu zastaví celé přeskládání.
- `homeCommentsEdge.int.spec.ts`: C2 (`getPageBySlug` na `/en` bez českého textu odkazu), chybějící pruh jde za řešení, chybějící pruh v ručním pořadí jde za příběh zákazníka.
- `homeComments.e2e.spec.ts`: pořadí nadpisů podle 6.1 a žádné dvě mřížky karet vedle sebe (cs, en).
- `homeCommentsEdge.e2e.spec.ts`: C3, slovo o 100 znacích v odkazu zůstane v kartě na 320 px.

Dry run na cílovém stavu: `created (0)`, `updated (0)`.

Screenshoty (celá stránka): `screens/round2/home-{cs,en}-{1440,375}.jpg`.

Poznámka k e2e: testy SEO berou adresu z `NEXT_PUBLIC_SERVER_URL`. Na jiném portu než v `.env` je nastav i při běhu testů:

```bash
NEXT_PUBLIC_SERVER_URL=http://localhost:<port> E2E_BASE_URL=http://localhost:<port> \
  PLAYWRIGHT_CHROMIUM_PATH=<chrome-headless-shell> pnpm test:e2e
```

### K2.5 Odchylky

- Report `home page (memberships moved after testimonialBar)` a `home page (memberships position)` jsou pryč. Nahrazuje je `home page (order)` a `home page (order changed by hand)`.
- C2 řeším v kódu, ne pravidlem v README. Cena: jeden dotaz navíc na anglickou stránku (`select: layout`, `depth: 0`).
- Kap. 7 architektury uvádí výsledné pořadí kola 1. Platí K2.2.

### K2.6 Známá omezení

1. Když v produkci někdo změnil pořadí jiných bloků, skript pořadí nezmění. Report to řekne (`order changed by hand`). Pořadí pak nastaví Filip v administraci.
2. Druhý blok stejného typu (například další `featureGrid`) dělá stav neznámým. Skript pak pořadí nemění.
3. Kontrola C2 běží jen pro jazyky mimo výchozí `cs`. Čeština záložní jazyk nemá, takže prázdný český text odkaz skryje i bez ní.

### K2.7 Co má ověřit tester

- `/cs` a `/en` na 375 px a 1440 px: pořadí podle 6.1, přechody sekcí podle 6.3.
- Skript z produkčního stavu po #6 i ze stavu po kole 1: jeden běh dá cíl, druhý nic nezapíše.
- Ručně změněné pořadí v administraci: skript ho nechá a hlásí `order changed by hand`.
- C1: text odkazu jen v cs se stránkou „Ceník“, po běhu skriptu odkaz vede na `/cs/cenik`, en dostane jen text.
- C2: prázdný en text odkazu, `/en` odkaz nemá, `/cs` ho má.
- C3: dlouhé slovo v textu odkazu se na 320 px zalomí v kartě.

## Kolo 3: stránka Případy užití (Filip 11. 11. 13:01)

Stránka `/cs/case-studies` a `/en/case-studies`.

| Bod | Změna | Kde |
|---|---|---|
| 7.1 | Nová hlavní fotka hlavního případu (Crocodille): kamera Robopipe nad linkou s plněnými bagetami. Snímek z `IMG_7929.MOV` v čase 1,6 s, výřez 1080×756 (poměr 1,43 jako místo na kartě), bez tváří a bez cizích značek. Alt: „Kamera Robopipe nad linkou s plněnými bagetami“ / „Robopipe camera above a line of filled baguettes“. | `seed-assets/img/crocodille-camera-line.jpg`, `seed-assets/copy/seo-geo/case-study-listing.json` (`heroImages`), `seoGeo.ts` |
| 7.2, 7.3 | Údaj „95 % přesnost detekce“ zmizí z karty Crocodille a MG Servis v seznamu. Na detailu případu zůstane. | Nové pole `metrics.hideInListing` (kolekce `case-studies`), migrace `20261111_121632_case_study_metric_listing`, `case-study-listing.json` (`hideInListing`), `CaseStudyMetrics.tsx` |
| 7.4 | Údaje karty v seznamu jsou od šířky `sm` v jednom řádku ve stejně širokých sloupcích. Dlouhý popis se zalomí ve svém sloupci. Pod `sm` se údaje smí zalomit pod sebe. Platí pro všechny karty, detail případu má styl beze změny. | `CaseStudyMetrics.tsx` (prop `listing`), `CaseStudyCard.tsx` |
| 7.5 | Citát je mezi kartami a sekcí „Řešení podle úlohy“. | `src/app/(frontend)/[locale]/case-studies/page.tsx` |
| 7.6 | „Třeba je na řadě právě váš provoz.“ / „Your operation could be next.“ | `src/i18n/messages/{cs,en}.json` (`caseStudies.ctaHeading`) |
| 7.7 | Hodnoty jsou v Payload (fotka, údaje), v i18n (výzva) a v kódu stránky (pořadí, styl). Text údajů v Payload jsem neměnil. Skrytí platí jen pro seznam. | viz výše |

### K3.1 Proč nové pole

Údaje (`metrics`) má seznam i detail společné. Smazání řádku by údaj odstranilo i z detailu, a to 7.7 zakazuje. Proto má každý řádek zaškrtávací pole „Show this result only on the detail page“ (`hideInListing`, výchozí hodnota `false`). Filip ho může měnit v administraci.

Migrace přidá sloupec `hide_in_listing` do `case_studies_metrics` a `_case_studies_v_version_metrics`. Před během skriptu na produkci musí migrace proběhnout.

### K3.2 Skript obsahu

Krok je v cyklu případů užití v `seoGeo.ts`. Řídí ho `case-study-listing.json`.

- Fotka: skript ji změní, jen když má hlavní případ fotku s názvem souboru podle `^tablet-line(-\d+)?\.png$` (lokálně `tablet-line.png`, v produkci `tablet-line-2`). Nové médium nahraje helper `media()`, stejně jako obrázek karty „Kontrola etiket“. Jiná fotka: report `case study crocodille-line-quality (hero image) changed by hand`, beze změny.
- Údaje: skript najde řádek podle anglické hodnoty a popisu (`95%`, `detection precision`) a nastaví `hideInListing`. Ostatní řádky a české texty zůstanou. Když řádek s tímto textem chybí: report `(listing results) changed by hand`, beze změny.
- Změny jdou do nové verze konceptu a skript ji v režimu `published` zveřejní (stejně jako ostatní případy užití).

Lokální běh z produkčního stavu: `created (1): media crocodille-camera-line.jpg`, `updated (5)`: fotka, údaje Crocodille, údaje MG Servis a dvě zveřejnění. Druhý běh: `created (0)`, `updated (0)`.

### K3.3 Ověření

Lokální databáze `robopipe_h9` (režim dev push, sloupec jsem přidal SQL z migrace), server `next start` na portu 3820 (ukončen podle PID).

| Kontrola | Výsledek |
|---|---|
| `tsc --noEmit` | 0 chyb |
| `eslint .` | 0 chyb, 2 stávající varování |
| `next build` | OK. První pokus selhal na limitu spojení Postgres (`max_connections` 40), druhý prošel. |
| `test:int` | 124/124 (22 souborů) |
| `test:e2e` | 92 prošlo, 2 selhaly (94). Obě selhání jsou známá i na `master` (K2.4). |

Nové testy:

- `tests/int/caseStudiesListing.int.spec.ts`: z produkčního stavu jeden běh do cíle (fotka, alt cs i en, skrytý jen řádek 95 % v obou jazycích, text zůstane), druhý běh beze změny (počet verzí stejný), ruční fotka zůstane, ručně změněný údaj zůstane a skript ho neskryje.
- `tests/e2e/caseStudiesListing.e2e.spec.ts` (cs, en): fotka a alt, žádné 95 % na kartách, citát nad „Řešení podle úlohy“, nová výzva, údaje druhé karty v jednom řádku na 1440 px, detail MG Servis 95 % dál ukazuje.

Screenshoty (celá stránka): `screens/round3/case-studies-{cs,en}-{1440,375}.jpg`.

### K3.4 Co má ověřit tester

- `/cs/case-studies` a `/en/case-studies` na 1440 px a 375 px: nová fotka bez tváří a cizích značek, alt podle obsahu.
- Karta Crocodille ukazuje jen „3 600 kusů / hod / linka“ a „19 různých kontrol na bagetě“. Karta MG Servis jen „5 různých kontrol na balení“.
- Detail obou případů dál ukazuje „95 % přesnost detekce“.
- Druhá karta: „< 1 min“ a „1“ vedle sebe na 1440 px, také na 1024 px a 768 px. Na 375 px smí být pod sebou.
- Citát je nad „Řešení podle úlohy“. Výzva: „Třeba je na řadě právě váš provoz.“ / „Your operation could be next.“
- Skript z produkčního stavu: jeden běh dá cíl, druhý nic nezapíše. Ručně změněná fotka nebo údaj zůstane a report hlásí `changed by hand`.
- Administrace: pole „Show this result only on the detail page“ u údaje funguje oběma směry.
- Migrace `20261111_121632_case_study_metric_listing` proběhne na kopii produkční databáze bez chyby.
