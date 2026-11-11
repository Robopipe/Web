# Zpráva testera: SEO a GEO etapa 2 (issue #6, PR #7)

Tester: Arthur (subagent), 10. a 11. 11. 2026. Větev `feat/seo-geo-stage2`, commit `706de90`.

## Verdikt

**Neprošlo.** Všech 10 akceptačních kritérií je splněno. Testy, lint, kontrola typů a build prošly. Skript obsahu ale má jednu chybu s vysokou závažností (T1). Překlep v přepínači `--dry-run` spustí skutečný zápis. Před zápisem do produkce opravte T1. Doporučuji opravit také T2 až T4.

Kontrola přepisu ručních změn v produkci: seed nevrátí žádnou ruční změnu. Podrobnosti jsou v kapitole 5.

## 1. Prostředí

- Vlastní Postgres 17 v kontejneru `robopipe-tester-pg`, port 55470. Databáze jsem po testu smazal.
- Server `next start` na portu 3342 (větev), 3343 (`master`). Server `next dev` na portu 3341 pro režim REST.
- Chromium: `chromium_headless_shell-1248`. Instalace `chromium-1208` je poškozená (chybí framework), proto `PLAYWRIGHT_CHROMIUM_PATH`.
- Databáze:
  - `fresh`: migrace a `pnpm seed` z větve, pak `seed:seo-geo --status=published`. Stejný postup jako vývojář.
  - `local_run`, `remote_run`: `pnpm seed` z `master`, migrace z větve (pořadí 11.3).
  - `prodlike`: `SKIP_SEO_GEO=1 pnpm seed` z `master`, migrace z větve. Je nejblíž produkci: obsah etapy 1 tam neběžel.
- Do `fresh` jsem naimportoval průvodce a článek o trendech z produkčního API (jen čtení), stejně jako vývojář.

## 2. Akceptační kritéria

| AC | Výsledek | Jak ověřeno |
|---|---|---|
| 1. 5 stránek 200 v cs a en, sitemap s hreflang, `llms.txt` | prošlo | e2e, vlastní crawl 48 URL ze sitemap. Všechny nové URL mají `cs`, `en`, `x-default`. |
| 2. Titulek do 60, popis do 160, canonical, og:image 200, platné JSON-LD | prošlo | e2e, crawl 14 nových URL. Titulky 36 až 59 znaků, popisy 130 až 154. |
| 3. Hlavní slovo v titulku, H1 a prvním odstavci | prošlo | e2e, kontrola H1 v crawlu |
| 4. Reference nebo otevřená věta | prošlo | e2e. Etikety: „Veřejnou referenci na kontrolu etiket zatím nemáme.“ |
| 5. „O nás“ 200, jeden `Organization` | prošlo | crawl: `Organization` přesně jednou na všech 48 URL, `legalName` „robopipe s.r.o.“, `identifier` IČO. |
| 6. Značky Bing a Seznam jen s hodnotou | prošlo | int a e2e. Bez hodnoty není značka v HTML. |
| 7. Ceny shodné s ceníkem | prošlo | e2e. `Product.offers` na `/cs` a `/en` = ceník (9 900 a 14 900 Kč, 390 a 590 EUR). |
| 8. Žádné `[ověřit]` ani `[doplnit Filip]` v publikovaném stavu | prošlo | e2e, int, `grep` v `seed-assets/copy/seo-geo` bez nálezu. |
| 9. Mobil bez vodorovného posouvání | prošlo | e2e (320 a 390 px). Vlastní kontrola 375 px na 19 URL: `scrollWidth` = 375. |
| 10. Testy, lint, typy, build, Lighthouse SEO aspoň 95 | prošlo | Kapitola 3. Lighthouse SEO 100 na `/cs/kamerova-kontrola-kvality`, `/cs/kontrola-etiket`, `/en/label-inspection`, `/cs/o-nas`. |

Doplnění 2 (`addendum-remote-seed.md`):

