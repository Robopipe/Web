# Implementace: SEO a GEO etapa 2 (issue #6)

Zadání: [`product.md`](./product.md). Architektura: [`architecture.md`](./architecture.md). Doplnění: [`addendum-remote-seed.md`](./addendum-remote-seed.md) (režim REST a odpovědi Filipa z 10. 11. 22:24). Doplnění má přednost před architekturou.

Stav 10. 11. 2026: kód, texty a testy jsou hotové ve větvi `feat/seo-geo-stage2`. Produkční databáze a produkční obsah jsou beze změny. Proti produkci běžel jen `--dry-run` (čtení).

## 1. Co je hotové

| Oblast | Soubory |
|---|---|
| Schéma: `site-settings.solutions`, `company`, `verification`, `industryCards.source`, `pricingTable.source`, odstranění `footer.copyright` | `src/globals/SiteSettings.ts`, `src/globals/Footer.ts`, `src/blocks/IndustryCards/config.ts`, `src/blocks/PricingTable/config.ts`, migrace `src/migrations/20261110_212327_seo_geo_stage2.ts`, `src/payload-types.ts` |
| Seznam řešení: karty na úvodu a ve výpisu případů užití, sloupec „Řešení“ v patičce | `src/lib/queries.ts` (`getSolutionPages`, `solutionPagesFrom`), `src/blocks/IndustryCards/Component.tsx`, `src/components/Footer.tsx`, `src/app/(frontend)/[locale]/layout.tsx`, `src/app/(frontend)/[locale]/case-studies/page.tsx` |
| Ceny na stránce řešení z ceníku, filtr v `getPricing` | `src/blocks/PricingTable/Component.tsx`, `src/lib/queries.ts` |
| Fakta o firmě: `Organization` (`legalName`, `identifier`, `description`), patička, postranní panel kontaktu, `llms.txt` | `src/lib/jsonLd.ts`, `src/components/Footer.tsx`, `src/blocks/ContactForm/Component.tsx`, `src/lib/llmsTxt.ts`, `src/app/llms.txt/route.ts` |
| Ověřovací značky Bing a Seznam | `src/lib/meta.ts` (`verificationMeta`), `generateMetadata` v `src/app/(frontend)/[locale]/layout.tsx` |
| Překlady `footer.solutions`, `caseStudies.byTask`, `contact.companyIdLabel` | `src/i18n/messages/{cs,en}.json` |
| Skript obsahu: pravidla 1 až 9 z kapitoly 6.6, nové bloky `tasks`, `pricing`, `contact` | `src/seed/seoGeo.ts` |
| Režim `--remote=<URL>` přes REST API (doplnění, krok 12) | `src/seed/remoteClient.ts`, `src/seed/applySeoGeo.ts` |
| Texty: rozšíření stránky řešení, 4 stránky úloh, „O nás“, 20 nových FAQ, ceník, průvodce, úvod, patička. Odstraněné 3 stránky etapy 1 a jejich FAQ. | `seed-assets/copy/seo-geo/*` |
| Testy | `tests/int/{solutions,layoutMetadata,seoGeoStage2,copyLinks,remoteClient}.int.spec.ts`, doplněné `jsonLd`, `meta`, `llmsTxt`, `tests/e2e/seo-stage2.e2e.spec.ts`, upravený `tests/e2e/seo.e2e.spec.ts` |
| README: soubory s texty, pojistka značek, režim REST, ověřovací značky | `README.md` |

## 2. Rozhodnutí a jak jsou zapracovaná

