# Zpráva testera: měření Google a cookie lišta (issue #21, PR #23)

Datum: 11. 11. 2026. Větev `feat/21-google-measurement`, commit `d185e03`.

## Verdikt

**Nelze sloučit.** Kritéria 13 a 16 neprošla. Lišta zakrývá konec stránky. Přepínač jazyka v patičce
nejde použít, dokud návštěvník nezvolí. Stávající test `seo.e2e.spec.ts` kvůli tomu selhává.
Ostatních 14 kritérií prošlo, tři s výhradou.

## Prostředí

1. Vlastní server `next start` na portu 3921 (sestavení z 21:19, novější než všechny soubory v `src`).
2. Místní databáze `robopipe_21` s testovacími ID `G-TEST000000` a `AW-000000000`.
3. Ruční průchod: Playwright se skutečným Chrome (headless), skutečný `gtag.js` bez blokování Google.
4. Kopie staré místní databáze `robopipe_19` jako `robopipe_21_qa` pro skript obsahu.
5. Prázdná databáze `robopipe_21_mig` pro migrace.

Produkční databázi, produkční obsah ani účty Google jsem nepoužil.

## Automatické kontroly

| Kontrola | Výsledek |
| --- | --- |
| `tsc --noEmit` | prošlo |
| `lint` | 0 chyb, 2 stará varování |
| `test:int` | 26 souborů, 159 testů, vše prošlo |
| `test:e2e` (celá sada, chromium) | 109 prošlo, **3 selhaly** |

Selhání v `test:e2e`:

1. `seo.e2e.spec.ts` › „switching the language in the footer stores the choice for the root“. Lišta zachytí klik
   na odkaz `EN` v patičce. **Způsobuje to tato změna** (chyba B1).
2. `blogFeaturedCard.e2e.spec.ts` › dlouhý titulek na mobilu. Známá stará chyba, tato změna ji nezpůsobila.
3. `seo-stage2.e2e.spec.ts` › odkaz na článek, který je jen v produkci (404). Známá stará chyba.

Zpráva implementace uvádí „111 prošlo, 0 selhalo“. S vyplněnými ID test 1 selže vždy. Pravděpodobně běžel
s prázdnými ID.

## Akceptační kritéria

| # | Výsledek | Důkaz |
| --- | --- | --- |
| 1 | prošlo | Lišta na `/cs`, `/en`, `/cs/kontakt`, `/en/contact`, článku blogu a ochraně údajů. Texty cs i en bez anglických zbytků. |
| 2 | prošlo | „Přijmout vše“ i „Odmítnout“: 160 × 40 px, stejná barva `rgb(206, 249, 76)`, tloušťka písma 600. Na 390 px stejná šířka. |
| 3 | prošlo | Dialog má „Nezbytné“ (zapnuto, zakázáno), „Analytika“ a „Marketing“ (obě vypnuté). |
| 4 | prošlo s výhradou | Před volbou: žádná cookie. Po „Odmítnout“: jen `rp_consent`. Výhrada: odvolání nesmaže `_gac_*` (chyba B3). |
| 5 | prošlo | Před volbou `dataLayer` obsahuje jen `consent default` se čtyřmi `denied`, před `config`. Google dostává `gcs=G100`. Po odmítnutí `update` se čtyřmi `denied`. |
| 6 | prošlo místně | Po „Přijmout vše“: `update` se čtyřmi `granted`, `gcs=G111`, cookies `_ga`, `_ga_TEST000000`, `_gcl_au`. Skutečnou službu GA4 je nutné ověřit na produkci. |
| 7 | prošlo | Jen analytika: `analytics_storage` granted, reklamní tři denied, `gcs=G101`, cookies jen `_ga` a `_ga_TEST000000`. |
| 8 | prošlo | `rp_consent` žije 180 dní, `SameSite=Lax`. Po obnovení lišta chybí a volba platí před `config`. Poškozenou hodnotu viz chyba B2. |
| 9 | prošlo | Odkaz „Nastavení cookies“ / „Cookie settings“ v patičce. Změna platí hned (`update`). Smaže `_ga`, `_ga_*`, `_gid`, `_gat*`, `_gcl_*` i na doméně `.robopipe.test`. Fokus se vrátí na odkaz. |
| 10 | prošlo s výhradou | Právě jedna `generate_lead` po úspěšném odeslání. Nula po prázdném formuláři, chybném e-mailu i odpovědi serveru 500. Konverzi v Google Ads dodá až import z GA4 na produkci. |
| 11 | prošlo | Klik na `mailto:` pošle `contact_click {method: email}`, klik na `tel:` pošle `{method: phone}`. |
| 12 | prošlo | Pole `measurement` v *Site Settings*. Produkční ID nejsou v `src` ani `tests` (`git grep`). |
| 13 | **neprošlo** | Lišta zakrývá konec stránky na 1440, 390 i 320 px (chyba B1). Klávesnice a čtečka v pořádku. |
| 14 | prošlo s výhradou | `gtag.js` startuje po události `load` (load 177 ms, skript 200 ms). Lighthouse jsem neopakoval. Čísla jsou z implementace. |
| 15 | prošlo místně | Skript obsahu doplní odstavec „Cookies a měření“ v cs i en. Na produkci je nutný souhlas Filipa a spuštění skriptu. |
| 16 | **neprošlo** | Přepínač jazyka v patičce nejde použít při otevřené liště (chyba B1). Formulář a video v úvodu fungují (`heroVideo.e2e` prošlo). |