| Bod | Výsledek |
|---|---|
| Etikety: čtení data spotřeby v textu, FAQ a variantách, bez čísel | prošlo. Text stránky cs i en neobsahuje čísla přesnosti. Obrázek v úvodu ano, viz T6. |
| `robopipe s.r.o.` s malým r v `company.legalName`, patičce, `Organization.legalName`, `llms.txt` | prošlo. Adresa ale dál začíná „Robopipe s.r.o.“, viz T7. |
| O nás: Filip produkt a technika, Jan Jelínek obchod, spin-off KOALA42, „v roce 2024“, tým 5 | prošlo, cs i en |
| Bez jmenovaného poskytovatele modelu, auto anotace jen Pro a Enterprise | prošlo. Všechny zmínky tarifů v textech uvádějí Pro a Enterprise. |
| Čísla v nových textech | Každé číslo v nových textech je i na produkčním webu. Výjimka: „Od vydání 30. 10. 2026“ v článku o anotaci (zůstává koncept). |

## 3. Testy (vlastní běh)

| Kontrola | Výsledek |
|---|---|
| `pnpm test:int` na `fresh` | 93/93 prošlo, 18 souborů |
| `pnpm test:int` na `local_run` (pořadí 11.3) | 92 prošlo, 1 selhal, viz T5 |
| `pnpm test:e2e` větev | 67 prošlo, 1 selhal: `Blog featured card › keeps the photo inside the card on mobile with a long unbroken title` (L1) |
| `pnpm test:e2e` `master` (`3cf0640`) | 49 prošlo, 1 selhal: stejný test L1 |
| `pnpm lint` | 0 chyb, 2 stávající varování |
| `tsc --noEmit` | 0 chyb |
| `pnpm build` | prošlo |

Chyba L1 existuje i na `master`. Na větvi není jiné selhání. Údaje vývojáře (93/93, 67 a 1) jsou správné.

Poznámka k e2e: testy čtou `NEXT_PUBLIC_SERVER_URL` z `.env`. Když server běží na jiném portu, selže 34 testů na canonical. Nastavte proměnnou na adresu serveru.

## 4. Režim REST

| Scénář | Výsledek |
|---|---|
| REST jako editor proti `local_run` se stejnou sekvencí (koncept, koncept, publikace, publikace) | Shodné s lokálním během. Porovnání 112 tabulek po převodu id na obsah: liší se jen náhodná `id` uzlů odkazů v rich textu. Poslední verze a jejich stavy jsou shodné. |
| Druhý běh | `created (0)`, `updated (0)` lokálně i přes REST |
| Jeden běh `--status=published` přes REST na `prodlike` | Zapíše `site-settings solutions` v jednom běhu: 6 stránek v pořadí ze `settings.json`. |
| Ruční změna úvodní stránky (hero cs a en, `seo.title`) před během | Zůstala beze změny v obou jazycích. |
| Špatné heslo | Kód 1, `POST /api/users/login → 401: The email or password provided is incorrect.` |
| Chybí `SEED_REMOTE_PASSWORD` | Kód 1, jasná zpráva |
| Odpověď 403 (proxy na `POST /api/globals/site-settings`) | Kód 1, `POST /api/globals/site-settings → 403: You are not allowed to perform this action.` |
| Nedostupný server, adresa bez `http://`, výpadek uprostřed běhu | Kód 1, ale zpráva jen `fetch failed`, viz T3 |
| Výpadek mezi vytvořením stránky a uložením angličtiny | Opakovaný běh stránku neopraví, viz T2 |
| Překlep `--dryrun` | Skutečný zápis, viz T1 |
| Heslo ve výstupu | `grep` na heslo ve všech logech skriptu, proxy a serveru: bez nálezu |

## 5. Produkce: dry run a přepis ručních změn

Příkaz: `--remote=https://robopipe.io --dry-run --status=published` (11. 11. 2026). Plán: vytvořit 52, změnit 11, přeskočit 1 (`site-settings solutions`). Shodné s vývojářem. Žádná chyba práv. Výstup: `/tmp/t-prod-dry.log`.

Porovnal jsem každou změnu s produkčními daty (REST, jen GET):

