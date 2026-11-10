# Implementace: SEO a GEO pro Česko (issue #2)

Zadání: [`product.md`](./product.md). Architektura: [`architecture.md`](./architecture.md). Rozhodnutí Filipa z 10. 11. jsou v `product.md` a mají přednost před kapitolou 13 architektury.

Stav 10. 11. 2026: kód, texty a testy jsou hotové ve větvi `feat/seo-geo-use-cases`. Produkční databáze a produkční obsah jsou beze změny.

## 1. Co je hotové

| Oblast | Soubory |
|---|---|
| Kořen `/`: uložená volba jazyka, jinak `Accept-Language` | `src/proxy.ts`, `src/i18n/routing.ts`, `src/lib/localeSuggestion.ts`, `src/components/LanguageSwitcher.tsx` |
| Canonical, hreflang s `x-default`, Open Graph, oprava `og:image` | `src/lib/paths.ts` (`alternatesFor`, `localizedPaths`, `sectionPaths`), `src/lib/meta.ts`, všechny `page.tsx` s `generateMetadata` |
| JSON-LD: Organization, WebSite, Product s `offers` z ceníku, BlogPosting, FAQPage, BreadcrumbList | `src/lib/jsonLd.ts`, `src/components/JsonLd.tsx`, `src/lib/queries.ts` (`getPricing`) |
| Detail případu užití, karta jako odkaz, sdílené metriky | `src/app/(frontend)/[locale]/case-studies/[slug]/page.tsx`, `src/components/CaseStudyCard.tsx`, `src/components/CaseStudyMetrics.tsx`, `src/lib/redirects.ts` |
| Sitemap a `/llms.txt` z jednoho seznamu | `src/lib/indexable.ts`, `src/app/sitemap.ts`, `src/lib/llmsTxt.ts`, `src/app/llms.txt/route.ts` |
| Členství (Česká inovační platforma) v patičce, v pásu „Jsme součástí“ a v `memberOf` | `src/globals/SiteSettings.ts`, `src/blocks/LogoCloud/*`, `src/components/Footer.tsx`, `seed-assets/img/innovation-czechia*.svg` |
| Schéma: sekce a FAQ studií, `memberships`, `logoCloud.source`, odstranění prázdného `content` | `src/collections/CaseStudies.ts`, migrace `src/migrations/20261110_180954_seo_geo.ts`, `src/payload-types.ts` |
| 404 místo 500 pro `/foo.txt`, `/ads.txt` | `src/app/(frontend)/[locale]/page.tsx` |
| Přesměrování ze starého obchodu na případ užití zalistování | `next.config.ts` |
| Texty: 4 vstupní stránky, stránka auto anotace, sekce 4 studií, 33 FAQ, bloky úvodu, navigace, koncept článku | `seed-assets/copy/seo-geo/*` |
| Skript obsahu `pnpm seed:seo-geo` a volání v `pnpm seed` | `src/seed/seoGeo.ts`, `src/seed/applySeoGeo.ts`, `src/seed/index.ts` |
| Nový claim podle rozhodnutí F, seed ho nevrátí | `src/seed/index.ts`, `src/seed/csCopyFixes.ts` |
| Pojistka proti zápisu do vzdálené databáze (skript i integrační testy) | `src/lib/dbGuard.ts`, `vitest.setup.ts` |
| Testy | `tests/int/{meta,jsonLd,llmsTxt,indexable,seoGeo,dbGuard}.int.spec.ts`, `tests/e2e/seo.e2e.spec.ts`, přepsaný `tests/e2e/frontend.e2e.spec.ts` |
| README: jazyk kořene, SEO a GEO, případy užití, skript, testy | `README.md` |

Detaily článků blogu (úkol 4): v produkci mají hreflang `cs` a `en` už dnes (ověřeno na všech 22 URL ze sitemap). Chybí jim jen `x-default`. Teď ho mají v HTML i v sitemap. E2e test to hlídá na `/cs/blog/zive-skore-kvality` a `/en/blog/live-quality-score`.