Souhrn: 14 prošlo (z toho 5 s výhradou nebo jen místně), 2 neprošla.

## Nalezené chyby

### B1. Lišta zakrývá konec stránky a přepínač jazyka (blokující)

Lišta je `position: fixed` dole. Stránka pod ní nemá žádné místo navíc. Spodní část patičky proto nejde
odkrýt ani posunem na konec stránky. Jediný přepínač jazyka na webu je v patičce.

Reprodukce:

1. Otevřete `/cs` v novém anonymním okně (1440 × 900).
2. Posuňte stránku na konec.
3. Klikněte na `EN` v patičce.

Výsledek: klik zachytí lišta. Pod lištou zůstane `© 2026 robopipe s.r.o.`, „Ochrana osobních údajů“,
„Nastavení cookies“ a `EN`. Na 390 px lišta zabírá 36 % výšky, na 320 × 568 px 50 %.

Očekávání: návštěvník může použít celou stránku i bez volby (kritérium 13).

Důkaz: `screens/test-footer-covered-1440.png`, `screens/test-banner-kontakt-390-end.png`,
`screens/test-banner-kontakt-320-end.png`. Test: `tests/e2e/consentTesterFindings.e2e.spec.ts` (první test)
a stávající `seo.e2e.spec.ts`.

### B2. Poškozená cookie `rp_consent` shodí celou stránku (střední)

`readCookie` v `src/lib/clientCookies.ts` volá `decodeURIComponent` bez ošetření chyby. Neplatná sekvence `%`
vyhodí `URIError` v efektu `ConsentProvider`. Next.js pak ukáže „This page couldn’t load“ na každé stránce.
Návštěvník si nepomůže, cookie platí dál. Hodnota vznikne jen ručním zásahem nebo jinou aplikací na doméně.
Proto střední, ne blokující.

Reprodukce:

1. V prohlížeči nastavte cookie `rp_consent=%E0%A4%A` (nebo jen `%`).
2. Otevřete libovolnou stránku webu.

Výsledek: chybová stránka, `pageerror: URI malformed`. Ostatní poškozené hodnoty jsou v pořádku: nesmysl,
prázdná hodnota, verze 2, `"v":"1"`, pole, `null`, řetězec místo boolean. Lišta se ukáže a nic nespadne.
Hodnota 3,8 kB projde jako platná volba.

Důkaz: `screens/test-broken-cookie-crash.png`. Testy: `tests/int/consentTesterFindings.int.spec.ts`,
`tests/e2e/consentTesterFindings.e2e.spec.ts` (druhý test).

### B3. Odvolání souhlasu nesmaže `_gac_*` (střední)

`GOOGLE_COOKIES` v `src/lib/consent.ts` zná `_ga`, `_ga_*`, `_gid`, `_gat*` a `_gcl_*`. Nezná `_gac_*`.
GA4 propojená s Google Ads ukládá `_gac_gb_*` po příchodu z reklamy (parametr `gclid`). Kritérium 4 chce
po odmítnutí žádnou cookie Google.

Reprodukce (místně simulováno, host `www.robopipe.test`):

1. Přijměte vše.
2. Vložte cookies `_gac_gb_123` a `_gac_UA-1` na doménu `.robopipe.test`.
3. V patičce vypněte obě kategorie a uložte.

Výsledek: `_gac_gb_123` a `_gac_UA-1` zůstanou. Ostatní cookies Google zmizí.

Test: `tests/int/consentTesterFindings.int.spec.ts`. Vznik `_gac_*` se skutečnou službou je nutné ověřit
na produkci.

### B4. Fokus po volbě v liště spadne na začátek stránky (drobná)

Po „Přijmout vše“ nebo „Odmítnout“ klávesnicí lišta zmizí a fokus je na `BODY`. Další Tab začne od začátku
stránky. Lepší je přesunout fokus na `main` nebo na první prvek obsahu.

### B5. Druhá záložka drží starou volbu (drobná)

Záložka A přijme vše. Otevřená záložka B dál ukazuje lištu. Když B odmítne, uloží se odmítnutí, ale záložka A
dál měří s `granted` až do obnovení. Volba se mezi záložkami nesynchronizuje.

## Ověřeno bez nálezu

1. **Rychlé klikání.** Čtyři kliky Přijmout a Odmítnout v jednom kroku: platí poslední volba, cookie
   a `dataLayer` souhlasí, žádná chyba.
