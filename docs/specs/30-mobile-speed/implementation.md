# #30 Rychlost webu na mobilu: implementace

Režim B (jeden vývojář). Větev `perf/30-mobile-speed` z `origin/master` (`2dbbc9e`). Zadání je analýza `lighthouse-2026-11-12/analysis.md` (příčiny 1 až 7).

## Co je hotové

1. **Písma** (`src/app/(frontend)/[locale]/layout.tsx`, `styles.css`). Před prvním vykreslením se načítá 8 souborů písem (118 KiB) místo 14 (289 KiB).
   - Space Mono je pryč. Žádný prvek ho nepoužívá (viz tabulka níže). `--font-mono` je teď `ui-monospace, monospace`.
   - Inter má `preload: false` a jen řez 600 místo proměnného písma 100 až 900. Dva soubory mají 24 KiB a 36 KiB místo 84 KiB a 48 KiB.
   - Barlow má dál řezy 500, 600 a 700. Všechny tři se používají.
2. **Obrázky** (`src/lib/imageSizes.ts`, `src/components/Media.tsx`). `Media` má výchozí `sizes` podle šířky kontejneru: `(min-width: 1152px) 1088px, 100vw`. Bloky dávají přesné hodnoty podle rozvržení:
   - FeatureGrid a IndustryCards: jedna karta mřížky, počet sloupců a mezera podle bloku (`gridSizes`).
   - IndustrySection a ProcessSteps: jeden sloupec ze dvou (`HALF_SIZES`, 560 px nahoře kvůli `object-cover`).
   - MediaBlock: sloupec `max-w-4xl` (`FIGURE_SIZES`).
   - LogoCloud: přesná šířka loga při výšce 48 px podle poměru stran (`fixedHeightSizes`).
   - Ostatní volání (PostCard, CaseStudyCard, patička, články) dostanou výchozí hodnotu.
3. **Plakát videa** (`src/blocks/Hero/Component.tsx`). Plakát je obrázek `next/image` (`fill`, `sizes` podle varianty hlavičky, `loading="eager"`, bez `fetchpriority="high"`) pod videem v boxu s pevnou výškou. Video nemá atribut `poster` ani `src` v HTML. Do prvního snímku je průhledné a pak obrázek překryje. CLS je 0 (e2e test i Lighthouse).
4. **Mezipaměť obrázků** (`next.config.ts`): `images.minimumCacheTTL` je 30 dnů.
5. **Video pro mobil.**
   - Nové volitelné lokalizované pole `mobileVideo` v bloku Hero (`src/blocks/Hero/config.ts`), migrace `20261112_084552_hero_mobile_video` (dva sloupce `mobile_video_id`, cizí klíče, indexy).
   - `src/blocks/Hero/videoSource.ts` vybere soubor: obrazovka do 767 px a vyplněné pole dává malou kopii, jinak hlavní video. Při `Save-Data` (`navigator.connection.saveData`) nebo `prefers-reduced-data: reduce` se video nespustí a zůstane plakát.
   - `HeroVideo` nastaví `src` až při spuštění po `load`. Chování z #19 (`preload="none"`, spuštění skriptem po `load`) zůstává.
   - Když pole není vyplněné, telefon dostane hlavní video jako dnes.
   - Připravená videa (ffmpeg z `hero-v3-cs.mp4` a `hero-v3-en.mp4`): 640 × 360, H.264 High, bez zvuku, `+faststart`, CRF 28. Velikost 917 KiB (cs) a 918 KiB (en) místo 5 576 KiB a 5 580 KiB.
6. **Značka Google** (`src/lib/analytics.ts`). Skript `gtag.js` se vloží po `load` až při nečinnosti prohlížeče: `requestIdleCallback` s limitem 2 s, v Safari `setTimeout` 500 ms. Fronta `dataLayer`, výchozí souhlas `denied`, `ads_data_redaction`, uložená volba a `config` se nastaví hned jako dřív. Pořadí „výchozí souhlas před načtením skriptu“ se nemění.

