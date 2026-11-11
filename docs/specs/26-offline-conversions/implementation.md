# #26 Offline konverze: implementace

Zadání: [`product.md`](./product.md). Architektura: [`architecture.md`](./architecture.md). Větev `feat/26-offline-conversions`.

## Co je hotové

Implementace sleduje plán z kapitoly 18 architektury. Platí návrhy 3.1 až 3.4 a odpověď na otázku 17.1: otisk e-mailu jde jen u poptávky, která jde do exportu.

| Část | Soubor |
|---|---|
| Seznam veřejných domén, `isBusinessEmail`, `isTestLead`, `normalizeEmail` | `src/lib/leadEmail.ts` |
| Značka kliknutí z adresy, cookie `rp_click` | `src/lib/clickId.ts` |
| `hashEmail`, `attributionFromCookies`, `isGoogleAdsLead`, řádky CSV, `checkBasicAuth` | `src/lib/googleAds.ts` (jen server) |
| `rp_click` v kategorii marketing | `src/lib/consent.ts` |
| Skupina `attribution` (jen pro čtení), virtuální pole `businessEmail`, `testLead`, `googleAdsExport` | `src/collections/Leads.ts` |
| `site-settings.measurement.leadConversionName` | `src/globals/SiteSettings.ts` |
| Migrace `20261111_220539_leads_attribution` | `src/migrations/` |
| Uložení souhlasu a značky, vrácení otisku | `src/actions/submitLead.ts` |
| `set user_data` a `form_submit` po `generate_lead` | `src/lib/analytics.ts`, `src/components/LeadForm.tsx` |
| Značka v paměti stránky, zápis až po souhlasu | `src/components/consent/ConsentProvider.tsx` |
| Export `GET /api/google-ads/company-leads.csv` | `src/app/api/google-ads/company-leads.csv/route.ts` |
| Odstavec do Ochrany osobních údajů (text z kapitoly 15) | `src/seed/cookiePolicy.ts` |
| Proměnné prostředí, popis exportu | `.env.example`, `README.md` |

Migrace má u `measurement_lead_conversion_name` výchozí hodnotu `'Firemni poptavka (import)'` a `NOT NULL`. Řádek `UPDATE` z kapitoly 6.3 proto není potřeba. Existující poptávky dostanou `false` a prázdné značky.

Virtuální pole se v seznamu poptávek v administraci zobrazí. `defaultColumns` zůstaly podle architektury.

## Odchylky od architektury

1. **Tolerance hodin v `parseClickId`.** Kapitola 9.2 říká, že `at` v budoucnosti je neplatné. `at` ale zapisují hodiny prohlížeče a server ho kontroluje svými hodinami. Prohlížeč, kterému hodiny jdou o pár minut napřed, by značku ztratil. Kód proto přijme `at` nejvýš 1 hodinu v budoucnosti (`CLOCK_SKEW_MS`). Test to ověřuje (5 minut ano, 2 hodiny ne).
2. **`isBusinessEmail` odmítá i zjevně neplatnou adresu.** Například `@firma.cz`, `novak@` nebo `novak@firma` (doména bez tečky). Kapitola 9.1 uvádí jen prázdný e-mail a e-mail bez zavináče. Zod tyto adresy odmítne už ve formuláři, takže chování formuláře se nemění.
3. **Test „editor nezmění `attribution.gclid` přes REST“ (13.1, kritérium 13).** Test volá Local API s `user: editor` a `overrideAccess: false`. To je stejná kontrola přístupu jako u REST. Test nemusí spouštět server.
4. **E2E testy posílají vlastní `x-forwarded-for` pro každý test.** Formulář přijme 5 odeslání za hodinu z jedné adresy IP (limit v paměti serveru). Bez toho by celá sada narazila na limit. Kód aplikace se kvůli tomu nemění.

## Jak to ověřit

Místně: databáze `robopipe_26` (vlastník `robopipe_local`, TCP), server `next start` na portu 3926. `.env` musí mít `GOOGLE_ADS_EXPORT_USER` a `GOOGLE_ADS_EXPORT_PASSWORD`. E2E testy je čtou pro export.