| Dokument | Co seed změní | Současný stav v produkci | Vrátí ruční změnu? |
|---|---|---|---|
| Úvod (pages 5) | Přidá 3 bloky. Změní `seo.description` cs a en. | Ruční změna z 10. 11. 18:07 změnila jen hero nadpis, `title` a `seo.title`. `seo.description` je ze 5. 10. a rovná se `replaceIf`. | Ne. Hero, `title` a `seo.title` seed nemění (ověřeno simulací). |
| Případové studie 1 až 4 | Doplní prázdné sekce a FAQ | Sekce `problem`, `solution`, `result`, `technique` a FAQ jsou prázdné. | Ne |
| Ceník (pages 2) | Přidá 3 FAQ do bloku FAQ | Publikováno 5. 10., 5 FAQ | Ne |
| Průvodce (posts 10) | H2, odstavec, `seo.title` | Hodnoty se rovnají `replaceIf`, poslední úprava 10. 9. | Ne |
| Header | Přejmenuje „Případové studie“ na „Případy užití“ | Poslední úprava 31. 7. | Ne, plánovaná změna |
| Footer | Přejmenuje odkaz, přidá „O nás“ | Poslední úprava 4. 8. Sloupec „Řešení“ v produkci není. | Ne |
| `site-settings` | Členství, firma, řešení | `memberships` je prázdné. `company` a `solutions` produkce zatím nemá (schéma etapy 2 není nasazené). | Ne |
| Článek Manufacturing Forum (posts 15) | Nic | Publikováno 10. 11. 18:05 | Ne. Seed ho nečte ani nemění. |
| Redirect `/en/ai-product-tagging` | Nic | Jediný redirect (id 1) | Ne. Žádná nová stránka nemá slug `ai-product-tagging`. |

Žádný rozdíl nevrací ruční změnu. Rizika pro produkční běh:

- Krok publikace publikuje poslední koncept každého spravovaného dokumentu. Dnes jsou všechny spravované dokumenty publikované. Když někdo před během uloží koncept úvodu, ceníku nebo studie, seed ho publikuje.
- Plán dry run neukazuje publikaci ani `site-settings solutions`. Viz T4.
- Dry run teď běží proti schématu etapy 1. Plán pro `company` a `solutions` zopakujte po nasazení etapy 2.

## 6. Regrese etapy 1

| Kontrola | Výsledek |
|---|---|
| Úvodní stránka cs, en | 200, jeden `Organization`, `Product.offers` z ceníku, og:image 200 |
| Ceník cs, en | 200, JSON-LD `FAQPage`, og:image 200, tabulka v kontejneru s posuvníkem na 375 px |
| Detaily 4 případových studií cs a en | 200, `BreadcrumbList`, `FAQPage`, og:image 200 |
| Vnitřní odkazy (52 cílů na 48 URL) | Žádná 404 kromě přepínače jazyka, viz T8 |
| Odkazy v textech etapy 2 na existující obsah | Všech 26 odkazů vrací v produkci 200 (bez nových stránek) |

## 7. Chyby

### T1, vysoká: neznámý přepínač skript tiše ignoruje a zapisuje naostro

`src/seed/applySeoGeo.ts:22-28` hledá jen `--dry-run`, `--status=` a `--remote=`. Ostatní argumenty ignoruje. Překlep `--dryrun`, `--dry_run` nebo `--status published` (mezera) proto spustí skutečný zápis. Proti produkci to znamená vytvoření a publikaci 52 dokumentů. Vývojář stejnou chybu jednou udělal (`implementation.md`, kapitola 6).

Kroky:

1. Spusťte `pnpm seed:seo-geo --remote=http://localhost:<port> --status=published --dryrun`.
2. Výstup ukáže `created (46)` a `updated (24)`. Databáze obsahuje nové stránky.

Očekávání: neznámý argument zastaví běh s chybou a nenulovým kódem.

### T2, střední: přerušený běh nechá stránku bez angličtiny a opakovaný běh to neopraví

Skript vytvoří stránku v češtině a angličtinu uloží druhým požadavkem (`seoGeo.ts:510-522`). Když spojení spadne mezi nimi, stránka existuje bez anglického titulku, slugu a bloků. Další běh stránku najde, porovná jen české bloky a hlásí „nic ke změně“. Publikace pak stránku publikuje. Stejné riziko má článek (`seoGeo.ts:683-694`).

Kroky:

1. Spusťte běh přes proxy, která po prvním `POST /api/pages` zahodí `PATCH /api/pages/<id>?locale=en` a další požadavky.
2. Skript skončí kódem 1.
3. Spusťte běh znovu bez proxy s `--status=published`, potom ještě jednou.
4. Druhý běh hlásí `created (0)`, `updated (0)`. Stránka 6 má jen řádek `cs`. `/en/camera-quality-inspection` vrací 404 a stránka chybí v anglické navigaci a v sitemap pro `en`.

### T3, střední: chyba sítě ukáže jen `fetch failed`