Skript pro nahrání videí po nasazení: `docs/specs/30-mobile-speed/upload-mobile-video.sh` (viz kroky níže). Je ověřený proti místní instanci.

## Kde se které písmo používá

Ověřeno dvakrát. Za prvé výpočtem stylů všech textových prvků na 45 místních stránkách ze sitemap (`getComputedStyle` a `document.fonts`). Za druhé hledáním `<code>`, `<pre>`, `<kbd>` a `<samp>` v HTML všech 58 adres z produkční sitemap.

| Písmo | Třída | Řezy v použití | Kde | Načítání |
|---|---|---|---|---|
| Space Grotesk (proměnné 300 až 700) | `font-sans` (celé `body`) | 400, 500, 600, kurzíva 400 (dopočtená prohlížečem) | běžný text, tlačítka, odkazy | přednačtené, 2 soubory, 41 KiB |
| Barlow | `font-heading` | 700 | `h1` až `h4` (`styles.css`), PlanComparison | přednačtené |
| | | 600 | `h5`, `h6`, malé nadpisy s `font-semibold` | přednačtené |
| | | 500 | citace v TestimonialBar a v přehledu případů užití (`font-medium`) | přednačtené |
| Inter | `font-numbers` | jen 600 (všechna místa mají `font-semibold`) | Stats, ProcessSteps (čísla kroků a statistiky), PricingTable (ceny), IndustrySection, CaseStudyMetrics, stránka 404 | bez přednačtení, 24 KiB, druhý soubor (36 KiB) jen když text potřebuje jeho znaky |
| Space Mono | `font-mono` | žádný | žádná stránka, místně ani na produkci | odebráno |

Barlow celkem: 6 souborů, 77 KiB. Rozdělit Barlow 500 do samostatného nepřednačteného písma by ušetřilo asi 26 KiB. Neudělal jsem to, protože citace by se pak mohla na okamžik vykreslit náhradním písmem.

## Měření

Lighthouse 12.8.2, `--form-factor=mobile --only-categories=performance` (simulace), produkční build (`next build` a `next start`) na `localhost:3930`, databáze `robopipe_30`. Vždy jedno měření najednou. Na obou stranách stejná data:

- plakát z produkce (`hero-poster.jpg`),
- testovací ID Google `G-TEST000000` a `AW-000000000`,
- hlavní video ze seedu (`line-loop.mp4`, 13,5 MB),
- po změně navíc malá kopie `hero-v3-cs-mobile.mp4` v poli `mobileVideo`.

Výchozí stav je `origin/master` (`2dbbc9e`) ve vlastním worktree se stejnou databází a stejnými soubory médií.

| Stránka | Běh | Výkon před | Výkon po | FCP před | FCP po | LCP před | LCP po | TBT před | TBT po | Přenos před | Přenos po |
|---|---|---|---|---|---|---|---|---|---|---|---|
| /cs | 1 | 81 | **85** | 1,21 s | 1,37 s | 5,07 s | **4,31 s** | 87 ms | 90 ms | 14 652 KiB | 1 862 KiB |
| /cs | 2 | 80 | **86** | 1,21 s | 1,37 s | 5,28 s | **4,16 s** | 79 ms | 90 ms | 14 652 KiB | 1 862 KiB |
| /cs/kamerova-kontrola-kvality | 1 | 80 | **89** | 1,21 s | 1,82 s | 5,35 s | **3,62 s** | 77 ms | 79 ms | 924 KiB | 813 KiB |
| /cs/kamerova-kontrola-kvality | 2 | 81 | **84** | 1,21 s | 1,82 s | 4,98 s | **4,31 s** | 75 ms | 86 ms | 924 KiB | 813 KiB |

