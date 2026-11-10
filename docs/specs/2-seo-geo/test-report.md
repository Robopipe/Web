# Testovací zpráva: SEO a GEO pro Česko (issue #2)

Testováno 10. 11. 2026 na commitu `6f711ec` větve `feat/seo-geo-use-cases`. Tester: Arthur (role tester).

Novější lokální commity vývojáře (`e415c30`, `40d60f7`, k času testu nepushnuté) zpráva nepokrývá. Commit `40d60f7` podle popisu řeší chybu T2. Ověřil jsem jen to, že v textech už nejsou značky `[ověřit]`.

## Verdikt

Kód splňuje akceptační kritéria. Build, lint, typecheck a integrační testy prošly. E2e testy prošly, jen admin test je při zátěži nestabilní (T11).

Před sloučením doporučuji opravit T1 (slovenský prohlížeč skončí na `/en`). Před publikací obsahu musí Filip vyřešit T2 a obsahové body v kapitole 5. Ostatní chyby mají nízkou závažnost.

## 1. Prostředí

| Položka | Hodnota |
|---|---|
| Pracovní kopie | `~/Projects/robopipe-web-seo-test` (větev), `~/Projects/robopipe-web-master-test` (`origin/master`, `215363b`) |
| Databáze | Kontejner `robopipe-qa-pg`, port 55436. `qa_master`: seed z `master`, pak migrace větve a `seed:seo-geo`. `qa_branch`: čistá migrace, `SKIP_SEO_GEO=1` seed, pak `seed:seo-geo`. `qa_int`: kopie `qa_branch` pro integrační testy. |
| Server | `next start` na portu 3320, build proti `qa_master` |
| Prohlížeč | Chromium 1248 přes `PLAYWRIGHT_CHROMIUM_PATH` |
| Produkce | Jen čtení (`curl` na veřejné stránky a veřejné API) |

Server běžel nad `qa_master`. Úvodní stránka proto ukazuje starý claim ze seedu `master`. Produkce už má nový claim, skript ho podle rozhodnutí F nemění. Viz kritérium 10.

## 2. Akceptační kritéria a rozhodnutí Filipa