```
npx pnpm payload migrate
npx pnpm seed
npx pnpm build && npx next start -p 3926
E2E_BASE_URL=http://localhost:3926 PLAYWRIGHT_CHROMIUM_PATH=".../Google Chrome" npx pnpm test:e2e tests/e2e/offlineConversions.e2e.spec.ts
```

`pnpm seed` běží v režimu vývoje a zapíše do `payload_migrations` řádek `dev` (batch -1). Další `payload migrate` se potom ptá na ztrátu dat. Na místní databázi ten řádek smažte a migraci spusťte znovu. Produkce to nemá.

Výsledky (11. 11. 2026):

| Kontrola | Výsledek |
|---|---|
| `tsc --noEmit` | 0 chyb |
| `pnpm lint` | 0 chyb, 2 starší varování (postcss.config.mjs, admin.e2e.spec.ts) |
| `pnpm test:int` | 29 souborů, 247 testů, vše prošlo. Nový `offlineConversions.int.spec.ts`: 30. `cookiePolicy.int.spec.ts`: 9 (2 nové) |
| `pnpm build` | prošel, route `ƒ /api/google-ads/company-leads.csv` |
| `pnpm test:e2e` | 149 prošlo, 2 selhaly, obě mimo #26. Nový `offlineConversions.e2e.spec.ts`: 14 z 14 |

Dvě selhání e2e jsou starší a nesouvisí s touto změnou:

1. `blogFeaturedCard … long unbroken title`: chyba L1 z `docs/specs/3-blog-card-self-account/test-report.md`.
2. `seo-stage2 … every internal link … answers 200`: článek z #6 je jen v produkční databázi.

### Ruční ověření na místní instanci se skutečným gtag.js

Skript v Playwright prošel formulář se skutečným `gtag.js` (bez blokování) a s testovacími ID `G-TEST000000` a `AW-000000000`. Zaznamenal každý požadavek na domény Googlu včetně těla.

| Scénář | `rp_click` | Poptávka (souhlas marketing, značka) | Firemní / zkušební / export | `user_data` | Čitelný e-mail na Google | V exportu |
|---|---|---|---|---|---|---|
| 1, firemní, `?gclid=TEST-…`, přijmout (cs) | ano | `true`, `TEST-…-cs` | ano / ne / ano | 1× | 0 požadavků | ano |
| 1, totéž (en) | ano | `true`, `TEST-…-en` | ano / ne / ano | 1× | 0 | ano |
| 2, gmail.com, přijmout | ano | `true`, `TEST-…-gm` | ne / ne / ne | 0 | 0 | ne |
| 3, firemní, odmítnout | ne | `false`, bez značky | ano / ne / ne | 0 | 0 | ne |
| 4, firemní, bez značky, přijmout | ne | `true`, bez značky | ano / ne / ano | 1× | 0 | ano, prázdný GCLID |
| zkušební, koala42.com | ano | `true`, značka | ano / ano / ne | 0 | 0 | ne |
| zkušební, jméno „TEST Zkouska“ | ano | `true`, značka | ano / ano / ne | 0 | 0 | ne |

Export bez přihlášení vrátil `401` s `WWW-Authenticate: Basic realm="google-ads-export"`. S přihlášením vrátil `200`, `text/csv; charset=utf-8`, hlavičku a 3 řádky (scénáře 1 cs, 1 en, 4).

Odstavec z kapitoly 15 prošel stejnou cestou jako na produkci: `pnpm seed:cookie-policy --remote=http://localhost:3926`. Náhled ukázal 2 změny („ad conversion paragraph after …“), ostré spuštění 2 změny, druhý náhled 0 změn. Vykreslený HTML `/cs/ochrana-osobnich-udaju` a `/en/privacy-policy` má odstavec hned za odstavcem o marketingu, bez hvězdiček a bez tučného nebo kurzivního písma.

Screenshoty (`screens/`, jen vymyšlená data):

- `admin-lead-detail.png`: detail poptávky ze scénáře 1. Boční panel ukazuje skupinu Attribution a pole Business Email, Test Lead, Google Ads Export. Pole jsou jen pro čtení.
- `admin-leads-list.png`: seznam poptávek se sloupci Business Email a Google Ads Export.
- `export-sample.png`: tělo exportu se třemi řádky.

## Známá omezení