| Otázka | Odpověď | Zapracování |
|---|---|---|
| 1. Tři stránky etapy 1 | odstranit (Filip nenamítal) | Pryč z `landing-pages.json`, jejich Markdown a FAQ `aqi-*`, `cv-*`, `mv-*` také. Odkazy nahrazené podle tabulky 9.8. Seznam slugů je v `landing-pages.json` → `obsolete`. Skript je vypíše jako `obsolete: <slug>` a nemaže je. |
| 2. Adresa | kontakt Sokolovská 81/55, sídlo z rejstříku jen v řádku o zápisu | `company.registration` (`settings.json`) obsahuje sídlo Plynární 1032/29 a zápis. `contact.address` skript nemění. |
| 3. LinkedIn | beze změny dat | `socials` skript nemění. Viz omezení 1. |
| 4. Etikety | Robopipe umí číst datum spotřeby (doplnění 2) | Stránka „Kontrola etiket“ má odstavec, odrážku, meta popis a FAQ `li-date` o čtení data spotřeby. Bez přesnosti a bez čísel. |
| 5. Pořadí nasazení | jeden běh po sloučení etapy 2 | Skript funguje i v pořadí z 11.3. Ověřené na databázi po `pnpm seed` z `master` (kapitola 5). |
| Název firmy | „robopipe s.r.o.“ s malým r (doplnění 2) | `settings.json` → `company.legalName`. Patička, `Organization.legalName` a `llms.txt` ho čtou z `site-settings`. Značka v textech zůstává „Robopipe“. |
| Fakta „O nás“ | role jednatelů, spin-off KOALA42, rok 2024, 5 lidí (doplnění 2) | Text `landing-about*.md` je bez značek. Skript stránku publikuje a přidá odkaz do sloupce „Společnost“ / „Company“. |

## 3. Odchylky od architektury

1. **Malé „r“ přes migraci.** Migrace podle 5.2 kopíruje `footer.copyright` („Robopipe s.r.o.“) do `company.legalName`. Pravidlo 4 by pak hodnotu už nezměnilo. `settings.json` proto má `company.replaceIf.legalName: "Robopipe s.r.o."`. Skript tuto jednu hodnotu nahradí podobou z rejstříku. Jinou ruční hodnotu nemění.
2. **Hero stránky řešení.** AC 3 chce hlavní slovo v prvním odstavci. Hero text stránky z etapy 1 ho neměl. Text v `landing-pages.json` začíná „Kamerová kontrola kvality od Robopipe: …“. Platí jen pro nově vytvořenou stránku, což je doporučené pořadí (v produkci stránka zatím není).
3. **Slova strojové a počítačové vidění na stránkách úloh.** Pravidlo 9.0 chce „(anglicky machine vision)“ u prvního výskytu. Anglické texty uvádějí jen anglický název.
4. **Seznam odstraněných stránek.** Architektura (pravidlo 9) nepopisuje, odkud skript zná slugy odstraněných stránek. Jsou v `landing-pages.json` → `obsolete`.
5. **Nové pole `contact` ve stránce.** Stránka „O nás“ má podle 9.6 blok `contactForm`. `LandingLocale` má proto volitelné pole `contact` (6.6 ho uvádí) a `image` stránky je volitelné (hero bez obrázku).
6. **Mřížka karet řešení.** Šest karet se na desktopu vykreslí ve dvou řadách po třech. Jiný počet zůstává po čtyřech jako dřív.
7. **`getPricing` má volbu `depth`.** Blok `pricing` potřebuje tlačítka tarifů s odkazem na stránku, proto čte ceník s `depth: 1`. `Product.offers` čte dál s `depth: 0`.
8. **Globál přes REST je `POST`, ne `PATCH`.** Payload REST mění globál metodou `POST /api/globals/<slug>`. Kapitola 8 architektury píše `PATCH`. README a e2e test používají `POST`.
9. **Stávající blok na existující stránce v angličtině.** Payload při uložení české verze zkopíruje české hodnoty nového bloku do angličtiny. Skript proto v druhém jazyce nové bloky nahradí anglickou verzí (`seoGeo.ts`, pravidlo 2). Bez toho by anglická stránka řešení dostala český blok `tasks`. Hlídá to `seoGeoStage2.int.spec.ts`.
10. **Výpis dry run.** V dry run nová FAQ ani média nemají id. Výpis je proto uvede jednou a FAQ ceníku spočítá podle klíčů.

## 4. Jak ověřit lokálně

Instance: Postgres 17 v kontejneru `robopipe-stage2-pg` na portu 55443, server `next start` na portu 3330. Příkazy přes `npx -y pnpm@10`.

1. Spusť `pnpm payload migrate`.
2. Spusť `NODE_ENV=production pnpm seed`.
3. Volitelně naimportuj průvodce a článek o trendech z produkčního API (`/api/posts/10`, `/api/posts/6`, `locale=all`). Bez nich skript vypíše `post … (not found)` a odkazy na ně v textech vrací 404.
4. Spusť `NODE_ENV=production pnpm seed:seo-geo --status=published`. Druhý běh: `created (0)`, `updated (0)`.
5. Spusť `pnpm test:int` (bez `NODE_ENV=production`, jinak Vitest neumí načíst Payload).
6. Spusť `pnpm build` a `pnpm start --port 3330`.
7. Spusť `E2E_BASE_URL=http://localhost:3330 PLAYWRIGHT_CHROMIUM_PATH=… pnpm test:e2e`.