| # | Kritérium | Výsledek | Důkaz |
|---|---|---|---|
| 1 | Nové stránky (4 vstupní, auto anotace, 4 případy užití, cs i en) vrací 200 | Prošlo | 18 URL, všechny 200 (`/tmp/qa/check-local.txt`) |
| 2 | Nové stránky jsou v `sitemap.xml` s hreflang cs, en, x-default | Prošlo | 40 záznamů v sitemap, všechny mají cs, en a x-default |
| 3 | Vlastní titulek, meta popis, jeden canonical na sebe, `og:url` = canonical | Prošlo | Kontrola všech 40 URL ze sitemap. Popisy detailů studií jsou dlouhé (T10). |
| 4 | JSON-LD je platný a má povinná pole | Prošlo | Každý blok `ld+json` na 40 URL rozparsován. Kontrola povinných polí: Organization, WebSite, Product (+ Offer), BlogPosting, FAQPage (+ Question, Answer), BreadcrumbList (+ ListItem). 0 chyb. Externí validátor jsem nepoužil, HTML neodešlo mimo stroj. |
| 5 | FAQPage jen s otázkami viditelnými na stránce | Prošlo | Každá otázka z FAQPage je ve viditelném textu stránky. Bez FAQ blok FAQPage chybí. |
| 6 | Product má `offers` z ceníku v Payload, žádné ceny v kódu | Prošlo | `/cs`: 9900 a 14900 CZK, `/en`: 390 a 590 EUR, z bloku `pricingTable`. `grep` na částky v `src` najde jen seed, admin nápovědu a testy. Riziko při jiném formátu ceny viz T3. |
| 7 | `/llms.txt` 200, odkazy vrací 200 | Prošlo | `text/plain; charset=utf-8`, 36 odkazů, všechny 200 |
| 8 | Kořen bez cookie: `cs` → `/cs`, `sk` → `/cs`, bez hlavičky → `/en` | Prošlo s výhradou | Tyto tři případy fungují. Typická hlavička slovenského prohlížeče vede na `/en` (T1). |
| 9 | Uložená cookie vyhrává, cookie se nevypíná | Prošlo | `cs` + `NEXT_LOCALE=en` → `/en`, bez hlavičky + `NEXT_LOCALE=cs` → `/cs`, neplatná cookie se ignoruje, query string zůstává, `/en` cookie nenastaví |
| 10 | Nový claim v seedu, starý nikde | Prošlo | `src/seed/index.ts` má nový claim v `h1`, `title`, `seo.title` a `defaultSeo.title`. Starý claim je jen v komentářích `csCopyFixes.ts`. Čerstvý seed větve ho nevrátí. Databáze ze seedu `master` ho má dál, protože skript claim nemění. Produkce má nový claim (ověřeno). |
| 11 | `/cs/case-studies` a `/en/case-studies` nevrací 404 | Prošlo | Obě 200, karty vedou na 4 detaily |
| 12 | Cesty s tečkou vrací 404, ne 500 | Prošlo s výhradou | `/foo.txt`, `/ads.txt`, `/cs/foo.txt`, `/cs/blog/foo.txt` vrací 404. `/foo.txt/bar` a `/foo.txt/case-studies/x` vrací 500 (T4). |
| 13 | `og:image` je platná absolutní URL na úvodu, blogu, článku, případu užití | Prošlo | Všech 40 URL má `og:image` s jedním `http`. Lokální média mají relativní URL. Absolutní URL z úložiště GCS pokrývá unit test `meta.int.spec.ts`. |
| 14 | hreflang na detailu článku blogu | Prošlo | 8 článků, každý cs, en, x-default v HTML i v sitemap |
| 15 | Přesměrování ze starého obchodu nemíří na 404 | Prošlo | `Host: shop.robopipe.io`: `/products/machine-vision-controller` a `/collections/all` → `/en/case-studies/ai-product-tagging` (lokálně 200). Dnešní cíl v produkci vrací 404. |
| 16 | Logo platformy na úvodu a v patičce, cs i en, odkaz na innovationczechia.cz | Prošlo | `/cs` a `/en`: 1 odkaz v `main`, 1 ve `footer`. Patička je i na ostatních stránkách. Obrázky se načtou (320 i 390 px). Anglický web má český `alt` (T12). |
| 17 | Auto anotace jako funkce Robopipe Studia (proprietární), fakta proti `release` | Prošlo s výhradou | 10 tvrzení ověřeno proti `origin/release` (`836035d`, 30. 10. 2026). 8 sedí, 1 částečně (T9). Tvrzení „open-source verze ji neobsahuje“ z kódu ověřit nejde: repozitář nemá příznak edice a README ho nazývá open source. Platí rozhodnutí C. |
| 18 | Žádná nová jména zákazníků ani čísla proti produkci | Prošlo | Všechna čísla a jména z `seed-assets/copy/seo-geo` jsou v textu 36 produkčních stránek nebo v API studií (Crocodille, Wolfberry, MG Servis, 95 %, 99,5 %, 3 600, 19, 5, 12 MP, třetina zmetků z blogu). Obsahové rozpory s produkcí viz kapitola 5. |
| 19 | Seed skript: idempotence | Prošlo | Na `qa_master`: koncept 41 vytvořených a 5 změněných, publikace 13 změněných, další běh publikace i konceptu `created (0)`, `updated (0)`. Výpis `--dry-run` je nepřesný (T7). |
| 20 | Seed skript odmítne vzdálenou databázi bez `--production` | Prošlo s výhradou | `db.example.com`, `10.0.0.5`, socket bez hostitele: odmítnuto. URL `localhost` s `?host=db.example.com` projde a připojí se jinam (T6). |
| 21 | Seed skript nepřepíše vyplněné pole | Prošlo | Ručně změněný `seo.description` vstupní stránky a `technique` studie zůstaly po dvou bězích. Prázdné `technique` skript znovu doplnil. |
| 22 | Migrace na databázi se strukturou `master` | Prošlo | `master` seed, pak `payload migrate` větve: `20261110_180954_seo_geo` za 1,4 s. `migrate:create --skip-empty` nenašel rozdíl schématu. Čistá databáze: všechny 4 migrace prošly. |
| 23 | Lighthouse SEO ≥ 95 | Prošlo | SEO 100 na `/cs`, `/cs/kamerova-kontrola-kvality`, `/en/camera-quality-inspection` (mobil). Přístupnost 95, 98, 98. |
| 24 | Mobil 390 a 320 px bez rozbitého layoutu | Prošlo s výhradou | 40 URL na 390 i 320 px bez vodorovného posouvání. Na 320 px tlačítko „Domluvit demo“ zakrývá logo v hlavičce (T5, stejné v produkci). Extrémně dlouhé slovo v názvu studie rozbije výpis (T8). |
| 25 | Koncept článku o auto anotaci se nepublikuje | Prošlo | `automaticka-anotace-dat` má stav `draft`, URL vrací 404, v sitemap ani v API není |