## 2. Rozhodnutí Filipa a jak jsou zapracovaná

| Rozhodnutí | Zapracování |
|---|---|
| A1 koncepty v produkci smí vzniknout po dokončení PR | Postup v kapitole 5. Tato práce do produkce nic nezapsala. |
| A2 předanotaci mají všichni zákazníci | Zrušeno rozhodnutím G. |
| A3 adresa `/case-studies` zůstává | Beze změny URL. |
| A4 ceny v `Product.offers`, jeden zdroj | `offersFromPricing()` čte blok `pricingTable` z publikované stránky ceníku. Tarify bez částky a měny („Zdarma“, „Individuálně“) vynechá. V kódu nejsou žádné ceny. |
| A5 cílové výrazy v titulcích úvodu a výpisu | Výpis: `caseStudies.metaTitle`. Úvod: titulek nechávám podle rozhodnutí F (už obsahuje „AI kontrola kvality“). Skript mění jen meta popis úvodu (dnes 183 znaků, nový 135). |
| A6 šedé logo je v pořádku | Pás používá stávající styl `logoCloud`. |
| B cookie jazyka se nevypíná | Viz odchylka 1. |
| C auto anotace je funkce Robopipe Studia, ne open source | Texty mluví o „Robopipe Studio“. Stránka, článek a FAQ výslovně říkají, že open-source verze funkci neobsahuje. |
| D rozbitý `og:image` | `ogImageUrl()` přidá `SERVER_URL` jen k relativní URL. Platí pro všechny stránky včetně blogu. Hlídá to unit test i e2e. |
| E přesměrování ze starého obchodu | Oba cíle vedou na `/en/case-studies/ai-product-tagging`. E2e test s hlavičkou `Host: shop.robopipe.io`. |
| F nový claim | Seed má nový claim v nadpisu, `title` a `seo.title` úvodu a v `defaultSeo.title`. Z `csCopyFixes.ts` jsem odstranil dvojice, které by claim při novém spuštění oprav vrátily. |
| G auto anotace jen v tarifech Pro a Enterprise (ruší A2) | Tarify jsou podle ceníku v produkci (sloupce Open source, Standard, Pro, Enterprise, řádek „Automatické AI anotování obrázků“). Stránka (cs, en), článek a FAQ `aa-availability` říkají: tarify Pro a Enterprise, open-source verze ani tarif Standard ji neobsahují. Stránka a článek odkazují na ceník. |
| H claim zůstává, člověk návrhy kontroluje | Stránka, článek a FAQ `aa-approve` říkají, že návrhy rámečků vždy kontroluje, upravuje a schvaluje člověk. |
| I poskytovatel a umístění dat se nejmenují | Věta s `[ověřit]` je pryč. Stránka, článek a FAQ `aa-data` říkají: zákazník může použít offline model, případně Robopipe nasadí řešení u zákazníka (on-premise). V textech není žádné `[ověřit]`. Hlídá to `tests/int/autoAnnotationCopy.int.spec.ts`. |
| J akceptační kritéria | Doplněná v `product.md`. Testy: og:image na všech typech stránek včetně výpisu blogu a ceníku a odpověď 200 na obrázek (e2e), cíl přesměrování z obchodu vrací 200 (e2e), každá nabídka v `Product.offers` je tarif s cenou ze stránky ceníku (e2e, unit), claim v seedu a v opravách textů (`tests/int/claim.int.spec.ts`) a na úvodní stránce (e2e), hreflang s `x-default` na detailu článku (e2e). |

## 3. Odchylky od architektury