- S testovacím `AW-000000000` `gtag.js` odešle `form_submit` na `googleads.g.doubleclick.net` a `www.google.com/ccm/collect`, ale otisk e-mailu k němu nepřipojí. Testovací ID nemá účet se zapnutými rozšířenými konverzemi. Že značka otisk opravdu posílá, ověří tester na produkci v Tag Assistant (kapitola 13.3).
- Značku z adresy čte `ConsentProvider` jen při prvním načtení stránky. Když návštěvník uvnitř webu přejde na adresu s novým `gclid` bez nového načtení, nová značka se neuloží. Reklama vždy vede na nové načtení, takže to v praxi nenastane.
- Pole `Clicked At` v administraci ukazuje křížek pro vymazání. Server změnu ignoruje (`access.update` skupiny je `false`). Test to ověřuje pro `gclid` a `consentMarketing`.
- Odvolání souhlasu po odeslání se k poptávce nedostane (kapitola 10).
- Obnovení stránky nebo přepnutí jazyka před volbou v liště značku ztratí (kapitola 3.4).

## Kroky na produkci po nasazení

Pořadí je důležité. Text v Ochraně osobních údajů musí být zveřejněný dřív, než Arthur nastaví plán v Google Ads.

1. Vygenerujte heslo: `openssl rand -base64 32`. Uložte jméno `google-ads` a heslo do Keychainu jako `robopipe-google-ads-export`.
2. V Coolify otevřete aplikaci, Environment Variables. Přidejte `GOOGLE_ADS_EXPORT_USER=google-ads` a `GOOGLE_ADS_EXPORT_PASSWORD=<heslo>`. Nezaškrtávejte „Build Variable“. Proměnné stačí za běhu.
3. Nasaďte kód. Migrace `20261111_220539_leads_attribution` se spustí s nasazením jako ostatní migrace.
4. Spusťte náhled textu: `SEED_REMOTE_EMAIL=… SEED_REMOTE_PASSWORD=… pnpm seed:cookie-policy --remote=https://robopipe.io --dry-run`. Čekejte `changed (2)` s „ad conversion paragraph after …“ pro cs a en.
5. Spusťte totéž bez `--dry-run`. Druhý náhled musí ukázat `changed (0)`.
6. Otevřete `/cs/ochrana-osobnich-udaju` a `/en/privacy-policy`. Odstavec je hned za odstavcem o marketingu.
7. Ověřte export: `curl -u "google-ads:<heslo>" https://robopipe.io/api/google-ads/company-leads.csv` vrátí řádek hlaviček. `curl` bez `-u` vrátí `401`.
8. V administraci otevřete Site settings, Measurement. Ověřte `Lead Conversion Name = Firemni poptavka (import)`.

## Kroky v Google Ads (Arthur, po krocích na produkci)

Kroky jsou z kapitoly 16 architektury. Neověřil jsem je v rozhraní Google Ads (vývojář nemá přístup do účtu). Popisky platí podle dokumentace Googlu k 11. 11. 2026 (N4).

### Účet

1. Google Ads, Admin, Account settings, Auto-tagging. Musí být zapnuté.
2. Goals, Conversions, Settings. U „Customer data terms“ zvolte View terms, zaškrtněte souhlas, zvolte Agree. Stav je „Accepted“.
3. Na stejné stránce rozbalte „Enhanced conversions“ a zapněte je. Když rozhraní nabízí způsob, zvolte „Google tag“. Když nabízí způsob sběru dat, zvolte „Code“. Uložte.
4. Otevřete Google tag settings (`ads.google.com/aw/tagsettings`) pro tag `AW-…`. V „Manage automatic event detection“ zapněte „Form interactions“.

### Nová konverzní akce