Nedostupný server, adresa bez schématu (`--remote=localhost:3341`) a výpadek uprostřed běhu skončí kódem 1, ale zpráva je jen `fetch failed`. Chybí metoda, cesta, adresa a příčina (`ECONNREFUSED`, `ENOTFOUND`). `send` v `remoteClient.ts` zachytí jen chybové stavy HTTP. Klient také nemá časový limit požadavku.

### T4, střední: plán dry run neukazuje publikaci

V dry run skript nic neuloží. Nové stránky proto nejsou mezi spravovanými dokumenty a existující dokumenty mají dál publikovanou poslední verzi. Plán tak neuvádí řádky `… published` ani `site-settings solutions`. Na `prodlike` hlásil dry run `updated (10)`, skutečný běh `updated (24)`. Plán pro produkci „52 a 11“ neříká, že běh publikuje 7 stránek, 4 studie, úvod, ceník a průvodce.

### T5, nízká: integrační test závisí na stavu databáze

Test `applySeoGeo, stage 2 › reports a removed stage 1 page as obsolete and does not delete it` (`tests/int/seoGeoStage2.int.spec.ts:363`) vytváří stránku `strojove-videni`. Na databázi v pořadí 11.3 už stránka existuje a test selže na `ValidationError: slug`. Na databázi podle kapitoly 4 implementace test projde.

### T6, střední: obrázek stránky „Kontrola etiket“ ukazuje jinou úlohu a procenta

Hero stránky `/cs/kontrola-etiket` a `/en/label-inspection` používá `product-classification-screen.jpeg`. Snímek ukazuje klasifikaci dílu Siemens SIMATIC s hodnotami „Celkem 85 %“ a „Výrobce 99 %“. Nejde o kontrolu etiket. Filip pro tuto stránku nechtěl uvádět přesnost ani čísla.

### T7, nízká: název firmy s velkým R v adrese

`site-settings.contact.address` začíná „Robopipe s.r.o.“ (produkce i lokální seed). Adresa se vykreslí v `Organization.address`, v patičce a v panelu kontaktu vedle `legalName` „robopipe s.r.o.“. Popis stránky ochrany osobních údajů v `llms.txt` také uvádí „Robopipe s.r.o.“. Seed adresu podle návrhu nemění. Rozhodněte, zda opravit ručně.

### T8, nízká: přepínač jazyka v HTML ze serveru vede na 404

Odkaz EN na `/cs/kontrola-etiket` má v HTML ze serveru `href="/en/kontrola-etiket"` (404). Po hydrataci je odkaz správný (`/en/label-inspection`). Robot bez JavaScriptu vidí 404. Chyba existuje už v produkci (`/cs/cenik` → `/en/cenik`, 404) a etapa 2 ji nezpůsobila. Značky `hreflang` jsou správné.

### T9, nízká: druhý název oboru

Úvodní stránka má nadtitulek „Průmyslové strojové vidění“ bez „(anglicky machine vision)“ (bod 3 zadání). Stránka „O nás“ uvádí „machine vision“ dvakrát v jedné větě.

## 8. Co jsem neověřil

- Zápis přes REST do produkce. Zadání ho zakazuje.
- Úplnou sadu e2e na databázi podobné produkci (`prodlike`). Build čte data z databáze `fresh`. Na `prodlike` jsem ověřil jen běh skriptu a výsledná data.
- Rich Results Test od Googlu. JSON-LD jsem ověřil parsováním a e2e.
- Zobrazení v administraci Payload pro roli editor.

## 9. Retest oprav

Tester: Arthur (subagent), 11. 11. 2026. Commit `240e13b` (opravy `787caff` a `240e13b`).

### Verdikt

**Prošlo.** Opravy T1 až T7 a T9 fungují. T8 je mimo tuto opravu. Nová chyba v kódu není. Seed v produkci nevrátí žádnou ruční změnu a nezveřejní žádný rozpracovaný koncept. Platí to pro stav produkce z 11. 11. 2026 kolem 01:30. Zbylá rizika jsou v kapitole 9.5.

### 9.1 Prostředí

