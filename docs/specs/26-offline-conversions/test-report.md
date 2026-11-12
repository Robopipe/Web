# #26 Offline konverze: zpráva testera

PR [#27](https://github.com/Robopipe/Web/pull/27), větev `feat/26-offline-conversions`, testovaná hlava `83e663a`. Test proběhl 11. 11. 2026 na místní instanci (`next start`, port 3926, databáze `robopipe_26`). Všechna data jsou vymyšlená.

## Verdikt

**NELZE SLOUČIT.**

Důvod je chyba B1. Odkaz s `?gclid=%00…` zablokuje formulář na 90 dní každému návštěvníkovi, který přijme cookies. Poptávka se neuloží. To porušuje kritérium 11. Oprava je malá (kapitola Chyby). Ostatních 14 kritérií prošlo.

## Automatické kontroly (spustil tester)

| Kontrola | Výsledek |
|---|---|
| `tsc --noEmit` | 0 chyb |
| `pnpm lint` | 0 chyb, 2 starší varování (`postcss.config.mjs`, `admin.e2e.spec.ts`) |
| `pnpm test:int` na `83e663a` | 29 souborů, 247 testů, vše prošlo |
| `pnpm build` | prošel, route `ƒ /api/google-ads/company-leads.csv` |
| `pnpm test:e2e` na `83e663a` | 149 prošlo, 2 selhala. Obě jsou známá stará selhání (`blogFeaturedCard … long unbroken title`, `seo-stage2 … answers 200`). Jiné selhání není. |
| Nové testy testera | `offlineConversions.int.spec.ts`: 30 prošlo, 3 selhaly (B1, B2, B3). `offlineConversions.e2e.spec.ts`: 14 prošlo, 1 selhal (B1). Selhání jsou záměrná. Testy projdou po opravě. |

## Akceptační kritéria

| # | Výsledek | Důkaz |
|---|---|---|
| 1 | prošlo | Poptávka ukládá `consentAnalytics`, `consentMarketing`, `gclid`, `gbraid`, `wbraid`, `clickedAt`. Bez marketingu se značka neuloží (scénář 3: `consentMarketing: false`, `gclid: null`). Pozdní souhlas: odmítnout, přejít na kontakt, zapnout marketing v patičce. Poptávka má `consentAnalytics: false`, `consentMarketing: true` a značku. |
| 2 | prošlo | Značka přežije přechod přes `next/link` (e2e test 2). Po odmítnutí není `rp_click` mezi cookies. Po odvolání marketingu v patičce cookie `rp_click` zmizí (e2e a ruční průchod, zůstane jen `rp_consent`). |
| 3 | prošlo s výhradou | Se skutečným `gtag.js` (testovací ID) pro scénáře 1 cs, 1 en, 2 a 3: 0 požadavků na domény Googlu s čitelným e-mailem (i po dvojím dekódování URL a těla). `set user_data` je v `dataLayer` 1× jen u scénáře 1. U Gmailu a po odmítnutí 0×. Otisk se shoduje s nezávislým výpočtem. Výhrada: s `AW-000000000` značka otisk neodešle. Skutečné odeslání otisku ověří tester na produkci. |
| 4 | prošlo | Jediný seznam domén je v `src/lib/leadEmail.ts`. `grep` na `gmail.com` a `seznam.cz` v `src/` nenajde jiné místo. Export, administrace a `submitLead` volají `isGoogleAdsLead`. Výsledky okrajových případů jsou níže. Drobná výhrada B5. |
| 5 | prošlo | `GET` vrátí `200`, `text/csv; charset=utf-8`, UTF-8 bez BOM, řádky `\n`. Hlavička odpovídá kapitole 8. Čas `2026-11-11T22:23:10Z` odpovídá formátu „UTC ISO 8601“ z dokumentace Data Manageru (support 14184381, ověřeno 11. 11. 2026). Výhrada B2. |
| 6 | prošlo | Místní export má jen řádky firemních poptávek se souhlasem. Gmail, odmítnutí, `koala42.com` a jméno „TEST …“ chybí. Čas konverze je `createdAt`. Okno: poptávka stará 89 dní 23 hodin v exportu je, poptávka stará 90 dní 1 hodinu není. |
| 7 | prošlo | Bez hlavičky `401` + `WWW-Authenticate: Basic realm="google-ads-export", charset="UTF-8"`. Špatné heslo, špatné jméno, `Bearer`, Basic bez dvojtečky: `401`. Server s prázdnými `GOOGLE_ADS_EXPORT_USER` i `_PASSWORD`: `401` i pro prázdné údaje `:`. Jen jméno bez hesla: `401`. Heslo je jen v `.env`, který git ignoruje. `.env.example` má prázdné heslo. |
| 8 | prošlo | Dvě volání exportu vrátí stejné tělo (stejný SHA-1 souboru). `Order ID` je `lead-<id>`, čas a název se nemění. |
| 9 | prošlo | Název je jen v `site-settings.measurement.leadConversionName` (výchozí hodnota v `SiteSettings.ts` a v migraci). Prázdný název vrátí `500` (int test). |
| 10 | prošlo | Celá sada e2e včetně `consent.e2e.spec.ts`, `consentTesterFindings.e2e.spec.ts` a `frontend.e2e.spec.ts` prošla. |
| 11 | **neprošlo** | B1: značka s bajtem NUL v adrese. Server zapíše chybu `invalid byte sequence for encoding "UTF8": 0x00`, formulář ukáže chybu, poptávka se neuloží. B3: totéž s poškozeným `at` v cookie. Dvojí rychlé odeslání vytvoří 1 poptávku a 1× `user_data`. Limit: 5 odeslání projde, šesté vrátí chybu a poptávku neuloží. Vyhazující `gtag` a rozbité cookies formulář nezastaví (e2e). |
| 12 | prošlo s výhradou | Odstavec je v `/cs/ochrana-osobnich-udaju` a `/en/privacy-policy` hned za odstavcem o marketingu. Nový odstavec nemá hvězdičky. 4 hvězdičky na stránce jsou ze staršího textu `_gcl_*` (#21). Obsah nepokrývá scénář 4 a uložení do databáze (B4). |
| 13 | prošlo | Jako editor i jako správce: `PATCH /api/leads/<id>` s `attribution.gclid` a `consentMarketing` vrátí `200`, ale hodnoty zůstanou. GraphQL `updateLead` také nic nezmění. Anonymní `GET` i `POST /api/leads`: `403`. Virtuální pole nejde přepsat. E2e test 13 a screenshoty vývojáře ukazují pole jen pro čtení. |
| 14 | prošlo | Jednotkové testy pro `isBusinessEmail`, `isTestLead`, otisk, `clickId`, export a route. E2e pro scénáře 1 až 3 v cs i en. |
| 15 | prošlo | `implementation.md` má kroky na produkci (8 kroků) a kroky v Google Ads (účet, akce, mapování, sekundární akce, kontrola). V Google Ads je neověřil nikdo (vývojář ani tester nemají přístup). |

## Scénáře 1 až 4

| Scénář | cs | en | Důkaz |
|---|---|---|---|
| 1 reklama, souhlas, firemní e-mail | prošlo | prošlo | Poptávka má značku, je v exportu, `user_data` 1×, 0 čitelných e-mailů na Google |
| 2 reklama, souhlas, Gmail | prošlo | prošlo (e2e) | Poptávka má značku, v exportu není, `user_data` 0× |
| 3 odmítnutí | prošlo | prošlo (e2e) | `rp_click` neexistuje, poptávka bez značky, `consentMarketing: false`, v exportu není |
| 4 bez reklamy, souhlas, firemní e-mail | prošlo | nezkoušeno zvlášť | Řádek v exportu s prázdným GCLID (`lead-39`). Chování odpovídá kapitole 2 architektury. |

## Nezávislé ověření pravidel

`isBusinessEmail` (skript testera přes `tsx`, výsledek `true` = firemní):

| Vstup | Výsledek | Poznámka |
|---|---|---|
| `novak@firma.cz`, `NOVAK@FIRMA.CZ`, ` novak@firma.cz ` | `true` | Správně |
| `Novak@GMAIL.COM`, `novak@SEZNAM.cz`, `Jan.Novak@GoogleMail.com`, `novak+ads@gmail.com` | `false` | Správně |
| `novak@praha.firma.cz` | `true` | Subdoména firmy, správně |
| `novak@mail.seznam.cz`, `novak@gmail.cz` | `true` | Subdoména veřejné služby není v seznamu, podle kapitoly 9.1 |
| `novak@xn--lutouk-4ya.cz`, `novak@žluťoučký.cz` | `true` | Zod ve formuláři adresu s diakritikou v doméně odmítne už dnes (beze změny) |
| `''`, `bez-zavinace`, `@firma.cz`, `novak@`, `novak@firma`, `novak@.firma.cz`, `novak@gmail.com.` | `false` | Správně |
| `a@b@firma.cz`, `novak@firma..cz`, `novak @firma.cz` | `true` | Zod tyto adresy odmítne dřív, do databáze nepřijdou |
| `novak@t-online.de`, `yahoo.co.uk`, `hotmail.co.uk`, `hotmail.de`, `o2active.cz`, `atlas.sk`, `post.sk`, `mail.ru`, `yandex.ru`, `zoho.com`, `tutanota.com` | `true` | B5 |

`isTestLead`: `TEST Novák` a ` TEST x` ano. `Test Novák`, `test x`, `Testová` ne. `x@dev.robopipe.io` a `x@KOALA42.COM` ano. `x@notrobopipe.io` a `x@robopipe.io.evil.cz` ne. Jména `TESTER Jan` a `TESTOVACI s.r.o.` jsou zkušební, protože začínají „TEST“. Odpovídá to zadání.

`isGoogleAdsLead`: souhlas s marketingem, firemní e-mail a ne zkušební. Značka není potřeba. Ověřeno na místních poptávkách 35 až 42 a v int testech.

Otisk SHA-256: tester spočítal otisk sám podle pravidel z dokumentace Data Manageru (oříznout mezery, malá písmena, u `gmail.com` a `googlemail.com` odstranit tečky před `@`, hex SHA-256). Všechny testované adresy se zavináčem daly stejný otisk jako `hashEmail`. `printf 'novak@firma.cz' | shasum -a 256` dá `0193ede0…d5d0`, stejně jako příklad v architektuře.

CSV: pole s čárkou, uvozovkou nebo novým řádkem jsou v uvozovkách, uvozovka uvnitř je zdvojená. Čas s milisekundami a s posunem `+02:00` převede na UTC s `Z`. Znaky `=`, `+`, `-`, `@` na začátku buňky kód neošetří (B2).

## Další útoky

| Oblast | Výsledek |
|---|---|
| Metody | `POST`, `PUT`, `PATCH`, `DELETE`: `405` bez dat. `OPTIONS`: `204` bez dat. `HEAD` bez přihlášení `401`, s přihlášením `200`. |
| Cache | `Cache-Control: no-store` u `200`, `401` i `500` |
| Objem | 20 000 poptávek: odpověď za 0,63 s, 2,8 MB, paměť serveru 202 MB na 512 MB. Každý řádek má 8 polí. |
| `rp_click` poškozená, 3 000 znaků, `at` 30 minut napřed, `at` 2 hodiny napřed, `at` 91 dní staré | Poptávka uložena. Značka jen u 30 minut napřed (odchylka 1). Ostatní bez značky. |
| `at` jen datum (`2026-11-11`) | Uloženo, `clickedAt` je půlnoc UTC |
| `at` ve tvaru `Date.toString()` | **Poptávka ztracena** (B3) |
| Více parametrů | `?wbraid=W&gbraid=G&gclid=A&gclid=B` uloží `gclid=A` |
| `gclid` s `<script>`, `=…`, `+…`, `@…` | Uloží se. `<script>` je v administraci jen text. `=…` jde do exportu (B2). |
| `gclid` s `%00` | **Poptávka ztracena** (B1) |
| Souhlas až po příchodu z reklamy | Značka se zapíše po zapnutí marketingu v patičce |
| Mobil 360 px | Lišta i formulář bez vodorovného posunu (`scrollWidth − innerWidth = 0`). Odeslání prošlo. `screens/tester-mobile-banner.png`. |
| Migrace | Kopie `robopipe_26` vrácená do stavu `main` (sloupce odebrány, řádek migrace smazán) plus stará poptávka bez sloupců `attribution`. `up` proběhl za 3 ms. Stará poptávka dostala `false`, `false` a prázdné značky. `site_settings` dostal `Firemni poptavka (import)`. `down` odebral všech 7 sloupců a jen tuto migraci. Druhý `up` prošel. |

## Chyby

### B1 Značka s bajtem NUL zablokuje formulář na 90 dní (blokující)

Reprodukce:

1. Otevřete `http://localhost:3926/cs?gclid=%00NUL1`.
2. Zvolte „Přijmout vše“. Cookie `rp_click` obsahuje `"id":"\u0000NUL1"`.
3. Otevřete `/cs/kontakt` a odešlete formulář s `jan@firma-zkouska.cz`.

Výsledek: formulář ukáže chybu. Poptávka v databázi není. Log serveru: `invalid byte sequence for encoding "UTF8": 0x00`. Cookie platí 90 dní, takže každé další odeslání z tohoto prohlížeče selže.

Očekáváno: poptávka se uloží (kritérium 11).

Dopad: kdokoli může zveřejnit odkaz na robopipe.io s `?gclid=%00…`. Každý návštěvník z tohoto odkazu, který přijme cookies, nepošle poptávku a obchod se o něm nedozví.

Příčina: `VALID_ID` v `src/lib/clickId.ts` povolí kontrolní znaky kromě bílých znaků. `submitLead` uloží `attribution` ve stejném `payload.create` jako poptávku.

Návrh: `VALID_ID` povolí jen `[A-Za-z0-9_-]` (Google tyto znaky používá). Při chybě `payload.create` s atribucí uložit poptávku znovu bez atribuce.

Testy: `B1` v `offlineConversions.int.spec.ts`, poslední test v `offlineConversions.e2e.spec.ts`.

### B2 Hodnota značky na začátku buňky CSV může být vzorec (střední)

Reprodukce: otevřete `/cs?gclid=%3DHYPERLINK(1)X`, přijměte cookies a odešlete firemní poptávku. Řádek exportu je `lead-70,Firemni poptavka (import),…,=HYPERLINK(1)X,,,…,Granted`.

Dopad: záloha z kapitoly 14 (Apps Script zapíše CSV do Google tabulky přes `setValues`) a otevření souboru v Excelu spustí vzorec. Čárky a uvozovky regex zakáže, rozsah útoku je proto malý. Hlavní cesta (Data Manager přes HTTPS) vzorce nespouští.

Návrh: stejná oprava `VALID_ID` jako v B1. Případně `toCsv` doplní `'` před buňku, která začíná `=`, `+`, `@`, tabulátorem nebo `\r`.

Test: `B2` v `offlineConversions.int.spec.ts`.

### B3 Poškozené `at` v `rp_click` ztratí poptávku (drobná)

Reprodukce: nastavte cookie `rp_consent` se souhlasem a `rp_click` s `"at":"Wed Nov 11 2026 23:41:27 GMT+0100 (Central European Standard Time)"`. Odešlete formulář.

Výsledek: chyba formuláře, log `invalid input syntax for type timestamp with time zone`. `parseClickId` hodnotu přijme (`Date.parse` ji umí), ale uloží ji beze změny.

Dopad: hodnotu zapíše jen ruční úprava cookie ve vlastním prohlížeči. Porušuje to ale kritérium 11 a ukazuje stejnou slabinu jako B1.

Návrh: `parseClickId` vrátí `at` jako `new Date(landed).toISOString()`.

Test: `B3` v `offlineConversions.int.spec.ts`.

### B4 Text Ochrany osobních údajů nepopisuje scénář 4 (střední)

Text říká: „Když přijdete z naší reklamy … Když potom odešlete poptávku z firemní e-mailové adresy, předáme Googlu otisk e-mailu.“ Kód předá otisk (značce i v exportu) u každé firemní poptávky se souhlasem s marketingem, i bez příchodu z reklamy (kapitola 2 architektury). Text také neříká, že web ukládá značku kliknutí a stav souhlasu k poptávce do své databáze.

Návrh textu (cs): „Když odešlete poptávku z firemní e-mailové adresy a máte souhlas s marketingem, předáme Googlu otisk e-mailu (SHA-256), čas odeslání a značku kliknutí, pokud ji máme. Značku kliknutí a vaši volbu cookies uložíme také k poptávce.“ Text schvaluje Filip. Text musí být zveřejněný dřív, než Arthur nastaví plán v Google Ads.

### B5 Seznam veřejných domén nemá několik běžných služeb (drobná)

Firemní jsou například `t-online.de`, `hotmail.de`, `hotmail.co.uk`, `yahoo.co.uk`, `o2active.cz`, `atlas.sk`, `post.sk`, `mail.ru`, `yandex.ru`, `zoho.com`, `tutanota.com`. Zadání uvádí seznam jen jako příklad. Poptávka z těchto domén půjde do Google Ads jako firemní. Návrh: doplnit seznam v `FREE_EMAIL_DOMAINS`. Rozhodne Filip nebo architekt.

### Poznámky bez chyby

- `clickedAt` může být až 1 hodinu po `createdAt` (odchylka 1). Export `clickedAt` nepoužívá. Administrace ukáže kliknutí po poptávce.
- `?gclid=&gbraid=G` neuloží nic, protože první nalezený parametr je prázdný. Google prázdný `gclid` neposílá.
- Limit odeslání čte první hodnotu `x-forwarded-for`. Je to starší kód, ne #26. Na produkci záleží na tom, jak proxy hlavičku skládá.

## Co místně nešlo ověřit

1. Že značka Google se skutečným `AW-…` připojí otisk k `form_submit`. Tag Assistant na produkci (architektura 13.3).
2. Že Data Manager přijme zdroj HTTPS s HTTP Basic (N1) a pole souhlasu (N2). Ověří Arthur při nastavení.
3. Že Data Manager přijme soubor bez chyby formátu a řádek se spáruje v diagnostice.
4. Přístup z 27 rozsahů IP Data Manageru na produkci (žádný firewall není, podle architektury).
5. Text v Ochraně osobních údajů na produkci po `seed:cookie-policy`.
6. Kroky v Google Ads z `implementation.md` (popisky tlačítek, N4).

## Kolo 2

Testovaná hlava `7fd19df` (opravy `55f9df1`, `20fee1e`, `8a23090`, `02fc211`). Test proběhl 12. 11. 2026 na místní instanci (`next start`, port 3926, databáze `robopipe_26`). Všechna data jsou vymyšlená. Produkce, Google Ads a `master` zůstaly beze změny.

### Verdikt kola 2

**LZE SLOUČIT.**

Chyby B1 až B5 jsou opravené. Žádný obchvat oprav tester nenašel. Kritérium 11 prošlo celé. Nová chyba C1 je drobná a sloučení neblokuje. Znění odstavce B4 musí dál schválit Filip. Text musí být na produkci dřív, než Arthur nastaví plán v Google Ads.

### Automatické kontroly kola 2 (spustil tester)

| Kontrola | Výsledek |
|---|---|
| `tsc --noEmit` | 0 chyb |
| `lint` | 0 chyb, 2 starší varování (beze změny) |
| `test:int` | 30 souborů, 270 testů, vše prošlo (256 vývojáře + 14 nových testera) |
| `build` | prošel, route `ƒ /api/google-ads/company-leads.csv` |
| `test:e2e` | 159 prošlo, 2 selhala. Obě jsou známá stará selhání (`blogFeaturedCard … long unbroken title`, `seo-stage2 … answers 200`). Jiné selhání není. |
| Nové testy testera | `tests/int/offlineConversionsRound2.int.spec.ts` (14 testů). V `tests/e2e/offlineConversions.e2e.spec.ts` 9 nových testů „11 (round 2)“. Všechny prošly. |

Prostředí: `pnpm` na stroji testera chybí, skripty běžely přes `npm run`. Playwright 1.58.2 neměl svůj Chromium 1208. Tester ho stáhl a rozbalil do místní cache.

### Stav chyb z kola 1

| Chyba | Stav | Důkaz |
|---|---|---|
| B1 | opraveno | Postup z kola 1 (`/cs?gclid=%00…`, přijmout, odeslat): poptávka uložena, `rp_click` nevznikne. Obchvaty: kontrolní znak `%01`, `DEL`, `ESC`, znaky mimo ASCII, plnošířkové `＝`, mezera nulové šířky, znak `U+202E`, `+` (mezera), apostrof, délka 513, prázdná hodnota. V adrese ani v ručně vyrobené cookie `rp_click` žádná hodnota neprojde. Délka 512 projde. Poptávka se vždy uloží, souhlas zůstane, `googleAdsExport` je `true` (scénář 4). Špatná značka v pozdějším odkazu nepřepíše dřívější dobrou značku. |
| B2 | opraveno | Místní export: žádná buňka nezačíná `=`, `+`, `-`, `@`, tabulátorem ani `\r`, žádná buňka nemá apostrof. Skutečné značky (`Cj0KCQiA-abc_DEF123_BwE`, `0AAAAAo-abc_DEF`, `ClkKCQiA_x-1`) jdou do exportu beze změny. Název konverze se znakem vzorce na začátku dostane apostrof i v uvozovkách. Dvě volání exportu mají stejný SHA-1. |
| B3 | opraveno | `at` ve tvaru `Date.toString()`, `toUTCString()`, jen datum, s mezerou místo `T`, s posunem `+14:00` a „12 Nov 2026“: poptávka uložena se značkou a s časem ISO. E2e: cookie s `Date.toString()` přes prohlížeč, poptávka uložena se značkou. |
| B4 | opraveno, čeká na schválení textu | Text cs i en pokrývá scénář 4 („To platí i tehdy…“) a uložení značky a volby cookies k poptávce. Tester vrátil do `robopipe_26` text z kola 1 (hlavní tabulka i verze). `seed:cookie-policy`: první spuštění 2 změny „replaced with the current text“, druhé spuštění 0 změn. Na stránce cs i en je odstavec 1×, hned za odstavcem o marketingu. |
| B5 | opraveno | Všech 11 domén z kola 1 je veřejných. Zbývající mezery jsou v poznámkách níže. |

### Nové chyby

#### C1 Záložní uložení zapíše osobní údaje poptávky do logu (drobná)

Postup zopakování: zavolejte `createLeadWithAttribution` s atribucí, kterou Postgres odmítne (test „a lead saved without attribution…“ v `offlineConversionsRound2.int.spec.ts`). Varování `Lead with attribution failed, saving without it` obsahuje chybu Drizzle. Chyba má řádek `params:` se jménem, e-mailem, telefonem a zprávou.

Dopad: poptávka se uloží, ale její osobní údaje jsou i v logu serveru. Dnes tuto cestu nikdo nespustí, protože `VALID_ID` a `parseClickId` špatné hodnoty zastaví dřív. Stejný zápis do logu má starší vnější `catch` v `submitLead`, ten ale platí jen pro ztracenou poptávku.

Návrh: do varování dávat jen `err.cause?.code` nebo název chyby, ne celý objekt chyby. Sloučení neblokuje.

### Odchylky 1 až 4 z kola 2

1. Délka 1 až 512: ověřeno. 512 projde, 513 ne, v adrese i v cookie.
2. `-` v ochraně `toCsv`: žádná skutečná značka v testech nezačíná `-`. Riziko je malé, souhlas.
3. Záložní uložení bez celé skupiny `attribution`: poptávka má `consentMarketing: false`, nemá otisk, `googleAdsExport` je `false` a v exportu chybí. Uloží se právě 1 řádek. Chyba mimo atribuci (bajt NUL ve zprávě) vyhodí chybu jednou a nezanechá v databázi žádný řádek ani kopii.
4. Věta „To platí i tehdy…“ odpovídá kapitole 2 architektury. Architektura kapitola 15 má dál text z kola 1. Platí text v `src/seed/cookiePolicy.ts`.

### Kritérium 11 znovu celé

| Útok | Výsledek |
|---|---|
| Neplatné značky v adrese (13 druhů výše) | poptávka uložena, prošlo |
| Poškozená cookie `rp_click` a `rp_consent` | poptávka uložena (e2e) |
| Poškozené `at` v cookie (6 formátů) | poptávka uložena se značkou |
| `gtag`, který vyhodí chybu | formulář funguje (e2e) |
| Dvojklik na tlačítko odeslat | 1 poptávka, `user_data` 1× (nový e2e test) |
| Databáze odmítne atribuci | poptávka uložena bez atribuce, bez otisku |

### Kritéria, kde se kód v kole 2 změnil (namátkou)

| # | Výsledek |
|---|---|
| 3 | prošlo. O otisku rozhoduje uložená poptávka. Při záložním uložení otisk nevznikne. |
| 4 | prošlo. Seznam je dál jen v `src/lib/leadEmail.ts`. |
| 5, 8 | prošlo. `200`, `text/csv; charset=utf-8`, `no-store`, stejné tělo při dvou voláních. Bez přihlášení `401`. |
| 6 | prošlo. Poptávka po záložním uložení v exportu není. |
| 12 | prošlo, text čeká na schválení Filipa. |

### Poznámky bez chyby

- `?gclid=<neplatná>&gbraid=<platná>` neuloží nic, protože kód vezme první nalezený parametr. Google oba parametry najednou neposílá.
- Seed nahradí každý odstavec, který začíná „Když přijdete z naší reklamy Google Ads“. Pokud někdo odstavec upraví v administraci, další spuštění seedu úpravu přepíše.
- Jako firemní stále projdou například `upcmail.cz`, `cbox.cz`, `raz-dva.cz`, `klikni.cz`, `in.cz`, `email.com`, `aon.at`, `a1.net`, `orange.fr`, `libero.it`, `free.fr`, `qq.com`. Zadání bere seznam jen jako příklad. Rozhodne Filip nebo architekt.

### Co místně nešlo ověřit

Body 1 až 6 z kapitoly „Co místně nešlo ověřit“ platí dál.