1. Goals, Summary, „+ New conversion action“ (nebo „+ Create conversion action“).
2. Zvolte Import, potom „CRMs, files, or other data sources“, potom „Track conversions from clicks“.
3. U Data source zvolte „Connect a new data source“ a vyhledejte HTTPS. Přijměte zásady pro zákaznická data. Continue.
4. Cíl konverze (Conversion goal): „Qualified lead“. Set up.
5. Údaje zdroje: URL `https://robopipe.io/api/google-ads/company-leads.csv`, Username `google-ads`, Password z Keychainu (`robopipe-google-ads-export`). Next.
6. Namapujte pole podle tabulky níže. Když rozhraní nabízí Event source, nastavte pro všechny řádky „Web“.
7. Název připojení: `robopipe.io company leads`. V Connection details nastavte plán „Daily“, když je na výběr. Finish.
8. Nastavení akce:
   - Název: `Firemni poptavka (import)`. Přesně, stejná velká písmena, bez diakritiky.
   - Value: „Don't use a value“.
   - Count: „One“.
   - Click-through conversion window: 90 days.
   - Attribution: Data-driven.
   - Action optimization: Primary action.
9. Save and continue. Když průvodce nabídne „Turn on enhanced conversions for leads“, zaškrtněte.
10. Prvních 4 až 6 hodin výsledky nečekejte.

Když Data Manager zdroj HTTPS odmítne (neověřené N1, HTTP Basic), platí záloha z kapitoly 14 architektury (Google tabulka). Kód webu se tím nemění.

### Mapování sloupců

| Sloupec v souboru | Pole v Google Ads |
|---|---|
| `Order ID` | Order ID |
| `Conversion Name` | Conversion action, případně filtr „Conversion Name equals Firemni poptavka (import)“ |
| `Conversion Time` | Conversion date and time. Transformace „Convert date and time“ zůstane zapnutá. Záložní pásmo není potřeba (čas má `Z`). |
| `Google Click ID` | GCLID |
| `GBRAID` | GBRAID |
| `WBRAID` | WBRAID |
| `Email` | Email address (data už jsou zahashovaná) |
| `Ad User Data` | Pole souhlasu „Ad user data“, když existuje (N2). Jinak nemapovat. |

### Starou konverzi na sekundární

1. Goals, Summary. Otevřete akci `robopipe.io (web) generate_lead`.
2. Edit settings. Action optimization: Secondary action. Save.
3. V Goals, Summary ověřte, že cíl „Qualified lead“ je ve výchozích cílech účtu (Account-default).

### Kontrola

1. Po prvním běhu otevřete Goals, Conversions, Uploads (nebo Tools, Data manager, připojení `robopipe.io company leads`). Stav běhu je bez chyby formátu.
2. Odešlete zkušební poptávku se souhlasem, s firemní doménou a se jménem bez „TEST“. V Tag Assistant ověřte `form_submit` s uživatelskými daty. Poptávku potom smažte.
3. Za 24 až 48 hodin je v Diagnostics akce `Firemni poptavka (import)` přijatý řádek.

## Kolo 2

Opravy chyb B1 až B5 ze zprávy testera (`test-report.md`, kapitola „Chyby“).

### Co se změnilo

- B1: `VALID_ID` v `src/lib/clickId.ts` povolí jen `A-Z`, `a-z`, `0-9`, `_` a `-`, délku 1 až 512 znaků. Bajt NUL, kontrolní znaky, znaky vzorce, apostrof a znaky mimo ASCII značka nemá. Nová funkce `createLeadWithAttribution` v `src/lib/leadStore.ts` uloží poptávku s atribucí. Když databáze uložení odmítne, uloží poptávku znovu bez atribuce a zapíše varování do logu. `submitLead` ji používá.
- B1: o otisku pro značku Google rozhoduje uložená poptávka (`isGoogleAdsLead(stored)`). Značka a export proto vždy souhlasí. Poptávka uložená bez atribuce nemá souhlas s marketingem, takže otisk nedostane.
- B2: `toCsv` dá apostrof před buňku, která začíná `=`, `+`, `-`, `@`, tabulátorem nebo `\r`. Order ID (`lead-…`), čas, otisk (hex) a skutečné značky Google začínají písmenem nebo číslicí, takže je ochrana nemění. Ověřeno na exportu z místní databáze: žádná buňka nezačíná těmito znaky, řádky jsou stejné jako v kole 1.
- B3: `parseClickId` vrátí `at` jako `new Date(landed).toISOString()`.
- B4: nové znění `AD_CONVERSION_PARAGRAPH` (níže). `seed:cookie-policy` nahradí starší verzi odstavce na stejném místě. Starší verzi pozná podle prvních slov. Bez této změny by stránka s textem z kola 1 dostala druhý odstavec.
- B5: `FREE_EMAIL_DOMAINS` má domény z B5 a další veřejné služby: národní varianty Outlook, Hotmail, Live, Yahoo a GMX, `t-online.de`, `freenet.de`, `posteo.de`, `mailbox.org`, české a slovenské služby, Proton, Tuta, Zoho, Fastmail, polské a ruské služby (`mail.ru`, `yandex.ru` a další). Seznam je dál jen v `src/lib/leadEmail.ts`.
- Testy: nové `round 2 (B1, B2, B5)` a `createLeadWithAttribution (criterion 11, B1)` v `tests/int/offlineConversions.int.spec.ts`. Druhý test uloží značku s bajtem NUL přímo přes funkci, kterou Postgres odmítne, a ověří, že poptávka je v databázi bez atribuce. Nový test náhrady odstavce v `tests/int/cookiePolicy.int.spec.ts`. Testy testera jsou beze změny.