CLS je 0 ve všech během před i po. Prvek LCP je pořád odstavec v hlavičce. Přenos na /cs klesl hlavně díky malé kopii videa: na telefonu se stáhne 918 KiB místo celého videa. Na produkci to bude 918 KiB místo 5 576 KiB.

Varianty písma Inter, které jsem změřil (stejné podmínky, /cs a stránka řešení, 2 běhy):

| Varianta | /cs výkon | /cs FCP | /cs LCP | řešení výkon | řešení FCP | řešení LCP |
|---|---|---|---|---|---|---|
| master: proměnné Inter, přednačtené | 80, 81 | 1,21 s | 5,07, 5,28 s | 80, 81 | 1,21 s | 4,98, 5,35 s |
| proměnné Inter, bez přednačtení | 84, 84 | 1,53 s | 4,29, 4,33 s | 81, 83 | 2,13 s | 4,24, 4,61 s |
| **Inter 600, bez přednačtení (zvoleno)** | 85, 86 | 1,37 s | 4,16, 4,31 s | 84, 89 | 1,82 s | 3,62, 4,31 s |
| Inter 600, přednačtené | 84, 84 | 1,21 s | 4,44, 4,55 s | 85, 86 | 1,21 s | 4,23, 4,30 s |

Proč simulovaný FCP vzrostl: prohlížeč najde písmo bez přednačtení až při rozvržení stránky a dá mu prioritu VeryHigh. Lighthouse takové písmo počítá do FCP a řadí ho za CSS. Skutečný FCP to nemění, protože písmo má `font-display: swap` a text se vykreslí hned náhradním písmem. Zvolená varianta má nejlepší LCP a skóre a před prvním vykreslením stahuje nejméně bajtů. Varianta s přednačtením Inter 600 vrací FCP na 1,21 s za cenu horšího LCP. Přepnutí je jeden řádek (`preload: false` v `layout.tsx`).

Surové výsledky: `~/.openclaw/workspace/output/robopipe-web/visibility/lighthouse-2026-11-12/local-30/` (`before-*`, `after-*`, `interVar-*`, `varB-*`). `noposter-before-*` je první měření mastera bez plakátu. `invalid/` je měření mastera, kde chyběly soubory médií. Nepoužívat.

Místní čísla nejsou produkční čísla. Server je na stejném stroji a hlavní video je jiné. Rozdíl před a po je ale měřený za stejných podmínek.

## Snímky

`screens/before-*.jpg` (master) a `screens/after-*.jpg` (větev): /cs a stránka řešení, telefon 390 px a počítač 1440 px, celá stránka. Video je na snímcích zastavené, takže je vidět plakát.

Porovnal jsem bezztrátové verze pixel po pixelu. Výška stránek je stejná: 14 431 px a 12 705 px na telefonu, 8 118 px a 7 978 px na počítači. Text, nadpisy, čísla v písmu Inter a rozvržení jsou na pixel stejné. Rozdíly jsou jen uvnitř fotografií, protože prohlížeč zmenšuje z jiné šířky souboru. Výřezy 1:1 jsou stejně ostré. Na počítači má každý obrázek soubor aspoň tak široký jako jeho box (e2e test „the poster stays sharp“).

## Testy

- Jednotkové a integrační (vitest): 296 prošlo, 0 selhalo (34 souborů). Nové: `tests/int/imageSizes.int.spec.ts`, `tests/int/heroVideoSource.int.spec.ts`, rozšířený `tests/int/consent.int.spec.ts` (skript až po nečinnosti, náhrada pro Safari, čekání na `load`, fronta zachová souhlas a události).
- e2e (Playwright, Chromium a WebKit iPhone 14): nový `tests/e2e/mobileSpeed.e2e.spec.ts` a rozšířený `tests/e2e/heroVideo.e2e.spec.ts`. Kontroluje:
  - plakát pod videem,
  - CLS 0,
  - malou kopii na telefonu a hlavní video na počítači,
  - `Save-Data` a `prefers-reduced-data`,
  - `sizes` a šířky souborů na telefonu,
  - ostrost na počítači,
  - 8 přednačtených písem a Inter 600,
  - skript Google až po `load`.

  Výsledek celé sady je v části „Výsledky testů“ na konci.