1. **Cookie jazyka (5.1, rozhodnutí B).** `localeCookie: false` zůstává, ale jen proto, aby next-intl cookie nezapisoval při každé návštěvě. To byla původní chyba. Cookie `NEXT_LOCALE` zapíše jen výslovná volba: přepínač v patičce a nabídka jazyka (`commitLocaleChoice`). `src/proxy.ts` ji čte jen pro kořen `/`. Pořadí je: prefix v cestě, uložená volba, `Accept-Language`, `en`.
2. **`Product` má `offers` (5.5, rozhodnutí A4).** Architektura počítala s `Product` bez cen.
3. **Bez `global-not-found` (5.3).** Příčina 500 u `/foo.txt` nebyla jen v chybějící stránce 404. `generateMetadata` úvodní stránky volal Payload s jazykem „foo.txt“ a databáze odmítla hodnotu, která není v enum jazyků. Kontrola jazyka v `[locale]/page.tsx` stačí: layout pak vrátí 404. `global-not-found.tsx` jsem zkusil v samostatném kroku. Build prošel, ale Next ho pro tyto cesty nepoužil (`/foo.txt` patří do route `[locale]`). Experimentální volbu proto nepoužívám.
4. **Výška loga v patičce 40 px, ne 20 px (5.8).** Logo je třířádkový nápis. Ve výšce ikony je nečitelné. Na 390 px a 375 px se layout nerozbije (e2e test i screenshoty).
5. **Mřížka patičky podle počtu sloupců.** S novým sloupcem „Řešení“ jsou sloupce 4. Původní mřížka měla místo jen pro 3, takže se čtvrtý zalomil pod ostatní. Mřížka teď má jednu stopu na značku a jednu na každý sloupec.
6. **Texty vstupních stránek jsou v Markdownu.** `landing-pages.json` drží strukturu, text bloku `content` je v `landing-<klíč>.cs.md` a `landing-<klíč>.md`. Filip tak čte texty v PR bez escapovaného JSON.
7. **FAQ se hledá podle české otázky.** Kolekce `faqs` nemá pole pro klíč a architektura (4.4) ji nemění. Klíč v `faqs.json` slouží jen k odkazům mezi soubory.
8. **Publikace publikuje poslední koncept.** Režim `--status=published` nejdřív doplní prázdná pole jako koncept a pak publikuje poslední koncept úvodu, 5 nových stránek a 4 studií. Bez toho by se koncepty z běhu `--status=draft` nikdy nepublikovaly. Když někdo mezitím upravil koncept těchto dokumentů v administraci, publikuje se i jeho úprava.
9. **Klíč překladu `nav.caseStudies`.** Architektura píše `common.caseStudies`. Klíč je v `nav`.
10. **Fakta o auto anotaci se liší od tabulky v kapitole 1.** Ve větvi `release` (merge 1c0b6530, 30. 10. 2026) SAM 3 není, byl odstraněn 18. 9. a 15. 10. Anotace jednoho snímku neběží jako úloha na pozadí, ale jako jedno volání modelu s průběžným vysíláním rámečků. Kontrola po jednotlivých rámečcích (přijmout/odmítnout) neexistuje: uživatel rámečky upraví nebo smaže a schválí celý snímek. Texty se řídí kódem.
11. **Testy a konfigurace.** `playwright.config.ts` čte `E2E_BASE_URL` (výchozí `http://localhost:3000`) a volitelně `PLAYWRIGHT_CHROMIUM_PATH`. Admin e2e test používá relativní URL a jeho test výpisu povoluje query string (`?depth=1&limit=10`). Původní test kvůli němu selhával. `vitest.config.mts` má `hookTimeout: 60 s`, protože start Payload trval na vytíženém stroji déle než 10 s.

## 4. Jak ověřit lokálně

Použitá instance: Postgres v kontejneru `robopipe-seo-pg` na portu 55433, server `next start` na portu 3310.

1. Spusť Postgres na volném portu a nastav v `.env` lokální `DATABASE_URL` a `NEXT_PUBLIC_SERVER_URL`.
2. Spusť `pnpm payload migrate`.
3. Spusť `NODE_ENV=production pnpm seed`. Proměnná zabrání „dev push“ schématu, takže databáze odpovídá produkci (jen migrace).
4. Spusť `pnpm seed:seo-geo --status=published`. Očekávaný výsledek: `created (0)`, `updated (0)`.
5. Spusť `pnpm build` a `pnpm start --port 3310`.
6. Spusť `pnpm test:int`.
7. Spusť `E2E_BASE_URL=http://localhost:3310 pnpm test:e2e`.