- Vlastní worktree z `240e13b` a z `origin/master` (`3cf0640`). Vlastní Postgres 17 v kontejneru `robopipe-retest-pg`, port 55480. Vše jsem po testu smazal.
- Databáze:
  - `prodlike`: `SKIP_SEO_GEO=1 pnpm seed` z `master`, migrace z větve. Potom jsem přes REST přidal stav jako v produkci: text stránky ochrany osobních údajů z produkce (adresa Sokolovská, „Robopipe s.r.o.“), adresu kontaktu z produkce, průvodce (posts 10) z produkce, redirect `/en/ai-product-tagging`. Hero nadpis, `title` a `seo.title` úvodu jsem v obou jazycích změnil na značky `RUCNI …` jako ruční úpravu.
  - `localrun`: `pnpm seed` z `master` (obsah etapy 1 běžel, stránka `strojove-videni` existuje), migrace z větve.
  - `fresh`: postup z `implementation.md`, kapitola 4, s průvodcem a článkem o trendech z produkce.
- Server `next dev` na portu 3480 (REST), `next start` na portu 3484 (e2e). Proxy pro výpadek na portu 3482.
- Produkce: jen čtení přes vlastní proxy, která pustí jen `GET` a `POST /api/users/login`. Ostatní požadavky proxy blokuje. Proxy nezablokovala žádný požadavek. Celkem 142 `GET` a 7 přihlášení, žádný zápis.

### 9.2 Stav chyb T1 až T9

| Chyba | Stav | Ověření (vlastní běh) |
| --- | --- | --- |
| T1 | Opraveno | Lokálně i s `--remote` končí kódem 1 se zprávou: `--dryrun`, `--dry_run`, `--status published` (dva argumenty), `--status=foo`, `--status` dvakrát, `--dry-run` dvakrát, `--dry-run=yes`, `--remote` bez hodnoty, `--remote http://…` (mezera), `--remote=localhost:3481`, `--remote=ftp://x`, `-n`, `x`. Počty řádků v databázi se nezměnily. Proxy před serverem nedostala žádný požadavek, tedy ani přihlášení. Správné tvary (`--dry-run`, `--status=draft`, `--status=published` v libovolném pořadí) fungují lokálně i přes REST. |
| T2 | Opraveno | REST přes proxy, která po prvním `POST /api/pages` přeruší spojení u každého zápisu. 1. běh: kód 1, `PATCH http://127.0.0.1:3482/api/pages/6 failed: UND_ERR_SOCKET (other side closed)`. Stránka 6 má jen `cs` a je koncept. 2. běh: `page kamerova-kontrola-kvality (missing locale en)`, publikace. Stránka má `cs` i `en`, 8 bloků v každém jazyce, anglický hero a `seo`. 3. běh: `created (0)`, `updated (0)`. `/en/camera-quality-inspection` vrací 200 a je v `sitemap.xml`. |
| T3 | Opraveno | `POST http://127.0.0.1:3399/api/users/login failed: ECONNREFUSED …`, `… failed: ENOTFOUND (getaddrinfo ENOTFOUND robopipe-nonexistent.invalid)`. Server, který neodpoví: kód 1 po 37 s, `failed: no response in 30 s (timeout)`. |
| T4 | Opraveno | `prodlike`, lokálně: dry run a skutečný běh `--status=published` mají stejných 83 řádků (`created (47)`, `updated (29)`, `skipped (5)`). Porovnal jsem seřazené seznamy, rozdíl není. |
| T5 | Opraveno | Integrační testy 109/109 na `prodlike` (stránka `strojove-videni` neexistuje, test ji vytvoří a smaže), na `localrun` (stránka existuje a zůstane) a na `fresh`. |
| T6 | Opraveno | `/cs/kontrola-etiket` a `/en/label-inspection` vykreslí `camera-front`, snímek klasifikace v HTML není. Existující stránka se starým obrázkem (`localrun`, hero nastavený na `product-classification-screen.jpeg`): dry run i běh hlásí `page kontrola-etiket (hero image)`. Hero má potom `camera-front.png` v publikované verzi. Další běh nic nemění. |
| T7 | Opraveno | Na `fresh` neobsahují `/cs`, `/en`, kontakt, ochrana osobních údajů (cs, en), `/cs/o-nas` ani `llms.txt` text „Robopipe s.r.o.“. Na `prodlike` skript změnil jen název firmy, adresa Sokolovská zůstala. |
| T8 | Mimo opravu | Vývojář navrhuje nové issue. Issue v `Robopipe/Web` zatím neexistuje. |
| T9 | Opraveno | `/cs` má nadtitulek „Průmyslové strojové vidění (machine vision)“. `/cs/o-nas` má „machine vision“ jen v jedné větě, jednou. |