Před novým seedem smaž i složku `media`. Jinak Payload přejmenuje nahraný soubor (`camera-line-1.jpeg`), skript podle názvu médium nenajde a nahraje ho znovu.

Pořadí z 11.3 (skript etapy 1 běžel dřív): databáze po `pnpm migrate` a `pnpm seed` z `master`, pak `pnpm payload migrate` z této větve, pak `pnpm seed:seo-geo`.

## 5. Výsledky ověření (10. 11. 2026, lokálně)

| Kritérium | Výsledek |
|---|---|
| AC 1: 5 párů URL 200, sitemap s hreflang, `llms.txt` | OK (e2e) |
| AC 2: titulek do 60, popis do 160, jeden canonical, `og:image` 200, platné JSON-LD s `BreadcrumbList` a `FAQPage` | OK, 10 URL (e2e) |
| AC 3: hlavní slovo v titulku, H1 a prvním odstavci | OK, 10 URL (e2e) |
| AC 4: reference nebo otevřená věta | OK (e2e). Etikety: věta „Veřejnou referenci na kontrolu etiket zatím nemáme.“ |
| AC 5: „O nás“ 200, jeden `Organization` | OK. „O nás“ vrací 200 v obou jazycích (text bez značek). `Organization` je jednou na 14 URL a má `legalName` a `identifier`. |
| AC 6: značky Bing a Seznam | OK. Int: `verificationMeta` (4 případy) a `generateMetadata` layoutu s Payload. E2e: bez hodnoty žádná značka, po zápisu přes REST obě značky, po smazání jedné jen druhá. |
| AC 7: ceny na stránce řešení | OK. Tarify v bloku `pricing` mají stejné názvy a částky jako ceník a `Product.offers` (cs, en). |
| AC 8: značky v publikovaném stavu | OK. Žádná URL ze sitemap nemá `[doplnit Filip]` ani `[ověřit]` (e2e). Dokument se značkou zůstane konceptem (int). |
| AC 9: mobil 320 a 390 px | OK, 10 URL, výpis studií, úvod (e2e). Screenshoty prohlédnuté. |
| AC 10: Lighthouse SEO | 100 na `/cs/kamerova-kontrola-kvality` a `/cs/kontrola-etiket`, mobil i desktop. Výkon mobil 70 a 65, desktop 99. |
| Testy | Integrační 93/93. E2e 67 prošlo, 1 selhal (známá chyba L1, omezení 5). Lint 0 chyb (2 stávající varování). `tsc --noEmit` 0 chyb. `pnpm build` OK. |
| Migrace | Na čisté databázi OK. Na databázi po `pnpm seed` z `master`: `company.legalName` = „Robopipe s.r.o.“ z `copyright`. `migrate:down` vrátí `footer.copyright`. |
| Skript, pořadí 11.3 | Na databázi z `master`: koncept vytvoří 5 stránek a doplní bloky `tasks` a `pricing` stránky řešení. Publikace publikuje 11 dokumentů, odstraní sloupec „Řešení“ z patičky a opraví název firmy. Druhý běh nic nezmění. |
| Režim REST | Kopie téže databáze, server na portu 3331, účet role editor. Stejná sekvence (koncept, koncept, publikace, publikace) dala stejné počty. Výsledné stránky, stavy, počty bloků, FAQ, média, patička a `site-settings` jsou shodné s lokálním během (porovnání SQL). |
| Produkce, `--remote=https://robopipe.io --dry-run --status=published` | Přihlášení `arthur@robopipe.io` OK, žádná chyba práv při čtení. Plán: vytvořit 52 (7 stránek, 1 článek konceptem, FAQ, média), změnit 11 (4 studie, úvod, průvodce, ceník +3 FAQ, header, patička, členství, firma). `site-settings solutions` se v dry run přeskočí, protože nové stránky ještě nemají id. Zápis práv editora v produkci netestuji (zadání ho zakazuje). |

Screenshoty a zprávy Lighthouse: `/Users/m1/.openclaw/workspace/output/robopipe-web/seo-stage2/`.

## 6. Jak spustit obsah v produkci po schválení

Podmínka: Filip schválil texty a PR je sloučený. Coolify nasadí a migrace proběhne při buildu.