Simulace produkce před obsahem: smaž databázi, spusť krok 2, pak `SKIP_SEO_GEO=1 NODE_ENV=production pnpm seed`, pak `pnpm seed:seo-geo` (koncept) a nakonec `pnpm seed:seo-geo --status=published`.

## 5. Výsledky ověření (10. 11. 2026, lokálně)

| Kritérium | Výsledek |
|---|---|
| Nové stránky vrací 200, mají titulek, meta popis, jeden canonical na sebe, hreflang cs, en, x-default, `og:url`, `og:image` bez zdvojené adresy | OK, e2e pro 18 nových URL, 2 výpisy, úvod a 2 články |
| Nové URL v `sitemap.xml` s hreflang cs, en, x-default | OK, všech 18, kořen `/` v sitemap není |
| JSON-LD | OK. Každý blok je platný JSON s očekávanými typy (e2e). Strukturální kontrola povinných vlastností podle typu: 39 bloků na 10 stránkách, 0 chyb (`output/robopipe-web/seo/jsonld-validation.txt`). Externí validátor jsem nepoužil, HTML jsem mimo stroj neposílal. |
| `/llms.txt` | OK, 200, `text/plain`, začíná `# Robopipe`, obsahuje 10 URL vstupních stránek a 8 URL studií |
| Kořen `/` | OK bez cookie: `cs` a `sk` → `/cs`, `de` a bez hlavičky → `/en`, query string zůstává. S uloženou volbou vyhrává volba. Návštěva `/en` cookie nenastaví. Kliknutí na EN v patičce volbu uloží. |
| Staré URL `/cs/case-studies`, `/en/case-studies` | OK, 200, odkazují na všechny 4 detaily. Neznámý slug → 404. Záznam v `redirects` → 308. |
| Logo platformy na úvodu a v patičce v obou jazycích | OK, odkaz `https://innovationczechia.cz` v `main` i ve `footer` na `/cs` i `/en` |
| `/foo.txt`, `/ads.txt` | 404 (dříve 500) |
| Lighthouse SEO | 100 na `/cs` i `/cs/kamerova-kontrola-kvality` (mobil i desktop). Výkon mobil 81 a 78, desktop 98. |
| Mobil | OK, na 375 px nemá žádná stránka vodorovné posouvání (e2e). Screenshoty 390 px prohlédnuté. |
| Testy | Integrační 33/33, e2e 43/43, lint 0 chyb (2 dřívější varování), typecheck 0 chyb, build OK |
| Skript | Druhý běh nic nevytvoří ani nezmění. Ručně změněné pole zůstane. Režim koncept nezmění publikovanou verzi ani globals. Bez `--production` odmítne vzdálenou databázi. |

Screenshoty a zprávy Lighthouse: `/Users/m1/.openclaw/workspace/output/robopipe-web/seo/`.

## 6. Jak spustit obsah v produkci po schválení

Podmínka: Filip schválil texty v `seed-assets/copy/seo-geo/` a PR je sloučený do `master`. Coolify nasadí a migrace proběhne při buildu.

1. Před sloučením ověř, že pole `content` je u 4 studií prázdné: `curl -s 'https://robopipe.io/api/case-studies?locale=all&depth=0' | jq '[.docs[] | .content]'`. Ověřeno 10. 11.: prázdné v obou jazycích.
2. Po nasazení otevři https://robopipe.io/cs/case-studies a zkontroluj, že karty vedou na detail.
3. Nastav v terminálu produkční `DATABASE_URL`, `PAYLOAD_SECRET`, `GCS_BUCKET` a `GCS_CREDENTIALS` z Coolify. Hodnoty nikam neukládej.
4. Spusť `pnpm seed:seo-geo --production --dry-run` a zkontroluj seznam.
5. Spusť `pnpm seed:seo-geo --production`. Vzniknou jen koncepty, globals se nemění.
6. Filip zkontroluje koncepty v administraci přes náhled.
7. Po souhlasu spusť `pnpm seed:seo-geo --production --status=published`.
8. Počkej až 10 minut (`revalidate = 600`). Skript běží mimo Next.js a revalidaci nevyvolá.
9. Ověř kritéria: `curl -sI -H 'Accept-Language: cs' https://robopipe.io/`, `curl -s https://robopipe.io/llms.txt`, `curl -s https://robopipe.io/sitemap.xml`, Google Rich Results test na úvod, `/cs/kamerova-kontrola-kvality`, jednu studii a jeden článek, Lighthouse na úvod a jednu vstupní stránku.