- `tsc --noEmit`, `eslint` a `next build` jsou čisté.

## Kroky po nasazení

Coolify při nasazení spustí `payload migrate`. Migrace jen přidá dva prázdné sloupce. Bez dalšího kroku se web chová jako dřív, jen s lehčími písmy, obrázky a plakátem.

### 1. Nahrát videa pro mobil

Videa jsou v `~/.openclaw/workspace/output/robopipe-web/visibility/lighthouse-2026-11-12/mobile-video/` (`hero-v3-cs-mobile.mp4`, `hero-v3-en-mobile.mp4`). Účet stačí s rolí editor. Heslo vezměte z Keychainu, ne z chatu.

1. Zkontrolujte v administraci, že úvodní stránka nemá neuložený koncept. Skript se při konceptu sám zastaví.
2. Spusťte zkoušku nanečisto:

   ```sh
   cd ~/Projects/robopipe-web
   V=~/.openclaw/workspace/output/robopipe-web/visibility/lighthouse-2026-11-12/mobile-video
   SITE=https://robopipe.io EMAIL=… PASSWORD="$(security find-generic-password -s <položka> -w)" DRY_RUN=1 \
     docs/specs/30-mobile-speed/upload-mobile-video.sh "$V/hero-v3-cs-mobile.mp4" "$V/hero-v3-en-mobile.mp4"
   ```

   Výpis ukáže hlavičku cs a en: `video` je `hero-v3-cs.mp4` a `hero-v3-en.mp4`, `mobileVideo` je `null`.
3. Spusťte stejný příkaz bez `DRY_RUN=1`.
4. Ve výpisu „After“ zkontrolujte `mobileVideo`: `hero-v3-cs-mobile.mp4` pro cs a `hero-v3-en-mobile.mp4` pro en.

Co skript dělá přes REST:

1. `POST /api/users/login`.
2. `GET /api/pages?where[slug][equals]=home` a kontrola `_status` posledního konceptu.
3. `POST /api/media?locale=cs` a `?locale=en` (soubor a lokalizovaný `alt`).
4. Pro cs a en zvlášť `GET` a `PATCH /api/pages/<id>?locale=<jazyk>&fallback-locale=none` s polem `layout`, kde se změní jen `mobileVideo` v bloku `hero`, a `_status: published`.

`fallback-locale=none` zabrání tomu, aby se české texty zapsaly do prázdných anglických polí. Místně jsem porovnal celou stránku před a po: změnilo se jen `mobileVideo` v daném jazyce.

Bez skriptu: Administrace → Pages → Home → blok Hero → pole „Mobile Video“ v jazyce cs a pak en → Publish.

### 2. Ověřit

1. `curl -s https://robopipe.io/cs | grep -o '<video[^>]*>'` vrátí značku s `preload="none"`, bez `src` a bez `poster`.
2. `curl -s https://robopipe.io/cs | grep -o 'rel="preload" href="/_next/static/media/' | wc -l` vrátí 8.
3. Na telefonu (nebo v Chrome DevTools, šířka 390 px) zkontrolujte v konzoli `document.querySelector('section video').currentSrc`. Má končit `hero-v3-cs-mobile.mp4`. Na /en `hero-v3-en-mobile.mp4`. Na počítači `hero-v3-cs.mp4`.
4. Změřte Lighthouse 12.8.2 mobil, 2 běhy na /cs a na /cs/kamerova-kontrola-kvality, a porovnejte s ranním měřením (75 až 79 a 80). Ověřte také v PageSpeed Insights (příčina 4, přesměrování 307).
5. V Tag Assistant nebo v GA4 DebugView ověřte, že události a souhlas dál chodí.