## 3. Testy, lint, typecheck, build

| Kontrola | Větev `6f711ec` | `master` `215363b` |
|---|---|---|
| Integrační testy (`pnpm test:int`) | 33/33 prošlo | nespuštěno |
| E2e (`pnpm test:e2e`), 1. běh | 42/43. Selhal mobilní test na `/cs/case-studies`, příčina byla moje testovací studie s dlouhým slovem (T8). | nespuštěno |
| E2e, 2. běh po smazání testovacích dat | 39 prošlo, 2 selhaly na časový limit (admin `beforeAll`, `/en/machine-vision`), 2 nespuštěny | |
| E2e, 3. běh (`seo` + `admin`) | `seo.e2e.spec.ts` vše prošlo, admin selhal na `beforeAll` | |
| E2e, admin samostatně | 3/3 prošlo | |
| Lint | 0 chyb, 2 varování | 0 chyb, 4 varování |
| Typecheck (`tsc --noEmit`) | 0 chyb | 0 chyb |
| Build | Prošel | nespuštěno |

Nové testy z této zprávy (kapitola 6) dnes selhávají záměrně: integrační 4 z 5, e2e 2 ze 2.

## 4. Chyby

Závažnost: **vysoká** blokuje publikaci nebo poškodí data, **střední** porušuje zadání v běžném provozu, **nízká** okrajový případ nebo kosmetika.

### T1 Slovenský prohlížeč skončí na `/en` (střední)

Zadání říká: slovenština na `/cs`. Chrome ve slovenštině posílá region a angličtinu jako zálohu.

1. Spusť `curl -sI -H 'Accept-Language: sk-SK,sk;q=0.9,en-US;q=0.8,en;q=0.7' http://localhost:3320/`.
2. Očekávané: `location: /cs`. Skutečné: `/en`.

Stejně dopadne `sk-SK,en;q=0.5`. Holé `sk`, `sk-SK` a `cs-CZ,cs;q=0.9,en;q=0.8` vedou správně na `/cs`. Příčina: next-intl najde `en` přesně a dá mu přednost před přibližnou shodou `sk` → `cs`. Produkce se chová stejně, není to regrese. Stávající e2e test zkouší jen holé `sk`. Test: `tests/e2e/testerFindings.e2e.spec.ts`.

### T2 Značky `[ověřit]` jdou při publikaci na veřejnou stránku (vysoká pro publikaci)