### Text B4 ke schválení (Filip)

Odstavec jde hned za odstavec o marketingu. Text je bez hvězdiček.

**cs**

Když přijdete z naší reklamy Google Ads a dáte souhlas s marketingem, uložíme značku kliknutí do cookie rp_click na 90 dní. Když odešlete poptávku z firemní e-mailové adresy a máte souhlas s marketingem, předáme Googlu otisk e-mailu (SHA-256), čas odeslání a značku kliknutí, pokud ji máme. To platí i tehdy, když jste na web nepřišli z reklamy. Značku kliknutí a vaši volbu cookies uložíme také k poptávce. Google z těchto údajů zjistí, která reklama poptávku přinesla. Čitelný e-mail Googlu nepředáváme. Bez souhlasu s marketingem nepředáme nic.

**en**

When you come from our Google Ads ad and consent to marketing, we store the click ID in the cookie rp_click for 90 days. When you send an inquiry from a company email address and you consent to marketing, we give Google a hash of the email (SHA-256), the time you sent it and the click ID, if we have it. This also applies when you did not come from an ad. We also store the click ID and your cookie choice with the inquiry. Google uses this data to find out which ad brought the inquiry. We never give Google the readable email. Without consent to marketing, we give Google nothing.

Text musí být na produkci dřív, než Arthur nastaví plán v Google Ads.

### Odchylky

1. Délka značky zůstává 1 až 512 znaků jako v architektuře. Testy kola 1 tuto mez ověřují.
2. Ochrana v `toCsv` má navíc `-` (OWASP), tester ho v B2 neuvedl. Značka Google, která by začínala `-`, by dostala apostrof a nespárovala by se. Skutečné značky začínají písmenem nebo číslicí (`Cj0K…`, `EAIa…`, `0AAA…`), proto je riziko malé.
3. Záložní uložení ukládá poptávku bez celé skupiny `attribution`, i bez stavu souhlasu. Chybu může způsobit kterékoli pole skupiny, proto kód neukládá žádné.
4. Odstavec B4 přidává větu „To platí i tehdy, když jste na web nepřišli z reklamy.“ Ta výslovně pokrývá scénář 4. Architektura (kapitola 15) má stále text z kola 1. Platí text v `src/seed/cookiePolicy.ts`.

### Výsledky kontrol

| Kontrola | Výsledek |
| --- | --- |
| `tsc --noEmit` | 0 chyb |
| `pnpm lint` | 0 chyb, 2 starší varování |
| `pnpm test:int` | 29 souborů, 256 testů prošlo, z toho B1 až B3 testera |
| `pnpm build` | prošel |
| `pnpm test:e2e` | 150 prošlo, 2 starší selhání (`blogFeaturedCard … long unbroken title`, `seo-stage2 … answers 200`). `offlineConversions.e2e.spec.ts` včetně testu B1 prošel celý |
| `seed:cookie-policy` místně | náhled 2 změny („replaced with the current text“), ostré spuštění 2 změny, druhý náhled 0 změn. Vykreslené stránky cs a en mají nový text |

### Co nešlo ověřit

Body 1 až 6 z kapitoly „Co místně nešlo ověřit“ ve zprávě testera platí dál. Znění B4 čeká na schválení.