## Odchylky od zadání

- `initGoogleTag` se spouští hned jako dřív. Až po nečinnosti se vkládá jen skript `gtag.js`. Kdyby se odložila celá funkce, `window.gtag` by do té doby chyběl a `updateGoogleConsent` a `trackEvent` by volbu z lišty a události zahodily. Teď čekají ve frontě `dataLayer`.
- Inter má kromě `preload: false` jen řez 600. Bez toho simulace FCP zhoršila víc (viz tabulka variant).
- Plakát je `loading="eager"` bez vysoké priority. S `lazy` by na počítači, kde plakát může být prvek LCP, začal stahovat později.

## Známá omezení

- Simulovaný FCP je o 0,16 s (/cs) a 0,6 s (stránka řešení) horší než na masteru. Skóre a LCP jsou lepší. Důvod a varianta s přednačtením jsou výše.
- Malé video má 640 × 360. Box na telefonu je vysoký 280 px, takže na displeji s hustotou 2 až 3 je obraz trochu měkčí než u videa 1080p. Při vyšším cíli kvality je potřeba větší soubor nebo výřez.
- Zdroj videa se vybere jednou při spuštění. Otočení telefonu nebo změna šířky okna zdroj nezmění.
- `prefers-reduced-data` dnes podporuje jen málo prohlížečů. Ostatní ho ignorují a video spustí. `Save-Data` funguje v Chrome a Edge na Androidu.
- Událost odeslaná v prvních 0,5 až 2 s po `load` čeká ve frontě, než se skript načte. Když návštěvník stránku opustí dřív, událost se neodešle. Dříve bylo toto okno kratší.
- `minimumCacheTTL` 30 dnů: soubor nahraný znovu pod stejným názvem může až 30 dnů ukazovat starou zmenšenou verzi z mezipaměti serveru. Trvalý svazek pro `/app/.next/cache` v Coolify a delší `Cache-Control` v bucketu řeší někdo jiný.
- Plakát je teď obrázek s textem `alt` z knihovny médií (dříve atribut `poster` bez textu). Čtečka obrazovky ho přečte.
- Přesměrování 307 (příčina 4) a vlastní JavaScript (176 KiB) jsou mimo rozsah.

## Výsledky testů

Celá sada proti produkčnímu buildu větve na `localhost:3930` (`next start`, databáze `robopipe_30`):

| Sada | Prošlo | Selhalo |
|---|---|---|
| vitest (`pnpm test:int`) | 296 | 0 |
| Playwright (`pnpm test:e2e`, Chromium a WebKit iPhone 14) | 171 | 2 |
| `tsc --noEmit` | čisté | |
| `pnpm lint` | 0 chyb | 2 varování v nezměněných souborech (`postcss.config.mjs`, `admin.e2e.spec.ts`), stejně jako na masteru |
| `next build` | čistý | |
| migrace `20261112_084552_hero_mobile_video` | up, down a znovu up | |

Dvě e2e selhání vznikají i na masteru (`2dbbc9e`) se stejnou databází a produkčním buildem. Nesouvisí s touto změnou:

- `blogFeaturedCard`, dlouhé slovo v titulku na mobilu: fotka má 749,69 px na kartě 359 px. Sada jinak běží proti `pnpm dev` (`webServer` v `playwright.config.ts`). V produkčním buildu se test chová jinak. Stojí za samostatné ověření, jestli jde o chybu v produkci.
- `seo-stage2`, odkaz na článek `co-je-vizualni-system-…` vrací 404. Seed nechává tento článek jako koncept.

Při prvním běhu selhalo navíc 12 testů `serviceVideo` („nothing from YouTube or Google“). Příčina: pro měření jsem do místní databáze dal testovací ID Google. Seed je nemá. Po jejich odebrání všechny prošly.