`--status=published` publikuje texty bez kontroly. Na `6f711ec` je značka `[ověřit]` na 6 místech: `landing-auto-annotation.cs.md:24`, `landing-auto-annotation.md:24`, `post-auto-annotation.cs.md:36`, `post-auto-annotation.md:36`, `faqs.json:235` (`aa-data` cs), `faqs.json:239` (`aa-data` en). Na stránce `/cs/automaticka-anotace` je značka vidět (screenshot `320_cs_automaticka-anotace.png`). Je i v JSON-LD `FAQPage`. Anglický text má českou značku.

Lokální commit `40d60f7` značky odstranil. Test `tests/int/testerFindings.int.spec.ts` hlídá, aby se nevrátily.

### T3 `parsePrice` špatně čte oddělovač tisíců (nízká, dnes se neprojeví)

1. `parsePrice('€1,290')` vrátí `1.29 EUR`. Očekávané `1290`.
2. `parsePrice('9.900 Kč')` vrátí `9.9 CZK`. Očekávané `9900`.

Dnešní ceník (`9 900 Kč`, `€390`) funguje. Když editor napíše cenu s čárkou nebo tečkou jako oddělovačem tisíců, Google dostane chybnou cenu. Test: `tests/int/testerFindings.int.spec.ts`.

### T4 Vnořená cesta pod segmentem s tečkou vrací 500 (nízká)

1. Spusť `curl -s -o /dev/null -w '%{http_code}' http://localhost:3320/foo.txt/bar`.
2. Očekávané: 404. Skutečné: 500.

Stejně `/foo.txt/case-studies/x` a `/foo.txt/blog/x`. Log serveru: `invalid input value for enum _locales: "foo.txt"`. Kontrola jazyka je jen v `[locale]/page.tsx`, vnořené routy volají Payload s neplatným jazykem. Produkce vrací 500 také. Test: `tests/e2e/testerFindings.e2e.spec.ts`.

### T5 Na 320 px tlačítko „Domluvit demo“ zakrývá logo (nízká)

Logo končí na 140 px, tlačítko začíná na 100 px. Text loga „robopipe by KOALA42“ je useknutý. Produkce má stejné rozměry, není to regrese. Screenshoty `header-320-local.png` a `header-320-prod.png`.

### T6 Pojistka databáze propustí `?host=` v URL (nízká)

1. Spusť `DATABASE_URL='postgres://u:p@localhost:5432/x?host=db.example.com' pnpm seed:seo-geo --dry-run`.
2. Očekávané: odmítnutí. Skutečné: skript se pokusí připojit k `db.example.com` (`ENOTFOUND`).

`isLocalDatabaseUrl` čte jen hostitele z URL. Ovladač Postgres bere přednostně `host` z parametrů. Omylem tuto URL nikdo nenapíše. Test: `tests/int/testerFindings.int.spec.ts`.

### T7 Výpis `--dry-run` uvádí víc položek, než skript vytvoří (nízká)

`--dry-run` na čerstvé databázi vypsal `created (68)` s duplicitami (`faq cqi-offline` a `faq cqi-sanitation` dvakrát). Skutečný běh vytvořil 41 položek. Sdílené FAQ se v plánu počítají u každé stránky. Postup v produkci (implementace, kapitola 6, krok 4) říká „zkontroluj seznam“. Seznam proto mate.

### T8 Velmi dlouhé slovo v názvu studie rozbije výpis na mobilu (nízká)

1. V administraci vytvoř studii s názvem, který má slovo delší než asi 40 znaků (například URL).
2. Otevři `/cs/case-studies` na 375 px.
3. Skutečné: mřížka se roztáhne a všechny karty kromě první přetečou (e2e naměřil `scrollWidth` 1039). Detail má `scrollWidth` 2244.

Běžné texty to nemají. Screenshot `390_cs_case-studies_qa-test-studie.png`.

### T9 Text o poznámkách projektu neodpovídá kódu Studia (nízká)