2. **Prázdná ID.** Žádná lišta, žádný odkaz v patičce, žádný `gtag`, prázdný `dataLayer`, žádný požadavek
   na Google, žádná chyba v konzoli, ani po kliku na `mailto:`.
3. **Jen `G-`.** Jeden `config`, lišta, po přijetí jen `_ga` a `_ga_*`.
4. **Jen `AW-`.** Jeden `config`, lišta, po přijetí `_gcl_au`.
5. **Klávesnice.** Pořadí Tab: Přijmout vše, Odmítnout, Nastavení, Ochrana osobních údajů. Viditelný obrys
   fokusu. Enter otevře dialog, fokus jde na první přepínač, mezerník přepíná. Escape dialog zavře a vrátí
   fokus na „Nastavení“. Escape na liště nic nedělá. Lišta není modální, to je záměr.
6. **Čtečka.** Lišta je `region` s názvem „Cookies a měření“. Dialog je nativní `dialog` s názvem.
   Přepínače mají `role=switch` a název z popisku.
7. **Kontrast.** Nadpis 18,7 : 1, tlačítka 13,3 : 1, odkaz 6,3 : 1, text `rgba(0,0,0,0.6)` na bílé asi
   5,7 : 1. Vše nad 4,5 : 1.
8. **Odkaz na ochranu údajů.** `/cs/ochrana-osobnich-udaju` a `/en/privacy-policy`, obě odpovídají 200.
9. **Nabídka jazyka.** S cookie `geo-country=DE` se nabídka neukáže, dokud je lišta otevřená. Po volbě se ukáže
   a pošle `locale_suggest_shown`.
10. **Administrace.** `/admin/login` nemá `gtag`, skript Google ani lištu. Layout `(payload)` nemá
    `ConsentProvider`. Přihlášený průchod administrací jsem v prohlížeči nedokončil (testovací uživatel vznikl
    až později). Živý náhled měří, to implementace uvádí jako známé omezení.
11. **Konzole a hydratace.** `/cs`, `/en`, `/cs/kontakt`, `/en/contact`, `/cs/blog/od-snimku-k-inferenci`,
    `/cs/ochrana-osobnich-udaju`: žádná chyba ani varování.
12. **Skript `seed:cookie-policy`** na kopii staré databáze: `--dry-run` nezměnil obsah (stejný otisk md5).
    První běh změnil v cs i en jen odstavec „Analytika.“ a větu o Vercelu. Ostatních 14 bloků obsahu beze změny.
    Druhý běh: „changed (0)“, obsah stejný.
13. **Migrace** na prázdné databázi: `migrate` prošlo (11 migrací, dva nové sloupce). `migrate:down` vrátí celou
    dávku. Nová migrace prošla dolů, sloupce zmizely. Pak selhala stará migrace `20260730_112326_ai_blog_generation`
    (chybí omezení `payload_locked_documents_rels_blog_topics_fk`). To je stará chyba mimo tuto změnu.
    Nové `migrate` po návratu prošlo.
14. **Odeslání formuláře při chybě serveru 500.** `generate_lead` se nepošle. Stránka ale ukáže chybovou
    obrazovku Next.js. To je staré chování formuláře mimo tuto změnu.

## Poznámka k signálům bez souhlasu

Před volbou jde na Google `g/collect` s `gcs=G100` a parametrem `cid`. Google v rozšířeném consent mode
posílá dočasné ID bez cookie. Žádná cookie `_ga` nevznikne. Odpovídá to rozhodnutí Filipa (bod 9).
Po „Přijmout vše“ vznikne i cookie třetí strany `IDE` na `.doubleclick.net`. Text o cookies ji nezmiňuje.

## Nové testy

Oba soubory selhávají, dokud chyby nebudou opravené.

1. `tests/int/consentTesterFindings.int.spec.ts`: B2 (`readCookie` nesmí vyhodit chybu), B3 (`_gac_*`).
2. `tests/e2e/consentTesterFindings.e2e.spec.ts`: B1 (konec stránky a `EN` v patičce), B2 (stránka nespadne).
   Je to samostatný soubor, protože `consent.e2e.spec.ts` běží sériově a jedno selhání by přeskočilo další testy.

## Co jsem nemohl ověřit místně

1. Vznik `_ga` a příjem dat ve skutečné službě GA4 s `G-F89GSGDB8T`.
2. Konverzi v Google Ads po importu `generate_lead` (zpoždění až 24 hodin).
3. Vznik `_gac_*` po příchodu z reklamy s `gclid` (souvisí s B3).
4. Mazání cookies na skutečné doméně `.robopipe.io` (místně ověřeno na `.robopipe.test`).
5. Lighthouse mobil na produkci (kritérium 14).
6. Skript obsahu přes `--remote` proti produkci.
7. Skutečnou čtečku obrazovky (VoiceOver). Ověřil jsem jen strom přístupnosti.