1. Spusť `SEED_REMOTE_EMAIL=arthur@robopipe.io SEED_REMOTE_PASSWORD="$(security find-generic-password -a arthur@robopipe.io -s robopipe-payload-password -w)" pnpm seed:seo-geo --remote=https://robopipe.io --dry-run --status=published`. Zkontroluj plán.
2. Spusť totéž bez `--dry-run` a s `--status=draft`. Vzniknou koncepty, globály se nemění.
3. Filip zkontroluje koncepty v administraci.
4. Spusť totéž s `--status=published`.
5. Druhý běh s `--status=published` musí hlásit `created (0)`, `updated (0)`.
6. Ověř `curl -s https://robopipe.io/llms.txt`, `sitemap.xml` a Rich Results test na `/cs/kamerova-kontrola-kvality` a `/cs/o-nas`.

V zsh dej každý přepínač jako samostatné slovo. Proměnná `$st="--dry-run --status=published"` se v zsh nerozdělí a skript dostane jeden neznámý argument. Tak jsem omylem spustil lokální běh v režimu koncept místo dry run.

## 7. Známá omezení

1. **LinkedIn.** `site-settings.socials` v produkci odkazuje na `linkedin.com/company/koala42`. `Organization.sameAs` tak tvrdí, že jde o stejnou firmu. Filip u otázky 3 nenamítal. Data proto zůstávají beze změny.
2. **Odstraněné stránky v databázi.** Když skript etapy 1 v produkci poběží dřív, tři stránky zůstanou publikované. Skript vypíše `obsolete`. Přesměrování podle 9.8 přidá Arthur po souhlasu Filipa.
3. **Úprava textů existující stránky.** Skript u existující stránky jen doplní chybějící bloky. Nový hero text stránky řešení a nové odkazy v jejím textu se při pořadí 11.3 neprojeví (11.3 to předpokládá).
4. **Seed adresy.** Lokální seed má jinou adresu (Thámova 13) než produkce (Sokolovská 81/55). Skript v adrese mění jen název firmy na „robopipe s.r.o.“ (kapitola 8, T7).
5. **Známá chyba L1 z issue #3.** Test `Blog featured card › keeps the photo inside the card on mobile with a long unbroken title` selhává záměrně, i na `master`.
6. **Lokální články.** Průvodce a článek o trendech nejsou v lokálním seedu. Pro ověření jsem je naimportoval z produkčního API (jen čtení). Bez importu e2e test interních odkazů selže na odkazech na tyto články.
7. **Výkon na mobilu** je v Lighthouse 65 až 70. Kritérium se ho netýká.

## 8. Opravy po testu (11. 11. 2026)

Vstup: `test-report.md`, kapitola 7.