Text: „Robopipe Vision ji navrhne uložit jako poznámku projektu. Poznámku uložíte nebo vyřadíte.“ Kód `release`: když model vyhodnotí zpětnou vazbu jako opakovaně použitelnou, poznámka se uloží sama a uživatel ji může jen vyřadit (`vision-preannotate.service.ts:583`, `save_as_project_note`). Text „Poznámky můžete psát i sami“: přidávání a výpis poznámek má jen admin (`endpoints.ts:118-120`). Soubory: `landing-auto-annotation*.md`, `post-auto-annotation*.md`.

### T10 Meta popis detailu studie má 226 až 339 znaků (nízká)

Detail bere popis z `excerpt`, protože `seo.description` studie je prázdné. Google zobrazí asi 155 znaků. Týká se 8 detailů. Produkční perexy jsou stejně dlouhé.

### T11 Admin e2e test je při zátěži nestabilní (nízká)

V celé sadě selhal 2krát ze 3 na `beforeAll hook timeout of 30000ms`. Samostatně prošel 3/3. `beforeAll` volá `getPayload` a v režimu vývoje stahuje schéma z databáze („Pulling schema from database“). Na vytíženém stroji to trvá přes 30 s. Vitest má `hookTimeout` 60 s, Playwright ne.

### T12 Anglický web má český `alt` a `aria-label` loga platformy (nízká)

`/en`: `alt="Česká inovační platforma"`. Členství nejsou lokalizovaná (známé omezení 3 v implementaci).

## 5. Obsah k rozhodnutí Filipa

Nejsou to chyby kódu. Texty schvaluje Filip.

1. **Data opouštějí závod.** Text auto anotace říká, že snímky jdou do cloudu. Produkční blog říká „nic neopouští závod, pokud sami nechcete“ a „bez toho, aby snímky z výroby opouštěly závod“. Kód: výchozí je Gemini ve Vertex AI s umístěním `global` (ne EU), alternativa OpenAI. Commit `40d60f7` větu nahradil nabídkou offline modelu. Tu jsem neověřoval.
2. **Dostupnost auto anotace.** Text na `6f711ec` říká „mají všichni zákazníci“. Produkční ceník ji uvádí jen u Pro a Enterprise. Kód Studia tarify nehlídá. Commit `40d60f7` text změnil na Pro a Enterprise.
3. **ERP přes EtherCAT.** `faqs.json` (`mv-erp`): „propojíme s vaším ERP i MES přes Modbus, EtherCAT nebo Ethernet“. EtherCAT je sběrnice pro stroje, ne pro ERP. Produkce uvádí jen „Napojení na ERP a MES“.
4. **„Segmentace bude brzy k dispozici.“** Kód to potvrzuje (`cs:431` ve Studiu), ale je to slib termínu na veřejném webu.
5. **„Bez programování“** (`mv-vs-classic`, popis stránky AI kontrola kvality). Produkce to říká jen o konkurenci.
6. **Instalace a servis pro všechny.** `mv-integrator` a stránka Strojové vidění slibují montáž a servis bez výjimky. Ceník je uvádí od tarifu Pro.
7. **Opakování textu.** U Wolfberry sekce Problém a Řešení skoro doslova opakují perex.

### Jazyková kontrola českých textů

Pomlčky jako interpunkce v nových textech nejsou. Výběr nálezů:

- Gramatika: „Odolné pro průmyslový provoz“ → „Odolná“ (`landing-machine-vision.cs.md:22`). „Týmu jsme ukázali… Každý další si přidali sami.“ chybí podmět (`landing-ai-quality-inspection.cs.md:24`). „Robopipe je i jako open source“ chybí sloveso (`landing-computer-vision.cs.md:24`). „0 / datových vědců potřeba“ (`landing-pages.json`, statistiky). „19 různých kontrol, s přesností“ zbytečná čárka (`faqs.json`, `cs-crocodille-checks`).
- Věcně: „mráz v chladírně“ (chladírna nemrzne) v `landing-machine-vision.cs.md:24`, `landing-camera-quality-inspection.cs.md:9`, `faqs.json` (`cqi-sanitation`).
- Anglicismy: datasety, pipeline, monitoring, retail, tagování, open-source verze. Návrhy: datové sady, postup, nepřetržitý dohled, maloobchod, označování, verze s otevřeným kódem.
- Kalky: „nestojí žádná černá skříňka“, „tuto práci obrací“, „pravidlové strojové vidění“, „Datové vědce k tomu nepotřebujete“, „Jde anotovat víc snímků najednou?“.
- Jedna věc, dvě jména: „aplikace Robopipe Studio“ a „aplikace Studio“. „Vyhodnocovací jednotka“ a „řídicí jednotka AI PLC“. „Automatická anotace“ a v ceníku „Automatické AI anotování obrázků“. „50 ms“ a „50 milisekund“.
- „Vy je jen schválíte“ v nadpisu odporuje krokům „zkontrolujete, opravíte“.

### Seznam `[ověřit]` na commitu `6f711ec`

1. `landing-auto-annotation.cs.md:24`: „Snímky se proto ke zpracování posílají poskytovateli modelu. [ověřit]“
2. `landing-auto-annotation.md:24`: „Images are therefore sent to the model provider for processing. [ověřit]“
3. `post-auto-annotation.cs.md:36`: stejná věta jako 1
4. `post-auto-annotation.md:36`: stejná věta jako 2
5. `faqs.json:235` (`aa-data`, cs): „Robopipe Vision běží v cloudu, takže se snímky ke zpracování posílají poskytovateli modelu. [ověřit]“
6. `faqs.json:239` (`aa-data`, en): „Robopipe Vision runs in the cloud, so images are sent to the model provider for processing. [ověřit]“

V lokálním commitu `40d60f7` značky nejsou.

## 6. Přidané testy

| Soubor | Test | Chyba |
|---|---|---|
| `tests/e2e/testerFindings.e2e.spec.ts` | slovenský prohlížeč s angličtinou jako zálohou → `/cs` | T1 |
| `tests/e2e/testerFindings.e2e.spec.ts` | `/foo.txt/bar`, `/foo.txt/case-studies/x`, `/foo.txt/blog/x` → 404 | T4 |
| `tests/int/testerFindings.int.spec.ts` | `parsePrice` s oddělovačem tisíců | T3 |
| `tests/int/testerFindings.int.spec.ts` | pojistka databáze s `?host=` | T6 |
| `tests/int/testerFindings.int.spec.ts` | texty bez `[ověřit]` | T2 |

## 7. Okrajové případy, které prošly

- Neexistující slug studie (`/cs/case-studies/neexistuje`, `%3Cscript%3E`, `foo.txt`) vrací 404.
- Anglický slug pod `/cs` (`/cs/case-studies/ai-product-tagging`) vrací 404.
- Studie jen v češtině: detail 200, `/en/...` 404, hreflang jen `cs`, bez `x-default`. V sitemap jen `cs`. V `llms.txt` je.
- Studie bez FAQ a bez sekcí: nadpisy sekcí ani „Časté otázky“ se nevykreslí, `FAQPage` chybí.
- Uvozovky, `</script>`, `<!--`, zpětné lomítko a diakritika v názvu studie, zákazníkovi a FAQ: JSON-LD se rozparsuje, `<` je escapované jako `<`, žádný neescapovaný `<script>` v HTML.
- Úpravy v administraci se projeví hned (revalidace přes hooky).

## 8. Screenshoty a zprávy

Složka `/Users/m1/.openclaw/workspace/output/robopipe-web/seo-test/`:

- `320_*.png`, `390_*.png`: celé stránky na mobilu (úvod cs a en, vstupní stránka, auto anotace, výpis a detail studie)
- `sheets/*.png`: tytéž stránky rozdělené do sloupců pro rychlou kontrolu
- `header-320-local.png`, `header-320-prod.png`: T5
- `390_cs_case-studies_qa-test-studie.png`: T8
- `lh-*.json`: zprávy Lighthouse