### 9.3 Idempotence a regrese

| Kontrola | Výsledek |
| --- | --- |
| Druhý běh `--status=published` lokálně (`prodlike`, `fresh`) | `created (0)`, `updated (0)` |
| Třetí běh přes REST po výpadku (`prodlike`) | `created (0)`, `updated (0)` |
| Ruční úprava úvodu (`prodlike`) | Hero nadpis, `title` a `seo.title` mají po běhu dál hodnoty `RUCNI …` v obou jazycích, v konceptu i v publikované verzi. |
| Jiné články a redirect (`prodlike`) | Beze změny. Skript změnil jen průvodce. |
| Lint | 0 chyb, 2 stávající varování |
| `tsc --noEmit` | 0 chyb |
| Integrační testy | 109/109 (19 souborů) na `prodlike`, `localrun` i `fresh` |
| `pnpm build` | OK |
| E2e (`fresh`, `next start`, Chromium headless shell 1248) | 67 prošlo, 1 selhal: `Blog featured card › keeps the photo inside the card on mobile …` (známá chyba L1) |

Poznámka k e2e: test čte `NEXT_PUBLIC_SERVER_URL` z `.env`. Když se hodnota liší od hodnoty při buildu, selže 34 testů na adrese v `canonical`. Šlo o chybu mého prostředí, ne aplikace. Po sjednocení adresy výsledek odpovídá tabulce.

### 9.4 Produkce: co přepíše 29 změn

Příkaz: `pnpm seed:seo-geo --remote=<proxy na https://robopipe.io> --dry-run --status=published`, účet `arthur@robopipe.io`, 11. 11. 2026, kód 0. Plán: `created (52)`, `updated (29)`, `skipped (0)`. Shodné s vývojářem.

Každou změnu jsem porovnal s produkčními daty (jen `GET`). Stejné změny jsem provedl na `prodlike` se stavem jako v produkci a porovnal obsah před během a po něm. Všechny dotčené dokumenty mají v produkci poslední verzi publikovanou. Koncept novější než publikovaná verze nemá žádný z nich.