Koncept článku o auto anotaci skript nikdy nepublikuje. Filip ho publikuje v administraci. Článek o Manufacturing Forum skript nemění (hledá jen slug `automaticka-anotace-dat`).

## 7. Známá omezení

1. **Dvojitá hlavička `Location`.** Při prvním renderu na vyžádání, který skončí přesměrováním z kolekce `redirects`, pošle Next.js hlavičku `Location` dvakrát se stejnou hodnotou. Další požadavky ji mají jednou. Stávající route `[slug]` se chová stejně. Prohlížeče stejné hodnoty přijmou. E2e test bere první hodnotu.
2. **Ceník v seedu nemá auto anotaci.** Produkční ceník má sloupec Open source a řádek „Automatické AI anotování obrázků“ u Pro a Enterprise. Seed ceníku (`seed-assets/copy/pricing.json`) je starší a obojí chybí. Texty o auto anotaci se řídí produkcí. Seed ceníku tato práce nemění.
3. **Na anglickém webu je české logo platformy.** Členství nejsou lokalizovaná (architektura 4.2). Anglické logo je v mediakitu jen jako PNG.
4. **Logo pro tmavou patičku** je odvozené z oficiálního SVG „CZ Purple_Black“: fialový symbol a bílý text. Tuto variantu ukazuje logomanuál na straně 4. Jako SVG v mediakitu není.
5. **Obrázek `annotate-ui.png`** na stránce auto anotace, v bloku na úvodu a u konceptu článku je stávající snímek anotačního rozhraní, ne snímek funkce auto anotace.
6. **Starý claim v `site-settings.defaultSeo.title` v produkci.** Kód toto pole nepoužívá. Seed už má nový claim.
7. **FAQ vznikají hned.** Kolekce `faqs` nemá koncepty. V režimu koncept jsou nová FAQ přes API čitelná, ale žádná publikovaná stránka je neukazuje.
8. **Režim `--status=published` publikuje poslední koncept** spravovaných dokumentů (odchylka 8).
9. **Výkon na mobilu** je v Lighthouse 78 až 81. Kritérium se ho netýká.
10. **Prostředí testů.** Stažení Chromium 1208 pro Playwright se na tomto stroji zaseklo při rozbalování. E2e testy, Lighthouse a screenshoty běžely s Chromium 1248 přes `PLAYWRIGHT_CHROMIUM_PATH`.

## 8. Seznam `[ověřit]`

V textech už žádná značka `[ověřit]` není. Bod o cloudu a poskytovateli modelu vyřešilo rozhodnutí I. Rozpor ceníku a A2 vyřešilo rozhodnutí G.

Body bez značky v textu, které potvrdí Filip:

1. Obrázek `annotate-ui.png` u auto anotace (omezení 5).
2. Odvozené logo pro tmavou patičku a české logo na anglickém webu (omezení 3 a 4).
3. Obecná srovnání s pravidlovým strojovým viděním na stránkách „AI kontrola kvality“ a „Strojové vidění“. Nejsou to fakta z webu, ale obecný popis oboru. Neobsahují žádná jména konkurentů ani čísla.
4. Úvodní stránka má dva tmavé bloky `processSteps` za sebou („AI kontrola v provozu“ a nový blok o auto anotaci). Pořadí určuje architektura 6.3.
5. Seed ceníku nemá auto anotaci ani sloupec Open source (omezení 2).
