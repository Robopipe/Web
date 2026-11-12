# Architektura: offline konverze firemních poptávek (issue #26)

Zadání: [`product.md`](./product.md). Navazuje na [`../21-google-measurement/architecture.md`](../21-google-measurement/architecture.md).

Dokument říká, kam patří každá změna a jak ji ověřit. Vývojář podle něj implementuje bez dalších otázek. Otázky pro Filipa jsou v kapitole 17. Plán počítá s doporučenou odpovědí.

## 1. Zjištění v dokumentaci Googlu (11. 11. 2026)

| # | Zjištění | Zdroj |
|---|---|---|
| G1 | Od dubna 2026 mají rozšířené konverze pro web a pro zájemce jedno společné nastavení v účtu. | [support 16884284](https://support.google.com/google-ads/answer/16884284), uvedeno v [support 11021502](https://support.google.com/google-ads/answer/11021502) |
| G2 | Import konverzí z kliknutí a rozšířené konverze pro zájemce jdou přes Google Ads Data Manager. Starý formát souboru (řádek `Parameters:TimeZone`) pro rozšířené konverze pro zájemce už neplatí. | [support 7014069](https://support.google.com/google-ads/answer/7014069) |
| G3 | Data Manager umí zdroj HTTPS. Potřebuje adresu souboru, uživatelské jméno a heslo. Adresa má tvar `https://[ip\|doména]/cesta/soubor.[csv\|tsv]`. Google doporučuje povolit 27 rozsahů IP adres Data Manageru ve firewallu. | [Data Manager 14605515](https://support.google.com/google-ads-data-manager/answer/14605515) |
| G4 | Pro zdroje GCS, S3, HTTP, SFTP a Google tabulky importuje Data Manager při každém běhu konverze za posledních 90 dní. | [support 11021502](https://support.google.com/google-ads/answer/11021502), [Data Manager 14184381](https://support.google.com/google-ads-data-manager/answer/14184381) |
| G5 | Soubor: první řádek jsou hlavičky. Soubor musí mít příponu. Hlavička začíná písmenem nebo podtržítkem. Navíc přidané sloupce jsou povolené a slouží k filtru. Pole se k cílovým polím Google přiřadí ručně při nastavení. | [Data Manager 14184381](https://support.google.com/google-ads-data-manager/answer/14184381), [14605515](https://support.google.com/google-ads-data-manager/answer/14605515) |
| G6 | Pole pro import: Conversion action (jen filtr), GCLID, GBRAID, WBRAID, Email address, Phone number, Conversion date and time (povinné), Order ID, Conversion value, Event source. GCLID je u rozšířených konverzí pro zájemce volitelný, když značka Google sbírá uživatelská data. Jinak je povinný. | [Data Manager 14184381](https://support.google.com/google-ads-data-manager/answer/14184381) |
| G7 | Čas konverze: Data Manager přijme mimo jiné `2012-08-15T00:01:54Z` (UTC, ISO 8601). Řádek bez časového pásma bez nastaveného záložního pásma se neimportuje. | [Data Manager 14184381](https://support.google.com/google-ads-data-manager/answer/14184381) |
| G8 | Normalizace e-mailu před SHA-256: oříznout mezery, převést na malá písmena, u `gmail.com` a `googlemail.com` odstranit tečky před `@`. Hash je hex SHA-256. Data Manager pozná zahashovaná data sám. | [Data Manager 14184381](https://support.google.com/google-ads-data-manager/answer/14184381), [support 11021502](https://support.google.com/google-ads/answer/11021502) |
| G9 | Google Ads nezapočítá stejnou konverzi dvakrát. Rozhoduje název konverzní akce, čas konverze a identifikátor. Order ID pomáhá s duplicitami. | [support 7014069](https://support.google.com/google-ads/answer/7014069), [support 6386790](https://support.google.com/google-ads/answer/6386790) |
| G10 | Značka Google: `gtag('set', 'user_data', {...})`, potom `gtag('event', 'form_submit', { send_to: 'AW-…' })`. Klíč `sha256_email_address` přijme hash, který jsme spočítali sami. | [support 11021502](https://support.google.com/google-ads/answer/11021502), oddíl „Set up enhanced conversions for leads by editing your website code“ |
| G11 | Consent mode v2: při `ad_user_data: denied` značka neposílá zahashovaná první strany data pro rozšířené konverze. | [developers: consent mode](https://developers.google.com/tag-platform/security/concepts/consent-mode) |
| G12 | Rozšířené konverze pro zájemce porovnávají otisk z importu s otiskem, který poslala značka z formuláře, a s přihlášenými účty Google, které viděly nebo klikly na reklamu. Značka sbírá GCLID sama. Google přesto doporučuje GCLID importovat. | [support 15713840](https://support.google.com/google-ads/answer/15713840), [support 11021502](https://support.google.com/google-ads/answer/11021502) |
| G13 | Rozšířené konverze pro zájemce potřebují přijaté podmínky pro zákaznická data, zapnuté automatické značkování a model atribuce Google (ne externí). | [support 11021502](https://support.google.com/google-ads/answer/11021502), [support 7014069](https://support.google.com/google-ads/answer/7014069) |
| G14 | Zpracování importu trvá 24 až 48 hodin. Po vytvoření nové konverzní akce počkat 4 až 6 hodin před prvním nahráním. | [support 7014069](https://support.google.com/google-ads/answer/7014069) |
| G15 | Google pro zájemce doporučuje cíl konverze „Qualified lead“ nebo „Converted lead“. | [support 11021502](https://support.google.com/google-ads/answer/11021502) |

### 1.1 Neověřeno

| # | Tvrzení | Jak ověřit |
|---|---|---|
| N1 | Data Manager posílá jméno a heslo jako HTTP Basic. Dokumentace říká jen „username and password“. | Arthur při nastavení zdroje HTTPS. Data Manager zdroj otestuje. Když selže, platí kapitola 14 (Google tabulka). |
| N2 | Mapování v Data Manageru nabízí pole pro souhlas (`Ad User Data`). Starý formát ho měl. Dokumentace Data Manageru ho v seznamu polí neuvádí. | Arthur při mapování. Když pole chybí, sloupec zůstane jen pro filtr. |
| N3 | Okno, do kdy jde poptávku bez GCLID přiřadit podle otisku e-mailu. | Nenašel jsem v dokumentaci Googlu. |
| N4 | Přesné popisky tlačítek v Google Ads. Google rozhraní mění, dubnové sloučení nastavení (G1) popisky posunulo. | Arthur. Kapitola 16 uvádí popisky podle dokumentace z 11. 11. 2026. |
| N5 | Jestli GA4 zahodí `user_data` u událostí po `set`, když je ve vlastnosti GA4 vypnutý „user-provided data collection“. | Kapitola 7.3 pořadí událostí riziko zmenšuje. |
| N6 | Frekvence plánu v Data Manageru (denně, po hodinách). | Arthur při nastavení zdroje. |

## 2. Odpověď na scénář 4

Ano, poptávka bez značky kliknutí jde do exportu, když má firemní e-mail a souhlas s marketingem. Data Manager u rozšířených konverzí pro zájemce GCLID nevyžaduje, když značka Google sbírá uživatelská data (G6). Značka při odeslání formuláře pošle otisk e-mailu a sama připojí kliknutí, které zná (G12). Google pak řádek z exportu přiřadí podle stejného otisku.

Když návštěvník na reklamu nikdy neklikl, Google řádek nepřiřadí a konverzi nezapočítá. To je správně. Řádek bez shody v účtu nevadí. Google ho ukáže v diagnostice jako nespárovaný.

## 3. Rozpory s product.md a návrh

### 3.1 „Do 24 hodin“ (scénář 1)

Web dá řádek do exportu hned po odeslání. Data Manager ho stáhne při nejbližším běhu (denně). Zpracování v Google Ads trvá dalších 24 až 48 hodin (G14). Návrh: kritérium úspěchu je „řádek je v exportu hned. V Google Ads je konverze nejpozději za 3 dny.“

### 3.2 Otisk e-mailu jen u poptávek, které jdou do exportu (kritérium 3)

Kritérium 3 říká: se souhlasem pošle web e-mail při každém odeslání. Otisk ale Google potřebuje jen u řádků v exportu. U gmail.com nebo u zkušební poptávky by otisk odešel zbytečně. Návrh: web pošle otisk jen tehdy, když poptávka splní pravidlo exportu (kapitola 6.3). Jedna funkce rozhoduje o obou. Méně osobních dat odchází a výsledek v Google Ads je stejný. Otázka 17.1.

### 3.3 Server čte `rp_consent` (změna R2 z #21)

#21 R2 říká „Server ji nikdy nečte“. Důvod byl statické vykreslení stránek. Server action `submitLead` nevykresluje stránku. Přečte cookie `rp_consent` a `rp_click` jen při odeslání formuláře. Stránky zůstanou statické. Zdroj pravdy pro volbu zůstává jeden: cookie `rp_consent`. Server používá stejnou funkci `parseConsent`.

### 3.4 Značka kliknutí před souhlasem

Kritérium 2 říká „bez souhlasu ji web nikam neukládá“. Web si značku z adresy drží jen v paměti stránky (proměnná v Reactu). Do cookie ji zapíše až po souhlasu s marketingem. Paměť stránky není uložení do zařízení. Když návštěvník před volbou obnoví stránku nebo přepne jazyk, značku web ztratí. Je to přijatelná ztráta.

## 4. Hlavní rozhodnutí

| # | Rozhodnutí | Důvod |
|---|---|---|
| D1 | Zdroj plánovaného nahrání je soubor CSV přes HTTPS s přihlášením z webu: `https://robopipe.io/api/google-ads/company-leads.csv`. Data Manager ho stahuje denně. | Data Manager zdroj HTTPS podporuje (G3). Žádný nový přístup k API Googlu, žádný účet služby, žádná tabulka mimo web. Zdroj pravdy je databáze. |
| D2 | Jedno pravidlo `isGoogleAdsLead(lead)` rozhoduje: řádek v exportu, otisk do značky Google, pole v administraci. | Tři místa, jedna funkce. Nemohou se rozejít. |
| D3 | `isBusinessEmail` a seznam domén jsou v `src/lib/leadEmail.ts`. Nic jiného seznam domén nemá. | Kritérium 4. |
| D4 | „Firemní“, „zkušební“ a „v exportu“ jsou virtuální pole Payload (počítaná při čtení), ne sloupce v databázi. | Změna seznamu domén platí hned i pro staré poptávky. Žádný druhý zdroj pravdy, žádná migrace dat. |
| D5 | Značka kliknutí se ukládá do vlastní cookie `rp_click`, ne čtením cookie Googlu `_gcl_aw`. | Formát cookie Googlu není veřejné rozhraní. Vlastní cookie má známý formát a stejnou kategorii souhlasu. |
| D6 | Souhlas při odeslání čte server z cookie `rp_consent` přes existující `parseConsent`. Formulář nedostane žádné skryté pole. | Jeden parser, jedna cookie. Klient nic nového neposílá. |
| D7 | Server spočítá otisk e-mailu a vrátí ho formuláři ve stavu akce. Klient ho jen předá značce. | Normalizace a hash existují jen jednou, na serveru (`node:crypto`). Klient nepotřebuje `crypto.subtle`. |
| D8 | Čas konverze je `createdAt` poptávky v UTC ve tvaru `YYYY-MM-DDTHH:mm:ssZ`. | Podporovaný formát (G7). Bez letního času a bez záložního pásma. |
| D9 | Order ID je `lead-<id>`. Export vždy obsahuje posledních 90 dní. | Data Manager stahuje 90 dní při každém běhu (G4). Stabilní Order ID a stejný čas brání dvojímu započtení (G9, kritérium 8). |
| D10 | Název konverzní akce je pole `site-settings.measurement.leadConversionName`. | Kritérium 9. Stejné místo jako ID měření z #21 (R1). |
| D11 | Přihlášení exportu je HTTP Basic. Jméno a heslo jsou v proměnných prostředí `GOOGLE_ADS_EXPORT_USER` a `GOOGLE_ADS_EXPORT_PASSWORD`. Jen za běhu, ne při sestavení. | Kritérium 7. Stejný vzor jako `CRON_SECRET`. Žádná změna Dockerfile. |

## 5. Dotčené soubory

| Soubor | Změna |
|---|---|
| `src/lib/leadEmail.ts` (nový) | `FREE_EMAIL_DOMAINS`, `TEST_EMAIL_DOMAINS`, `emailDomain`, `normalizeEmail`, `isBusinessEmail`, `isTestLead`. Čisté funkce bez Node a bez DOM. |
| `src/lib/clickId.ts` (nový) | `CLICK_COOKIE`, `CLICK_MAX_AGE_SECONDS`, typ `ClickId`, `clickIdFromSearch`, `serializeClickId`, `parseClickId`, `persistClickId`. |
| `src/lib/googleAds.ts` (nový, jen server) | `hashEmail`, `attributionFromCookies`, `isGoogleAdsLead`, `EXPORT_WINDOW_DAYS`, `EXPORT_COLUMNS`, `toExportRow`, `toCsv`, `checkBasicAuth`. |
| `src/app/api/google-ads/company-leads.csv/route.ts` (nový) | `GET` vrací export. |
| `src/collections/Leads.ts` | Skupina `attribution`, virtuální pole `businessEmail`, `testLead`, `googleAdsExport`. |
| `src/globals/SiteSettings.ts` | Pole `leadConversionName` ve skupině `measurement`. |
| `src/migrations/<datum>_leads_attribution.ts` + `.json`, `src/migrations/index.ts` | Generovaná migrace. |
| `src/payload-types.ts` | Přegenerovat (`pnpm generate:types`). |
| `src/actions/submitLead.ts` | Číst cookies, uložit `attribution`, vrátit `adsUserData`. |
| `src/components/LeadForm.tsx` | Po `generate_lead` zavolat `sendAdsUserData`. |
| `src/lib/analytics.ts` | Zapamatovat ID `AW-…`. Nová funkce `sendAdsUserData`. |
| `src/lib/consent.ts` | `GOOGLE_COOKIES.marketing` zahrne `rp_click`. |
| `src/components/consent/ConsentProvider.tsx` | Přečíst značku z adresy do `useRef`. Po souhlasu s marketingem ji zapsat. |
| `src/seed/cookiePolicy.ts` | Odstavec `AD_CONVERSION_PARAGRAPH` (cs, en) a jeho vložení do existující stránky. |
| `.env.example`, `README.md` | Dvě nové proměnné. Řádek v tabulce proměnných (`README.md:126`). Popis exportu. |
| `tests/int/offlineConversions.int.spec.ts` (nový), `tests/e2e/offlineConversions.e2e.spec.ts` (nový) | Testy z kapitoly 13. |
| `tests/int/cookiePolicy.int.spec.ts` | Případy pro nový odstavec. |
| `docs/specs/26-offline-conversions/implementation.md` (nový) | Kritérium 15. Kroky na produkci a kroky v Google Ads převzít z kapitoly 16. |

## 6. Datový model a migrace

### 6.1 Kolekce `leads`

Za pole `sourcePage` přidat:

```ts
{
  name: 'attribution',
  type: 'group',
  admin: {
    position: 'sidebar',
    description: 'Ad click and cookie consent at the time of submission. Set by the form, read-only.',
  },
  access: { create: () => false, update: () => false }, // Local API with overrideAccess still writes.
  fields: [
    { name: 'consentAnalytics', type: 'checkbox', defaultValue: false, admin: { readOnly: true } },
    { name: 'consentMarketing', type: 'checkbox', defaultValue: false, admin: { readOnly: true } },
    { name: 'gclid', type: 'text', admin: { readOnly: true } },
    { name: 'gbraid', type: 'text', admin: { readOnly: true } },
    { name: 'wbraid', type: 'text', admin: { readOnly: true } },
    { name: 'clickedAt', type: 'date', admin: { readOnly: true, date: { pickerAppearance: 'dayAndTime' } } },
  ],
},
{
  name: 'businessEmail',
  type: 'checkbox',
  virtual: true,
  admin: { readOnly: true, position: 'sidebar', description: 'Email domain is not a public mail service.' },
  hooks: { afterRead: [({ data }) => isBusinessEmail(data?.email ?? '')] },
},
{
  name: 'testLead',
  type: 'checkbox',
  virtual: true,
  admin: { readOnly: true, position: 'sidebar', description: 'koala42.com, robopipe.io or a name that starts with TEST.' },
  hooks: { afterRead: [({ data }) => isTestLead({ email: data?.email ?? '', name: data?.name ?? '' })] },
},
{
  name: 'googleAdsExport',
  type: 'checkbox',
  virtual: true,
  admin: { readOnly: true, position: 'sidebar', description: 'Goes to Google Ads as a company lead (last 90 days only).' },
  hooks: { afterRead: [({ data }) => (data ? isGoogleAdsLead(data) : false)] },
},
```

`defaultColumns`: `['name', 'email', 'company', 'businessEmail', 'googleAdsExport', 'status', 'createdAt']`.

Payload 3.86 má `virtual?: boolean | string` v typu pole (ověřeno v `node_modules/payload/dist/fields/config/types.d.ts:351`). Virtuální pole nemají sloupec. Když je seznam v administraci neukáže, vývojář je ze `defaultColumns` odebere a zapíše to do `implementation.md`. Detail poptávky je ukáže vždy (kritérium 13).

Jedna poptávka má nejvýš jednu ze tří značek. Tři pole odpovídají třem sloupcům exportu a kritériu 1.

### 6.2 Globál `site-settings`

Do skupiny `measurement` za `googleAdsId`:

```ts
{
  name: 'leadConversionName',
  type: 'text',
  required: true,
  defaultValue: 'Firemni poptavka (import)',
  admin: {
    description:
      'Exact name of the Google Ads conversion action for company leads. Goes to the "Conversion Name" column of /api/google-ads/company-leads.csv.',
  },
},
```

Název je bez diakritiky. Jméno se tak nerozbije v žádném kroku mezi souborem a Google Ads.

### 6.3 Migrace

`pnpm payload migrate:create leads_attribution`, potom `pnpm payload migrate`. Migrace přidá do `leads` sloupce `attribution_consent_analytics` a `attribution_consent_marketing` (`boolean`, výchozí `false`), `attribution_gclid`, `attribution_gbraid`, `attribution_wbraid` (`varchar`), `attribution_clicked_at` (`timestamp(3) with time zone`). Do `site_settings` přidá `measurement_lead_conversion_name` (`varchar`).

Vývojář zkontroluje SQL. Když `ADD COLUMN` pro `measurement_lead_conversion_name` nemá `DEFAULT 'Firemni poptavka (import)'`, přidá do `up` řádek `UPDATE site_settings SET measurement_lead_conversion_name = 'Firemni poptavka (import)' WHERE measurement_lead_conversion_name IS NULL`. Existující poptávky dostanou `false` a prázdné značky. Do exportu nejdou (mimo rozsah, product.md).

## 7. Tok dat

### 7.1 Vstup na web

1. Návštěvník přijde na `/cs?gclid=Cj0K…`.
2. `ConsentProvider` (jen když existuje ID měření) v prvním `useEffect` zavolá `clickIdFromSearch(location.search)`. Výsledek uloží do `useRef` `pendingClick`. Nic nezapisuje.
3. Když už existuje volba s `marketing: true`, hned zavolá `persistClickId(pendingClick.current)` a ref vyprázdní.
4. Jinak čeká. V `apply(next)` (volá ji `save` i zpráva z jiné karty) po `updateGoogleConsent`: když `next.marketing` a ref není prázdný, zavolá `persistClickId` a ref vyprázdní.
5. Když `next.marketing` je `false`, `clearGoogleCookies('marketing')` smaže i `rp_click`. Ref zůstane, takže pozdější souhlas ve stejné návštěvě značku ještě zapíše.

`ConsentProvider` je v layoutu `[locale]`. Navigace přes `next/link` ho neodpojí, takže ref přežije přechod mezi stránkami (kritérium 2).

### 7.2 Odeslání formuláře

`submitLead` po validaci a po kontrole limitu:

1. `const store = await cookies()` z `next/headers`.
2. `attribution = attributionFromCookies((name) => store.get(name)?.value, new Date())` v `try`. Při výjimce `attribution = { consentAnalytics: false, consentMarketing: false }` a `payload.logger.warn`. Chyba měření nikdy nezastaví uložení (kritérium 11).
3. `payload.create({ collection: 'leads', data: { ...lead, attribution }, … })`. Stávající volání, jen s novým polem.
4. Po vytvoření: `adsUserData = isGoogleAdsLead({ ...lead, attribution }) ? { sha256_email_address: hashEmail(lead.email) } : undefined`, v `try`.
5. Vrátí `{ status: 'success', adsUserData }`. E-mail obchodu beze změny.

Next.js `cookies()` vrací hodnotu už dekódovanou (`decodeURIComponent` v `next/dist/compiled/@edge-runtime/cookies`). `parseConsent` dostane JSON přímo.

`LeadFormState` dostane volitelné pole `adsUserData?: { sha256_email_address: string }`. Ostatní návratové hodnoty se nemění. Past na roboty `adsUserData` nevrací.

### 7.3 Značka Google v prohlížeči

V `LeadForm` ve stávajícím `useEffect` pro `generate_lead`, po `trackEvent('generate_lead', …)`:

```ts
if (state.adsUserData) sendAdsUserData(state.adsUserData)
```

`src/lib/analytics.ts`:

```ts
let adsTagId: string | null = null // set in initGoogleTag from adsId

/** Enhanced conversions for leads (issue #26). Consent mode drops the data without ad_user_data. */
export function sendAdsUserData(userData: { sha256_email_address: string }): void {
  if (!window.gtag || !adsTagId) return
  try {
    window.gtag('set', 'user_data', userData)
    window.gtag('event', 'form_submit', { send_to: adsTagId })
  } catch {
    // Measurement never breaks the form.
  }
}
```

Pořadí: `generate_lead` jde dřív než `set user_data`. GA4 tak `generate_lead` dostane bez uživatelských dat (N5). Událost `form_submit` míří jen na `AW-…` (`send_to`). V Google Ads pro ni neexistuje konverzní akce, takže nic nepočítá. Slouží jen jako nosič otisku (G10).

Čitelný e-mail neodchází nikam. Server vrací jen hex SHA-256 a ten jde jen do `user_data` (kritérium 3).

### 7.4 Export

`GET /api/google-ads/company-leads.csv`:

1. `checkBasicAuth(request.headers.get('authorization'), process.env.GOOGLE_ADS_EXPORT_USER, process.env.GOOGLE_ADS_EXPORT_PASSWORD)`. Když proměnná chybí nebo údaje nesedí: `401`, hlavička `WWW-Authenticate: Basic realm="google-ads-export", charset="UTF-8"`, tělo `Unauthorized`. Porovnání přes `timingSafeEqual` na SHA-256 obou stran.
2. `settings = payload.findGlobal({ slug: 'site-settings', depth: 0 })`. Když `measurement.leadConversionName` je prázdné: `500`, tělo `Conversion name missing in site-settings.measurement`. Google Ads chybu ukáže, místo aby tiše importoval špatný název.
3. `payload.find({ collection: 'leads', where: { and: [{ createdAt: { greater_than_equal: <teď − 90 dní> } }, { 'attribution.consentMarketing': { equals: true } }] }, pagination: false, depth: 0, sort: 'createdAt', overrideAccess: true })`.
4. `rows = docs.filter(isGoogleAdsLead).map((lead) => toExportRow(lead, name))`.
5. `200`, `Content-Type: text/csv; charset=utf-8`, `Cache-Control: no-store`, tělo `toCsv(rows)`.
6. `payload.logger.info({ msg: 'Google Ads export', rows: rows.length })`. Žádné e-maily ani otisky v logu.

Soubor route má `export const dynamic = 'force-dynamic'`. Složka s tečkou má precedens v `src/app/llms.txt/route.ts`. Statická cesta má přednost před `src/app/(payload)/api/[...slug]`, stejně jako `src/app/api/cron/run-jobs`. Matcher v `src/proxy.ts` cestu `api` vynechá.

## 8. API kontrakt exportu

| Vlastnost | Hodnota |
|---|---|
| Metoda a cesta | `GET https://robopipe.io/api/google-ads/company-leads.csv` |
| Přihlášení | HTTP Basic. `GOOGLE_ADS_EXPORT_USER`, `GOOGLE_ADS_EXPORT_PASSWORD`. Heslo nejméně 32 náhodných znaků (`openssl rand -base64 32`). |
| Bez přihlášení | `401` + `WWW-Authenticate` |
| Proměnné prostředí | Jen za běhu. Coolify: Environment Variables, ne Build Variables. V Keychainu jako `robopipe-google-ads-export`. |
| Kódování | UTF-8 bez BOM, řádky `\n`, oddělovač čárka |
| Uvozovky | Pole s čárkou, uvozovkou nebo koncem řádku jsou v `"…"`. Uvozovka uvnitř je `""`. |
| Okno | Poptávky vytvořené za posledních 90 dní, řazené od nejstarší |
| Prázdný export | `200`, jen řádek hlaviček |

Sloupce (`EXPORT_COLUMNS`, pořadí pevné):

| Sloupec | Obsah | Pole v Data Manageru |
|---|---|---|
| `Order ID` | `lead-<id>` | Order ID |
| `Conversion Name` | `site-settings.measurement.leadConversionName` | Conversion action (filtr) |
| `Conversion Time` | `createdAt` v UTC, `YYYY-MM-DDTHH:mm:ssZ` | Conversion date and time |
| `Google Click ID` | `attribution.gclid` nebo prázdné | GCLID |
| `GBRAID` | `attribution.gbraid` nebo prázdné | GBRAID |
| `WBRAID` | `attribution.wbraid` nebo prázdné | WBRAID |
| `Email` | `hashEmail(email)`, 64 znaků hex | Email address |
| `Ad User Data` | vždy `Granted` | pole souhlasu, když existuje (N2) |

Příklad (otisk je skutečný SHA-256 pro `novak@firma.cz`):

```csv
Order ID,Conversion Name,Conversion Time,Google Click ID,GBRAID,WBRAID,Email,Ad User Data
lead-412,Firemni poptavka (import),2026-11-12T09:14:03Z,Cj0KCQiA5rGuBhCnARIsAN11vgQ_example,,,0193ede04c0598c7eda49eabe318a1aa481ea93f2093691e807950a59f04d5d0,Granted
lead-415,Firemni poptavka (import),2026-11-12T13:40:51Z,,,,0193ede04c0598c7eda49eabe318a1aa481ea93f2093691e807950a59f04d5d0,Granted
```

Řádek 2 je scénář 4 (bez značky kliknutí).

## 9. Pravidla v kódu

### 9.1 `src/lib/leadEmail.ts`

```ts
/** Public mail services. Everything else is a company email. The only list (issue #26). */
export const FREE_EMAIL_DOMAINS: ReadonlySet<string> = new Set([
  // cz, sk
  'seznam.cz', 'email.cz', 'post.cz', 'spoluzaci.cz', 'centrum.cz', 'atlas.cz', 'volny.cz',
  'tiscali.cz', 'quick.cz', 'azet.sk', 'centrum.sk', 'zoznam.sk', 'pobox.sk',
  // global
  'gmail.com', 'googlemail.com', 'outlook.com', 'outlook.cz', 'hotmail.com', 'live.com', 'msn.com',
  'yahoo.com', 'ymail.com', 'icloud.com', 'me.com', 'mac.com', 'aol.com',
  'proton.me', 'protonmail.com', 'pm.me', 'gmx.com', 'gmx.net', 'gmx.de', 'web.de', 'mail.com',
])

export const TEST_EMAIL_DOMAINS: ReadonlySet<string> = new Set(['koala42.com', 'robopipe.io'])

/** Trim, lowercase, and drop dots before @ for gmail.com and googlemail.com (Google's rule). */
export const normalizeEmail = (email: string): string

/** Part after the last @ of the normalized email, '' when there is none. */
export const emailDomain = (email: string): string

/** `false` for an empty or invalid email and for every domain in FREE_EMAIL_DOMAINS. */
export const isBusinessEmail = (email: string): boolean

/** Email domain in TEST_EMAIL_DOMAINS, or the trimmed name starts with "TEST" (case-sensitive). */
export const isTestLead = (lead: { email: string; name: string }): boolean
```

Domény se porovnávají přesně. Subdoména firemní domény (`novak@praha.firma.cz`) je firemní. Subdoména veřejné služby v seznamu není a bude firemní. Při zjištění nové veřejné služby se doplní jen tento seznam.

`isTestLead` porovnává i subdomény testovacích domén (`x@dev.robopipe.io` je zkušební): doména se rovná položce nebo končí na `.` + položka.

### 9.2 `src/lib/clickId.ts`

```ts
export const CLICK_COOKIE = 'rp_click'
export const CLICK_MAX_AGE_SECONDS = 60 * 60 * 24 * 90
export type ClickId = { v: 1; type: 'gclid' | 'gbraid' | 'wbraid'; id: string; at: string } // at = ISO time of landing

/** First of gclid, gbraid, wbraid in this order. Value 1 to 512 chars without whitespace, `;`, `,`, `"` or `\`. */
export const clickIdFromSearch = (search: string, now?: Date): ClickId | null
export const serializeClickId = (click: ClickId): string // JSON.stringify
/** `null` when missing, broken, other `v`, `at` in the future or older than 90 days. */
export const parseClickId = (raw: string | null | undefined, now: Date): ClickId | null
/** Browser only. writeCookie(CLICK_COOKIE, serializeClickId(click), CLICK_MAX_AGE_SECONDS). */
export const persistClickId = (click: ClickId): void
```

Hodnotu značky kód nemění (Google rozlišuje velikost písmen).

### 9.3 `src/lib/googleAds.ts` (jen server)

```ts
export const EXPORT_WINDOW_DAYS = 90

/** SHA-256 hex of normalizeEmail(email). node:crypto. */
export const hashEmail = (email: string): string

/** Consent from rp_consent (parseConsent). Click from rp_click (parseClickId) only with marketing consent. */
export const attributionFromCookies = (get: (name: string) => string | undefined, now: Date): Lead['attribution']

/** The only rule: marketing consent, company email, not a test lead. A click ID is not required (scenario 4). */
export const isGoogleAdsLead = (lead: Pick<Lead, 'email' | 'name' | 'attribution'>): boolean
```

Projekt nemá balíček `server-only` a nový se nepřidává. Soubor importuje `node:crypto`. Klientský build by import odmítl, takže ho klientská komponenta použít nemůže. Komentář na začátku souboru to říká.

`consent.ts`: `marketing: /^(_gcl_.+|_gac_.+|rp_click)$/`. Komentář nad `GOOGLE_COOKIES` doplnit: „and our own `rp_click` (issue #26)“. Unit test hlídá, že regex odpovídá `CLICK_COOKIE`.

## 10. Souhlas

| Stav `rp_consent` | `rp_click` | Pole v poptávce | Otisk do značky | Export |
|---|---|---|---|---|
| chybí (lišta otevřená nebo bez ID měření) | nezapíše se | `false`, `false`, bez značky | ne | ne |
| analytika ano, marketing ne | nezapíše se, smaže se | `true`, `false`, bez značky | ne | ne |
| marketing ano | zapíše se | marketing `true`, značka když existuje | jen když `isGoogleAdsLead` | jen když `isGoogleAdsLead` |

Kategorie marketing už v #21 řídí `ad_storage`, `ad_user_data` i `ad_personalization` najednou (`toConsentMode`). Ukládáme proto jen dvě hodnoty z lišty, ne čtyři hodnoty consent mode.

Odvolání souhlasu po odeslání se k poptávce nedostane. Server o něm neví. Poptávka si drží souhlas v okamžiku odeslání (kritérium 1).

## 11. Okrajové případy

| Případ | Chování |
|---|---|
| Více kliknutí na reklamu | Každý vstup se značkou a se souhlasem přepíše `rp_click`. Platí poslední kliknutí. Další atribuci řeší Google. |
| Vstup se značkou, souhlas dán dříve | Značka se zapíše hned při vstupu. |
| Navigace před volbou | Značka žije v `useRef`. Souhlas na druhé stránce ji zapíše. |
| Obnovení stránky nebo přepnutí jazyka před volbou | Značka se ztratí (kapitola 3.4). |
| Stará značka | Cookie žije 90 dní. `parseClickId` odmítne `at` starší než 90 dní. Export bere jen poptávky z posledních 90 dní. |
| Značka v adrese má jiný tvar | `clickIdFromSearch` ji odmítne a nic neuloží. Poptávka jde do exportu jen s otiskem. |
| Více značek v adrese | Uloží se první v pořadí `gclid`, `gbraid`, `wbraid`. |
| Chybějící souhlas | Žádná cookie, žádná pole, žádný otisk, žádný řádek. |
| Velká písmena a mezery v e-mailu | `normalizeEmail` před kontrolou domény i před hashem. Uložený e-mail zůstane, jak ho návštěvník napsal. |
| `Novak@GMAIL.com` | Není firemní. |
| Neplatný e-mail | Zod ho odmítne dřív. `isBusinessEmail('')` je `false`. |
| Opakované nahrání | Každý běh stáhne 90 dní. Stejné `Order ID`, název a čas. Google Ads druhou konverzi nevytvoří (G9). |
| Obchod změní e-mail v administraci | Další export pošle nový otisk se stejným `Order ID`. Neověřeno, jestli Google dřív zapsanou konverzi změní. Riziko je malé. |
| Poptávka smazaná v administraci | Zmizí z exportu. Už importovanou konverzi Google ponechá. |
| Zkušební poptávka | `testLead = true`, není v exportu, otisk neodchází. |
| Past na roboty | Lead nevznikne, `adsUserData` nevrací. |
| Poškozená cookie `rp_consent` nebo `rp_click` | Parser vrátí `null`. Poptávka se uloží bez značky. |
| Blokátor reklam | `gtag.js` se nenačte, otisk neodejde. `rp_click` zapisuje náš kód, takže řádek s GCLID v exportu bude. |
| Bez `AW-…` v nastavení | `sendAdsUserData` nic nedělá. Export funguje. |
| Bez obou ID měření | Žádná lišta, žádný souhlas, žádný řádek. |
| Chybí proměnné pro export | `401` pro každého. |
| Konverze dřív než kliknutí | Nemůže nastat. `at` je čas vstupu, `createdAt` je pozdější. |
| Rate limit, chyba validace | Lead nevznikne, nic se neměří. |

## 12. Rizika

1. N1: když Data Manager nepoužije HTTP Basic, zdroj HTTPS nepůjde. Záloha je kapitola 14. Rozhodne první test Arthura.
2. Data Manager stahuje z 27 rozsahů IP. Produkce dnes žádný filtr IP nemá (`curl -I` vrací odpověď Next.js bez proxy CDN). Když přibude firewall nebo WAF, musí rozsahy povolit.
3. Málo firemních poptávek. Chytré nabídky potřebují objem. Když bude firemních poptávek málo, kampaň se může učit pomalu. Otázka 17.2.
4. Google mění rozhraní a pravidla často (G1, G2). Kapitola 16 platí k 11. 11. 2026.
5. Otisk e-mailu je osobní údaj. Text v Ochraně osobních údajů (kapitola 15) musí být zveřejněný před nastavením plánu v Google Ads.
6. Google uvádí, že GCLID a uživatelská data spolu mohou kolidovat při párování ([support 7014069](https://support.google.com/google-ads/answer/7014069)). Postup Googlu: zkusit nahrání bez GCLID. Pro to stačí v Data Manageru odpojit mapování sloupce, kód se nemění.
7. Lokální vývoj s kopií produkční databáze vystaví v exportu produkční poptávky. Lokální `.env` nemá produkční heslo exportu a Google lokální adresu nezná. Riziko je jen v lokálním souboru.

## 13. Testy

### 13.1 Jednotkové (`tests/int/offlineConversions.int.spec.ts`, Vitest)

| Kritérium | Test |
|---|---|
| 4 | `isBusinessEmail`: `novak@firma.cz` ano. Každá doména z `FREE_EMAIL_DOMAINS` ne. `Novak@GMAIL.COM ` ne. `novak@praha.firma.cz` ano. `''`, `bez-zavinace` ne. |
| 4, 6 | `isTestLead`: `x@koala42.com`, `x@dev.robopipe.io`, jméno `TEST Novák` ano. Jméno `Testová` a `test x` ne. |
| 3 | `normalizeEmail(' Jan.Novak@GMail.com ')` je `jannovak@gmail.com`. `hashEmail('Novak@Firma.cz ')` je `0193ede04c0598c7eda49eabe318a1aa481ea93f2093691e807950a59f04d5d0`. |
| 1, 2 | `clickIdFromSearch`: `?gclid=Abc_-1`, `?wbraid=…`, `?gbraid=…&gclid=…` (vyhraje gclid), prázdná hodnota, hodnota s `;` nebo mezerou, 513 znaků. |
| 1 | `parseClickId`: platná, poškozená, jiné `v`, `at` v budoucnosti, `at` starší než 90 dní. `serializeClickId` a `parseClickId` jsou vzájemně inverzní. |
| 1 | `attributionFromCookies`: bez `rp_consent`, marketing `false` a platná `rp_click` (značka se neuloží), marketing `true` a platná `rp_click`, marketing `true` bez `rp_click`. |
| 2 | `GOOGLE_COOKIES.marketing.test(CLICK_COOKIE)` je `true`. |
| 6 | `isGoogleAdsLead`: firemní a souhlas ano, bez značky ano (scénář 4), gmail ne, bez souhlasu ne, zkušební ne. |
| 5, 6, 9 | `toCsv` a `toExportRow`: přesný řádek hlaviček, `Conversion Time` končí `Z` bez milisekund, název z argumentu, pole s čárkou v uvozovkách, žádný sloupec neobsahuje `@`. |
| 7 | Route: bez hlavičky `401` s `WWW-Authenticate`. Špatné heslo `401`. Bez proměnných `401` i se správnou hlavičkou. |
| 5, 6, 8 | Route s Local API (vzor `tests/int/api.int.spec.ts`): vytvořit 5 poptávek (firemní se souhlasem, gmail, bez souhlasu, zkušební, firemní starší než 90 dní přes `createdAt`). Export má právě 1 řádek. Dvě volání vrátí stejné tělo. Poptávky v `afterAll` smazat. |
| 9 | Prázdné `leadConversionName` vrátí `500`. |
| 12 | `tests/int/cookiePolicy.int.spec.ts`: odstavec se vloží za odstavec o marketingu. Druhý běh nic nemění. Text odstavce neobsahuje `*`. Nová databáze (`COOKIE_POLICY`) odstavec obsahuje. |
| 13 | Načíst poptávku přes Local API: `businessEmail`, `testLead`, `googleAdsExport` mají správné hodnoty. Update `attribution.gclid` přes REST jako přihlášený editor pole nezmění. |

### 13.2 E2E (`tests/e2e/offlineConversions.e2e.spec.ts`, Playwright)

Příprava jako v `consent.e2e.spec.ts`: testovací ID měření přes REST, požadavky na `googletagmanager.com` blokovat. `.env` pro testy má `GOOGLE_ADS_EXPORT_USER` a `GOOGLE_ADS_EXPORT_PASSWORD`. Každý test používá jedinečný e-mail (`e2e-<čas>@firma-e2e.cz`) a značku `E2E_<čas>`. `afterAll` vytvořené poptávky smaže přes REST. Formulář je na stránce jako v testu 9 v `consent.e2e.spec.ts`.

| Kritérium | Test (cs i en) |
|---|---|
| 1, 2, 3, 5, 6 | Scénář 1: vstup na `/{locale}?gclid=E2E_…` na úvodní stránce, „Přijmout vše“, klik na odkaz ke formuláři (navigace v aplikaci), odeslání s firemním e-mailem. V `dataLayer` je `set user_data` s `sha256_email_address` (64 znaků hex) a `form_submit` se `send_to: 'AW-000000000'`. V celém `dataLayer` není e-mail čitelně. Export s přihlášením obsahuje řádek se značkou `E2E_…`. |
| 2 | Navigace před volbou: vstup se značkou, přechod na stránku s formulářem, teprve tam „Přijmout vše“. Cookie `rp_click` obsahuje značku. |
| 2 | Odvolání: po souhlasu a vzniku `rp_click` přepnout v patičce marketing na vypnuto. `rp_click` zmizí. |
| 1, 6 | Scénář 2: stejný průchod s `@gmail.com`. Poptávka v DB má `gclid`. V exportu řádek není. V `dataLayer` není `user_data`. |
| 1, 2, 3 | Scénář 3: vstup se značkou, „Odmítnout“, odeslání s firemním e-mailem. Cookie `rp_click` neexistuje. Poptávka nemá značku a má `consentMarketing: false`. V `dataLayer` není `user_data`. V exportu řádek není. |
| 7 | `request.get` bez přihlášení vrátí `401`. |
| 11 | `page.addInitScript` nahradí `gtag` funkcí, která vyhodí výjimku při `set`. Formulář ukáže hlášku o úspěchu. Druhý případ: `context.addCookies` vloží poškozenou `rp_click` a `rp_consent`. Poptávka se uloží. |
| 10 | Regrese: `consent.e2e.spec.ts`, `consentTesterFindings.e2e.spec.ts`, `frontend.e2e.spec.ts` projdou beze změny. |
| 13 | Přihlášený editor otevře poptávku ze scénáře 1. Boční panel ukazuje zaškrtnuté „Business email“ a „Google Ads export“ a pole `gclid` jen pro čtení. |

### 13.3 Ruční ověření

Tester na produkci po nasazení: `curl -u "$USER:$PASS" https://robopipe.io/api/google-ads/company-leads.csv` vrátí hlavičku. `curl` bez `-u` vrátí `401`. V Tag Assistant ověří `form_submit` s uživatelskými daty po odeslání zkušebního formuláře se souhlasem (bez jména TEST, s firemní doménou, poptávku potom smazat).

## 14. Záloha: Google tabulka

Platí jen tehdy, když Data Manager odmítne zdroj HTTPS (N1).

1. Arthur vytvoří Google tabulku „robopipe company leads“ pod účtem, který má přístup do Google Ads.
2. V tabulce otevře Rozšíření, Apps Script. Skript zavolá `UrlFetchApp.fetch(URL, { headers: { Authorization: 'Basic ' + Utilities.base64Encode(user + ':' + pass) } })`, rozdělí CSV přes `Utilities.parseCsv` a přepíše list `export`.
3. Jméno a heslo uloží do Vlastnosti skriptu (Script Properties), ne do kódu.
4. Spouštěč: časový, každou hodinu.
5. V Data Manageru zvolí zdroj Google Sheets a list `export`. Mapování je stejné jako v kapitole 16.4.

Kód webu se nemění. Do tabulky zapisuje jen skript pod účtem Arthura. Web nepotřebuje žádný přístup ke Googlu. Kód skriptu dodá vývojář do `implementation.md`, jen když záloha bude potřeba.

## 15. Text do Ochrany osobních údajů

`AD_CONVERSION_PARAGRAPH` v `src/seed/cookiePolicy.ts`. Vložit hned za odstavec, který začíná „S vaším souhlasem s marketingem“ (cs) nebo „With your consent to marketing“ (en). V `COOKIE_POLICY` stejné místo pro nové databáze. `applyCookiePolicyToContent` ho vloží do existující stránky stejně jako odstavec YouTube z #22. Druhý běh nic nemění. Text bez hvězdiček. Text schvaluje Filip.

**cs**

Když přijdete z naší reklamy Google Ads a dáte souhlas s marketingem, uložíme značku kliknutí do cookie rp_click na 90 dní. Když potom odešlete poptávku z firemní e-mailové adresy, předáme Googlu otisk e-mailu (SHA-256) a značku kliknutí, pokud ji máme. Google z nich zjistí, která reklama poptávku přinesla. Čitelný e-mail Googlu nepředáváme. Bez souhlasu nepředáme nic.

**en**

When you come from our Google Ads ad and consent to marketing, we store the click ID in the cookie rp_click for 90 days. When you then send an inquiry from a company email address, we give Google a hash of the email (SHA-256) and the click ID, if we have it. Google uses them to find out which ad brought the inquiry. We never give Google the readable email. Without consent, we give nothing.

Produkce: `pnpm seed:cookie-policy --remote=https://robopipe.io --dry-run`, potom bez `--dry-run`. Stejný postup jako v #21 a #22.

## 16. Kroky v Google Ads (Arthur, po nasazení)

Popisky platí podle dokumentace Googlu k 11. 11. 2026 (N4). Pořadí je důležité.

### 16.1 Před nastavením

1. Ověřit, že odstavec z kapitoly 15 je zveřejněný na `/cs/ochrana-osobnich-udaju` a `/en/privacy-policy`.
2. V Coolify nastavit `GOOGLE_ADS_EXPORT_USER=google-ads` a `GOOGLE_ADS_EXPORT_PASSWORD=<openssl rand -base64 32>` jako proměnné za běhu. Uložit obě do Keychainu jako `robopipe-google-ads-export`. Restartovat aplikaci.
3. Ověřit `curl -u "google-ads:<heslo>" https://robopipe.io/api/google-ads/company-leads.csv`. Výsledek je řádek hlaviček z kapitoly 8.
4. V administraci otevřít `site-settings`, skupinu `measurement`. Ověřit `leadConversionName = Firemni poptavka (import)`.

### 16.2 Účet

1. Google Ads, Admin, Account settings, Auto-tagging. Musí být zapnuté.
2. Goals, Conversions, Settings. U „Customer data terms“ zvolit View terms, zaškrtnout souhlas, zvolit Agree. Stav je „Accepted“ (Filip schválil, bod 31.2).
3. Na stejné stránce rozbalit „Enhanced conversions“ a zapnout je. Když rozhraní nabízí způsob, zvolit „Google tag“. Když nabízí způsob sběru dat, zvolit „Code“ (ne automatickou detekci). Uložit.
4. Otevřít Google tag settings (`ads.google.com/aw/tagsettings`) pro tag `AW-…`. V „Manage automatic event detection“ zapnout „Form interactions“ ([support 11021502](https://support.google.com/google-ads/answer/11021502)).

### 16.3 Nová konverzní akce

1. Goals, Summary, „+ New conversion action“ (nebo „+ Create conversion action“).
2. Zvolit Import, potom „CRMs, files, or other data sources“, potom „Track conversions from clicks“.
3. U Data source zvolit „Connect a new data source“ a vyhledat HTTPS. Přijmout zásady pro zákaznická data. Continue.
4. Cíl konverze (Conversion goal): „Qualified lead“ (G15). Set up.
5. Údaje zdroje: URL `https://robopipe.io/api/google-ads/company-leads.csv`, Username `google-ads`, Password z Keychainu. Next.
6. Mapování polí podle kapitoly 16.4. Event source nastavit pro všechny řádky na „Web“, když to rozhraní nabízí.
7. Název připojení: `robopipe.io company leads`. V Connection details nastavit plán „Daily“, když je na výběr (N6). Finish.
8. Nastavení akce:
   - Název: `Firemni poptavka (import)`. Přesně, stejná velká písmena, bez diakritiky.
   - Value: „Don't use a value“ (hodnota je mimo rozsah).
   - Count: „One“ (jedna konverze na kliknutí).
   - Click-through conversion window: 90 days.
   - Attribution: Data-driven (výchozí, externí atribuce s rozšířenými konverzemi pro zájemce nejde, G13).
   - Action optimization: Primary action.
9. Save and continue. Když průvodce nabídne „Turn on enhanced conversions for leads“, zaškrtnout.
10. Prvních 4 až 6 hodin nečekat výsledky (G14).

### 16.4 Mapování sloupců

| Sloupec v souboru | Pole v Google Ads |
|---|---|
| `Order ID` | Order ID |
| `Conversion Name` | Conversion action. Případně filtr „Conversion Name equals Firemni poptavka (import)“. |
| `Conversion Time` | Conversion date and time. Transformace „Convert date and time“ zůstane zapnutá. Záložní pásmo není potřeba (čas má `Z`). |
| `Google Click ID` | GCLID |
| `GBRAID` | GBRAID |
| `WBRAID` | WBRAID |
| `Email` | Email address (data už jsou zahashovaná) |
| `Ad User Data` | Pole souhlasu „Ad user data“, když existuje (N2). Jinak nemapovat. |

### 16.5 Starou konverzi na sekundární

1. Goals, Summary. Otevřít akci `robopipe.io (web) generate_lead`.
2. Edit settings. Action optimization: Secondary action. Save.
3. V Goals, Summary ověřit, že cíl „Qualified lead“ je ve výchozích cílech účtu (Account-default) a kampaně ho používají. Jinak kampaně primární akci neuvidí.

### 16.6 Kontrola

1. Po prvním běhu: Goals, Conversions, Uploads (nebo Tools, Data manager, připojení `robopipe.io company leads`). Stav běhu je bez chyby formátu.
2. Po zkušebním průchodu (kapitola 13.3): v Diagnostics akce `Firemni poptavka (import)` je přijatý řádek. Výsledek se ukáže za 24 až 48 hodin.
3. Chyba ve stavu připojení přijde e-mailem. Příčinu najde v detailu připojení.

## 17. Otázky pro Filipa

1. Má web posílat otisk e-mailu do Google jen u poptávek, které jdou do exportu (firemní, ne zkušební)? Doporučení: ano (kapitola 3.2). Méně osobních dat, stejný výsledek. Při odpovědi „u všech“ se změní jen podmínka v `submitLead`.
2. Firemních poptávek může být málo pro učení kampaně. Doporučení: nasadit, jak je schváleno. Po 30 dnech porovnat počet firemních poptávek s `generate_lead`. Když bude firemních poptávek méně než asi 15 za měsíc, vrátit `generate_lead` na primární a firemní poptávku nechat jako druhou primární. Číslo 15 je odhad, ne pravidlo Googlu.
3. Souhlasí Filip s textem v kapitole 15? Doporučení: ano.

## 18. Plán pro vývojáře

1. Napsat `src/lib/leadEmail.ts` a jednotkové testy pro kritérium 4.
2. Napsat `src/lib/clickId.ts` a testy.
3. Napsat `src/lib/googleAds.ts` (`hashEmail`, `attributionFromCookies`, `isGoogleAdsLead`, `toExportRow`, `toCsv`, `checkBasicAuth`) a testy.
4. Doplnit `rp_click` do `GOOGLE_COOKIES.marketing` a test.
5. Přidat skupinu `attribution` a virtuální pole do `Leads.ts`.
6. Přidat `leadConversionName` do `SiteSettings.ts`.
7. Vytvořit a spustit migraci. Zkontrolovat výchozí hodnotu (kapitola 6.3). Přegenerovat `payload-types.ts`.
8. Upravit `submitLead.ts` a `LeadFormState` (kapitola 7.2).
9. Doplnit `adsTagId` a `sendAdsUserData` do `analytics.ts`. Zavolat ji v `LeadForm.tsx`.
10. Doplnit `pendingClick` a `persistClickId` do `ConsentProvider.tsx` (kapitola 7.1).
11. Napsat route `src/app/api/google-ads/company-leads.csv/route.ts` a jeho testy.
12. Doplnit `AD_CONVERSION_PARAGRAPH` do `cookiePolicy.ts` a testy.
13. Doplnit `.env.example` a `README.md`.
14. Napsat E2E testy. Spustit `pnpm lint`, `pnpm tsc --noEmit`, `pnpm test:int`, `pnpm test:e2e`.
15. Napsat `implementation.md`: odchylky, kroky na produkci (migrace, proměnné, seed textu), kroky v Google Ads z kapitoly 16.

## 19. Co se nemění

- Lišta cookies, `rp_consent`, mapování na consent mode, `generate_lead`, `contact_click` (kritérium 10).
- Validace formuláře, limit odeslání, past na roboty, e-mail obchodu.
- Způsob vykreslení stránek (SSG a ISR). Stránky nečtou cookies.
- Import `generate_lead` z GA4 zůstává, jen jako sekundární akce.
- Žádná nová závislost v `package.json`, žádný přístup k Google Ads API, žádná změna Dockerfile.
- Newsletter formulář.