| # | Změna | Co přesně přepíše | Stav v produkci | Vrátí ruční změnu? |
| --- | --- | --- | --- | --- |
| 1 | case study crocodille-line-quality | Doplní prázdné sekce `problem`, `solution`, `result`, `technique` (cs, en) a 2 FAQ | Sekce prázdné. Poslední verze 19 publikovaná 5. 10. | Ne |
| 2 | case study wolfberry-capsule-counting | Totéž | Verze 18 publikovaná 5. 10. | Ne |
| 3 | case study ai-product-tagging | Totéž | Verze 17 publikovaná 5. 10. | Ne |
| 4 | case study mg-servis-packaging-checks | Totéž | Verze 16 publikovaná 5. 10. | Ne |
| 5 | home page | Přidá 3 bloky (členství, řešení, automatická anotace). Změní `seo.description` cs a en. Změní nadtitulek cs „Průmyslové strojové vidění“ na „Průmyslové strojové vidění (machine vision)“. | `seo.description` a nadtitulek se rovnají hodnotám `replaceIf` (stav z 5. 10.). Ruční změna 10. 11. 18:07 (verze 60) je v hero nadpisu, `title` a `seo.title`. | Ne. Hero nadpis, `title`, `seo.title` a anglický nadtitulek zůstanou (ověřeno na `prodlike`). |
| 6 | page cenik FAQs (+3) | Přidá 3 FAQ za 5 existujících | Verze 56 publikovaná 5. 10. | Ne |
| 7 | post průvodce (heading, paragraph, seoTitle) | První H2 cs, nový odstavec cs, `seo.title` cs. Angličtina beze změny. | Hodnoty se rovnají `replaceIf`. Verze 95 publikovaná 10. 9. Starší koncepty (verze 86 z 17. 8. a starší) nejsou poslední verze. | Ne |
| 8 | page ochrana-osobnich-udaju company name | „Robopipe s.r.o.“ na „robopipe s.r.o.“ na 4 místech: první odstavec cs a en, `seo.description` cs a en. Titulek, adresa a ostatní text zůstanou. | Text z 5. 10. s adresou Sokolovská 81/55. Verze 55 publikovaná. | Ne |
| 9 až 12 | 4 × case study … published | Publikuje koncepty ze změn 1 až 4 | Poslední verze publikované | Ne |
| 13 až 19 | 7 × page … published (nové stránky) | Publikuje nové stránky | Stránky s těmito slugy v produkci nejsou | Ne |
| 20 | home page published | Publikuje koncept ze změny 5 | Verze 60 publikovaná 10. 11. 18:07 | Ne |
| 21 | page cenik published | Publikuje koncept ze změny 6 | Verze 56 publikovaná | Ne |
| 22 | post průvodce published | Publikuje koncept ze změny 7 | Verze 95 publikovaná | Ne |
| 23 | page ochrana-osobnich-udaju published | Publikuje koncept ze změny 8 | Verze 55 publikovaná | Ne |
| 24 | header navigation label | `hdr_navItems_2`: „Případové studie“ na „Případy užití“, „Case studies“ na „Use cases“ | Poslední úprava 31. 7. | Ne, plánovaná změna |
| 25 | footer | `ftr_columns_0_links_1`: stejné přejmenování. Do `ftr_columns_2` (Kontakt, Ochrana osobních údajů) přidá „O nás“ / „About“. | Poslední úprava 4. 8. Sloupec „Řešení“ v produkci není. | Ne |
| 26 | site-settings memberships | Prázdný seznam na 1 položku (Česká inovační platforma, 2 loga) | Prázdné | Ne |
| 27 | site-settings solutions | Prázdný seznam na 6 nových stránek | Pole v produkci zatím není (schéma etapy 2) | Ne |
| 28 | site-settings company | `legalName` „Robopipe s.r.o.“ (migrace ho zkopíruje z patičky) na „robopipe s.r.o.“, doplní IČO a text registrace cs a en | Pole v produkci zatím není | Ne |
| 29 | site-settings contact address | Jen první řádek „Robopipe s.r.o.“ na „robopipe s.r.o.“. Ulice Sokolovská 81/55, telefon, hodiny, mapa a rezervace zůstanou. | `Robopipe s.r.o.\nSokolovská 81/55\n186 00 Praha 8 - Karlín\nCzech Republic` | Ne |

Další dokumenty z ručních změn:

- Článek Manufacturing Forum (posts 15): skript ho nečte ani nemění. Verze 105 publikovaná 10. 11. 18:05.
- Redirect `/en/ai-product-tagging` (id 1): skript ho nemění. Žádná nová stránka nemá tento slug.
- Koncepty v produkci, které skript nepublikuje: stránka 6 (prázdný koncept bez titulku a slugu z 26. 10.) a články 11 až 14. Skript s nimi nepracuje.

### 9.5 Nová zjištění a rizika

Nová chyba v kódu není. Zjištění:

- **N1, informace:** V produkci je prázdný koncept stránky (pages 6, bez titulku a slugu, 26. 10.). Seed ho nemění. Doporučuji ho ručně smazat.
- **N2, informace:** V produkci je koncept článku 14 „3 způsoby, jak automatizovat anotaci obrázků …“. Seed vytvoří další koncept o automatické anotaci (`automaticka-anotace-dat`). Dva koncepty na podobné téma. Rozhodněte, který zveřejnit.

Rizika pro zápis do produkce:

- Krok publikace publikuje poslední koncept každého spravovaného dokumentu. Když někdo před během uloží koncept úvodu, ceníku, studie, průvodce nebo stránky ochrany osobních údajů, seed ho zveřejní. Těsně před během zopakujte dry run a zkontrolujte, že poslední verze dotčených dokumentů je publikovaná.
- Dry run teď běží proti schématu etapy 1. Plán pro `company` a `solutions` zopakujte po nasazení etapy 2 a před zápisem.
- Seed nemění `copyright` v patičce. Po migraci ho zastoupí `company.legalName` (změna 28).

### 9.6 Co jsem neověřil

- Zápis do produkce. Zadání ho zakazuje.
- Úplnou kopii produkční databáze. Stav produkce jsem napodobil jen u dotčených dokumentů (kapitola 9.1).
- Plán dry run proti produkci se schématem etapy 2 (etapa 2 není nasazená).
- E2e na `prodlike`. E2e běžely na `fresh`.
- Zobrazení v administraci Payload a Rich Results Test od Googlu.