| Chyba | Oprava | Ověření |
| --- | --- | --- |
| T1 | Nový modul `src/seed/seoGeoArgs.ts`. Skript zná jen `--status=draft\|published`, `--dry-run`, `--production` a `--remote=<URL>`. Jiný argument, chybný tvar (`--status published`), neznámá hodnota, opakovaný přepínač a adresa bez `http(s)` ukončí běh kódem 1 se zprávou a nápovědou. Kontrola proběhne před připojením k databázi a před přihlášením. | `seoGeoArgs.int.spec.ts` (10 testů). Skutečný běh: `--status=published --dryrun`, `--status published` a `--dry_run` skončí kódem 1, databáze se nezmění. |
| T2 | Existující stránka bez titulku nebo slugu v jednom jazyce dostane tento jazyk celý znovu (titulek, slug, `seo`, bloky). Publikace přeskočí stránku úlohy, které jazyk chybí (`draft (missing locale en): …`). Článek o automatické anotaci má stejnou opravu. | Test `repairs a page left without English …`. Skutečný běh přes REST a proxy, která zahodí `PATCH /api/pages/<id>?locale=en`: 1. běh kód 1, stránka jen `cs` a koncept. 2. běh `updated (2): page kontrola-etiket (missing locale en), page kontrola-etiket published`. 3. běh `created (0)`, `updated (0)`. `/en/label-inspection` vrací 200, sitemap stránku obsahuje. |
| T3 | `remoteClient.ts`: chyba bez odpovědi HTTP je `RemoteNetworkError` s metodou, adresou, cestou a příčinou (kód systému, například `ECONNREFUSED`). Každý požadavek má časový limit 30 s (`timeoutMs`). Adresu bez `http(s)` klient odmítne před prvním požadavkem. | 3 nové testy v `remoteClient.int.spec.ts`. Skutečný běh: `POST http://localhost:3399/api/users/login failed: ECONNREFUSED`, výpadek proxy: `PATCH http://localhost:3341/api/pages/54 failed: UND_ERR_SOCKET (other side closed)`. |
| T4 | Skript si pamatuje data nových konceptů i v dry run. Krok publikace proto v dry run uvede nové stránky, změněné dokumenty a ceník. `site-settings solutions` počítá i plánované stránky. Odkaz „O nás“ v patičce počítá s plánovanou publikací. | Test `plans in a dry run the same changes and publications as the real run`: plán se rovná skutečnému běhu (řádky seřazené, FAQ se čtou souběžně). Dry run proti produkci níže. |
| T5 | Test použije existující stránku `strojove-videni`, jinak ji vytvoří a potom smaže. | Test prošel s existující stránkou i bez ní. |
| T6 | Hero stránky „Kontrola etiket“ má `camera-front.png` (fotka kamery bez čísel). Nové pole `replaceImage` vymění starý obrázek i na existující stránce. | `/cs/kontrola-etiket` a `/en/label-inspection` vykreslí `camera-front`. |
| T7 | Lokální seed a `contact.json` píšou „robopipe s.r.o.“. Skript etapy 2 v publikačním režimu nahradí „Robopipe s.r.o.“ v `site-settings.contact.address` a v textu, titulku a `seo` stránky `ochrana-osobnich-udaju` (`settings.json`, `companyName`). | Test `writes the company name in lower case …`. Kontakt a `llms.txt` lokálně jen „robopipe s.r.o.“. |
| T9 | Nadtitulek úvodu „Průmyslové strojové vidění“ se změní na „Průmyslové strojové vidění (machine vision)“, jen při přesné staré hodnotě (`home.json`, `hero.eyebrow`). Hero nadpis, `title` a `seo.title` úvodu skript nemění. Stránka „O nás“ uvádí „machine vision“ jen jednou v jedné větě. | Test T4 ověří nadtitulek i zachovaný ruční nadpis. |

Výchozí prompt v `BlogAI.ts` stále uvádí „Robopipe s.r.o.“. Je to výchozí hodnota sloupce v databázi. Změna by potřebovala migraci, proto zůstala mimo tuto opravu. Text se na webu nezobrazí.

### T8 jako nové issue

Přepínač jazyka v HTML ze serveru vede na 404 (`/cs/kontrola-etiket` → `/en/kontrola-etiket`, v produkci `/cs/cenik` → `/en/cenik`). Po hydrataci je odkaz správný. Chyba existuje už v produkci a etapa 2 ji nezpůsobila. Návrh pro nové issue: server musí vykreslit odkaz na slug druhého jazyka, stejně jako značky `hreflang`.

### Výsledky ověření

| Kontrola | Výsledek |
| --- | --- |
| Integrační testy | 109/109 (19 souborů). Nové: 10 (argumenty), 3 (klient REST), 3 (etapa 2). |
| E2e | 67 prošlo, 1 selhal (známá chyba L1). Chromium 1248 přes `PLAYWRIGHT_CHROMIUM_PATH`. |
| Lint | 0 chyb, 2 stávající varování. |
| `tsc --noEmit` | 0 chyb. |
| `pnpm build` | OK. |

Poznámka k testům: Vitest v prostředí jsdom neumí nahrát nové médium (`ValidationError: file`). Nové médium `camera-front.png` proto musí nahrát `pnpm seed:seo-geo` před `pnpm test:int`.

### Dry run proti produkci (11. 11. 2026)

`pnpm seed:seo-geo --remote=https://robopipe.io --status=published --dry-run`, účet `arthur@robopipe.io`, kód 0.

- `created (52)`: 7 stránek, 36 FAQ, 8 médií (`camera-front.png` místo snímku klasifikace), koncept článku o automatické anotaci.
- `updated (29)`: 4 studie, úvod, FAQ ceníku (+3), průvodce, jméno firmy na stránce ochrany osobních údajů. Publikace: 4 studie, 7 stránek, úvod, ceník, průvodce, ochrana osobních údajů (15). Globály: navigace, patička, členství, `solutions`, `company`, `contact address`.
- `skipped (0)`.

