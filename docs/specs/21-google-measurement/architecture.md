# Architektura: měření Google a cookie lišta (issue #21)

Zadání: [`product.md`](./product.md).

Tento dokument říká, kam patří každá změna, v jakém pořadí se věci načtou a jak to ověřit. Vývojář podle něj implementuje bez dalších otázek. Otázky pro Filipa jsou v kapitole 16. Plán počítá s doporučenou odpovědí.

## 1. Zjištění (11. 11. 2026)

| Oblast | Zjištění | Důkaz |
|---|---|---|
| `trackEvent` | Funkce nic nedělá. Volá ji jen `LocaleSuggestion` se jmény `Locale Suggest: Shown`, `Declined`, `Accepted`. Tato jména GA4 nepřijme (mezery a dvojtečka). | `src/lib/analytics.ts:5`, `src/components/LocaleSuggestion.tsx:39,48,54` |
| Formulář | Demo i kontakt používají jeden formulář `LeadForm` (blok `contactForm`). Výsledek vrací `useActionState` jako `{ status: 'success' }`. Past na roboty (pole `website`) vrací také `success`. | `src/components/LeadForm.tsx:29,56`, `src/actions/submitLead.ts:54,104` |
| Patička | `Footer` je serverová komponenta. Spodní řádek má `legalLinks` z CMS a `LanguageSwitcher`. | `src/components/Footer.tsx:143-163` |
| Precedens pro ID | `site-settings.verification` drží ověřovací kódy Bing a Seznam. Prázdná hodnota znamená, že se značka nevykreslí. Změna globalu spustí `revalidateGlobal`. | `src/globals/SiteSettings.ts:148`, `src/hooks/revalidate.ts` |
| Proměnné prostředí | `NEXT_PUBLIC_*` se vkládá do balíčku při sestavení. Dockerfile ji musí mít jako build secret. `.env.example` má mrtvou `NEXT_PUBLIC_PLAUSIBLE_DOMAIN`, kód ji nečte. | `Dockerfile:30-43`, `.env.example` |
| Vykreslení | Stránky jsou předgenerované s ISR (`revalidate = 600`). Produkce vrací `x-nextjs-prerender: 1`. Layout nečte hlavičky ani cookies. | `src/app/(frontend)/[locale]/page.tsx:17`, `curl -I https://robopipe.io/cs` |
| CSP | Web nemá hlavičku `Content-Security-Policy`. | `curl -I`, `next.config.ts` |
| Ochrana osobních údajů | Obsah je v CMS (kolekce `pages`, slug `ochrana-osobnich-udaju` a `privacy-policy`, blok `content`). Produkce i seed tvrdí „analytika bez cookies“ a „web provozujeme na platformě Vercel“. | `src/seed/index.ts:1506,1514,1528`, živá stránka |
| Jiná plovoucí lišta | `LocaleSuggestion` je `fixed bottom-4 z-40` a ukáže se při první návštěvě. Cookie lišta by se s ní překryla. | `src/components/LocaleSuggestion.tsx:61` |
| Uložení volby jinde | `src/lib/localeSuggestion.ts` už má pomocné funkce pro čtení a zápis cookie v prohlížeči. | `src/lib/localeSuggestion.ts:8,13` |

## 2. Rozpory s product.md a návrh

### 2.1 Konverze do Google Ads

Akceptační kritérium 10 říká „pošle konverzi do Google Ads“. Kód pošle jen jednu událost do GA4. Google Ads ji dostane importem z GA4 (kapitola 8). Tester v prohlížeči ověří událost v `dataLayer`. Konverzi v Google Ads ověří Arthur v účtu Ads, protože import má zpoždění až 24 hodin.

### 2.2 Překryv s nabídkou jazyka

Product.md překryv neřeší. Návrh: `LocaleSuggestion` čeká, dokud je cookie lišta otevřená. Ukáže se až po volbě. Bez ID měření se chování nemění.

### 2.3 Text o Vercelu

Stránka Ochrana osobních údajů uvádí Vercel. Web běží na Coolify. Návrh textu v kapitole 15 to opravuje. Kde Coolify běží (poskytovatel serveru), musí doplnit Filip (otázka 16.1).

### 2.4 Odvolání souhlasu a stará cookie `_ga`

Consent mode po změně na `denied` nové cookies neukládá. Staré `_ga` a `_gcl_*` ale zůstanou. Kód je při odvolání smaže (kapitola 6.4). Jinak by kritérium 4 po změně volby neplatilo.

## 3. Hlavní rozhodnutí

| # | Rozhodnutí | Důvod |
|---|---|---|
| R1 | ID jsou v `site-settings.measurement` (dvě pole), ne v proměnné prostředí. | Stejný vzor jako `verification`. Změna bez nového sestavení. Prázdné pole znamená vypnuté měření. Žádná nová proměnná v Dockerfile a Coolify. |
| R2 | Jediný zdroj pravdy pro volbu je cookie `rp_consent` v prohlížeči. React stav je jen kopie načtená z ní. Server ji nikdy nečte. | Stránky zůstanou statické. Žádný druhý zápis do `localStorage` ani do databáze. |
| R3 | Značku Google spouští jedna klientská komponenta přes `src/lib/analytics.ts`. Žádné inline `<script>` s vlastní logikou. | Parser volby a mapování na consent mode existují jen jednou, v TypeScriptu. |
| R4 | Konverze Ads = import klíčové události `generate_lead` z GA4. Kód nepoužívá `send_to` ani štítek konverze. | Jedna událost, jedno místo pravdy, žádné dvojí počítání. Žádné další pole v CMS. |
| R5 | `trackEvent` zůstane jediný vstup pro události. Uvnitř zavolá `gtag('event', …)`. | Existující volání fungují dál. Nový kód nevolá `gtag` přímo. |
| R6 | Klik na `mailto:` a `tel:` měří jeden posluchač na `document`. | Odkazy jsou v CMS na mnoha místech. Žádná úprava `CMSLink` ani patičky. |
| R7 | Do Not Track a Global Privacy Control nemění chování. | Filip zvolil lištu jako jediný způsob volby. Google DNT ignoruje. Výchozí stav je stejně `denied`. |

## 4. Dotčené soubory

| Soubor | Změna |
|---|---|
| `src/globals/SiteSettings.ts` | Nová skupina `measurement` (kapitola 5). |
| `src/migrations/<datum>_site_settings_measurement.ts` + `.json`, `src/migrations/index.ts` | Generovaná migrace. |
| `src/payload-types.ts` | Přegenerovat (`pnpm generate:types`). |
| `src/lib/clientCookies.ts` (nový) | `readCookie`, `writeCookie`, `deleteCookie`. Přesunout sem pomocné funkce z `src/lib/localeSuggestion.ts`. Ten je pak importuje. |
| `src/lib/consent.ts` (nový) | Typ volby, název a doba cookie, `parseConsent`, `serializeConsent`, `toConsentMode`, `GOOGLE_COOKIES`. Čisté funkce bez Reactu. |
| `src/lib/analytics.ts` | `initGoogleTag`, `updateGoogleConsent`, `trackEvent`, `clearGoogleCookies`. |
| `src/components/consent/ConsentProvider.tsx` (nový, klientský) | Kontext, stav volby, spuštění značky, posluchač `mailto:`/`tel:`, vykreslení lišty a dialogu. |
| `src/components/consent/CookieBanner.tsx` (nový) | Lišta se třemi tlačítky. |
| `src/components/consent/CookieSettingsDialog.tsx` (nový) | Dialog se dvěma přepínači. |
| `src/components/consent/CookieSettingsButton.tsx` (nový, klientský) | Tlačítko do patičky. |
| `src/app/(frontend)/[locale]/layout.tsx` | Obalit obsah `ConsentProvider` s ID ze `settings.measurement`. |
| `src/components/Footer.tsx` | Vložit `CookieSettingsButton` před `LanguageSwitcher`. |
| `src/components/LeadForm.tsx` | Po úspěchu zavolat `trackEvent('generate_lead', …)` jednou. |
| `src/components/LocaleSuggestion.tsx` | Přejmenovat události. Nevykreslit se, dokud je cookie lišta otevřená. |
| `src/i18n/messages/cs.json`, `en.json` | Nový jmenný prostor `consent`, klíč `footer.cookieSettings`. |
| `src/seed/index.ts` | Nahradit odstavec „Analytika“ a větu o Vercelu textem z kapitoly 15. Jen pro nové databáze. |
| `.env.example`, `README.md` | Smazat `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` a zastaralou poznámku o Vercel Analytics (`README.md:129`). Popsat `site-settings.measurement`. |
| `tests/e2e/consent.e2e.spec.ts` (nový), `tests/int/consent.int.spec.ts` (nový) | Testy z kapitoly 13. |

## 5. Datový model a migrace

Nová skupina v `SiteSettings.ts` hned za `verification`:

```ts
{
  name: 'measurement',
  type: 'group',
  admin: {
    description:
      'Google measurement. Empty = no Google tag and no cookie banner. Publish the cookie paragraph on the privacy page before you fill these.',
  },
  fields: [
    {
      name: 'googleAnalyticsId',
      type: 'text',
      validate: (v) => !v || /^G-[A-Z0-9]{4,16}$/.test(v) || 'Format: G-XXXXXXXXXX',
      admin: { description: 'GA4 measurement ID, e.g. G-ABC123XYZ9.' },
    },
    {
      name: 'googleAdsId',
      type: 'text',
      validate: (v) => !v || /^AW-\d{6,14}$/.test(v) || 'Format: AW-123456789',
      admin: { description: 'Google Ads tag ID, e.g. AW-123456789. Used for remarketing.' },
    },
  ],
}
```

Pole nejsou lokalizovaná. Migrace přidá dva sloupce `varchar` s hodnotou `NULL` do tabulky `site_settings`. Postup podle README: `pnpm payload migrate:create site_settings_measurement`, `pnpm payload migrate`. Produkce migraci spustí při sestavení. Po nasazení jsou pole prázdná, takže se nic nenačte. Arthur je vyplní až po zveřejnění textu o cookies.

Proč ne proměnná prostředí: `NEXT_PUBLIC_*` vyžaduje build secret v Dockerfile a v Coolify a nové sestavení při každé změně. Hodnota by žila mimo administraci, kde už jsou ověřovací kódy. ID měření nejsou tajná, jsou vidět v HTML.

## 6. Volba návštěvníka

### 6.1 Formát

Cookie `rp_consent`, hodnota `encodeURIComponent(JSON.stringify(...))`:

```ts
type ConsentChoice = { v: 1; analytics: boolean; marketing: boolean; at: string } // at = ISO datum volby
```

Atributy: `path=/; max-age=15552000; samesite=lax` a `secure`, když `location.protocol === 'https:'`. 15 552 000 sekund je 180 dní (6 měsíců). Každé uložení volby lhůtu obnoví. Cookie je nezbytná pro funkci webu, souhlas nepotřebuje.

`parseConsent(raw)` vrátí `null`, když cookie chybí, nejde přečíst, nebo má jiné `v`. `null` znamená: volba neexistuje, ukaž lištu. Pole `v` umožní v budoucnu znovu požádat o souhlas při změně kategorií.

### 6.2 Mapování na consent mode

| Kategorie v liště | Hodnoty consent mode |
|---|---|
| Analytika | `analytics_storage` |
| Marketing | `ad_storage`, `ad_user_data`, `ad_personalization` |

`toConsentMode(choice | null)` vrátí objekt se čtyřmi klíči. `null` vrátí čtyřikrát `denied`. Ostatní klíče (`functionality_storage`, `personalization_storage`, `security_storage`) kód nenastavuje.

| Akce | analytics | marketing |
|---|---|---|
| Přijmout vše | true | true |
| Odmítnout | false | false |
| Nastavení, uložit | podle přepínače | podle přepínače |

### 6.3 Pořadí načtení

`ConsentProvider` dělá v jednom `useEffect` po prvním vykreslení (jen když existuje aspoň jedno ID):

1. Přečte `rp_consent` přes `parseConsent`. Výsledek uloží do stavu.
2. Zavolá `initGoogleTag({ analyticsId, adsId }, choice)`.

`initGoogleTag` v `src/lib/analytics.ts`:

1. Když `window.gtag` už existuje, skončí (ochrana proti dvojímu spuštění v React Strict Mode a při navigaci).
2. `window.dataLayer = window.dataLayer || []`.
3. `window.gtag = function gtag() { window.dataLayer.push(arguments) }`. Musí to být `arguments`, ne pole. Pole gtag.js ignoruje.
4. `gtag('consent', 'default', toConsentMode(null))`.
5. `gtag('set', 'ads_data_redaction', true)`.
6. Když `choice !== null`: `gtag('consent', 'update', toConsentMode(choice))`. Vracející se návštěvník tak nepošle žádný požadavek ve stavu `denied`.
7. `gtag('js', new Date())`.
8. `gtag('config', analyticsId)`, když existuje. `gtag('config', adsId)`, když existuje.
9. Vloží `<script async src="https://www.googletagmanager.com/gtag/js?id=<první ID>">`. Když `document.readyState === 'complete'`, hned. Jinak po události `load` na `window`.

Fronta `dataLayer` drží pořadí příkazů. Výchozí `denied` je tedy vždy před `config`, i když by se skript načetl dřív. Skript se načte až po vykreslení a po události `load` (kritérium 14).

Navigace v aplikaci (Next.js mění adresu přes `history`) posílá `page_view` sama, když má datový proud GA4 zapnuté „Page changes based on browser history events“. To je výchozí stav. Kód `page_view` ručně neposílá.

### 6.4 Změna volby

`ConsentProvider.save(choice)`:

1. `writeCookie('rp_consent', serializeConsent(choice), 15552000)`.
2. `updateGoogleConsent(choice)` zavolá `gtag('consent', 'update', toConsentMode(choice))`.
3. Když kategorie přešla z `true` na `false`, `clearGoogleCookies(category)` smaže cookies podle `GOOGLE_COOKIES`: analytika `_ga`, `_ga_*`, `_gid`, `_gat*`, marketing `_gcl_*`. Mazat dvakrát: bez `domain` a s `domain=.<registrovatelná doména>` (pro `robopipe.io` je to `.robopipe.io`, pro `localhost` bez domény).
4. Nastaví stav a zavře lištu a dialog.

Změna platí hned, bez obnovení stránky (kritérium 9).

## 7. Komponenty a kontext

`ConsentProvider` props: `analyticsId?: string | null`, `adsId?: string | null`, `children`. Když jsou obě ID prázdná, vrátí jen `children` a kontext má hodnotu `null`.

Kontext `useConsent()` vrací `{ bannerOpen: boolean; openSettings: () => void } | null`.

Vykreslení v provideru: `<CookieBanner />` (když `bannerOpen`) **před** `children`, aby byla lišta první v pořadí klávesy Tab. `<CookieSettingsDialog />` za `children`.

Stav `mounted`: před prvním `useEffect` provider nic nevykreslí. Serverové HTML je pro všechny návštěvníky stejné a nevzniká chyba hydratace.

Layout:

```tsx
const { googleAnalyticsId, googleAdsId } = settings.measurement ?? {}
<NextIntlClientProvider>
  <ConsentProvider analyticsId={googleAnalyticsId} adsId={googleAdsId}>
    <LocaleSwitchProvider paths={switchPaths}>…stávající obsah…</LocaleSwitchProvider>
  </ConsentProvider>
</NextIntlClientProvider>
```

`settings` layout už načítá. Žádný nový dotaz, žádné `cookies()` ani `headers()`.

Patička: `CookieSettingsButton` volá `useConsent()`. Když je kontext `null`, nevykreslí nic. Jinak `<button type="button">` se stejnou třídou jako odkazy `legalLinks` (`transition-colors hover:text-text-invert`). Text `footer.cookieSettings`.

`LocaleSuggestion`: když `useConsent()?.bannerOpen`, nevykreslí se. Po zavření lišty se ukáže normálně.

## 8. Události

| Událost GA4 | Kdy | Parametry | Kde |
|---|---|---|---|
| `generate_lead` | Po `state.status === 'success'` v `LeadForm` | `form_location`: `pathname`, `tier`: z URL, jen když existuje | `LeadForm.tsx` |
| `contact_click` | Klik na `a[href^="mailto:"]` nebo `a[href^="tel:"]` | `method`: `email` nebo `phone` | posluchač v `ConsentProvider` (`closest('a')`, `capture: true`) |
| `locale_suggest_shown`, `locale_suggest_declined`, `locale_suggest_accepted` | Stávající místa | `suggested` | `LocaleSuggestion.tsx` |

`generate_lead` jen jednou: `useEffect` se závislostí `[state]` a `useRef` s posledním odeslaným objektem `state`. `useActionState` vrací pro každé odeslání nový objekt. Opakované vykreslení ani Strict Mode událost nezdvojí.

`trackEvent(name, params)` zavolá `window.gtag?.('event', name, params)`. Bez značky nic nedělá. Typ `params` rozšířit na `Record<string, string | number>`.

Nastavení v Google (práce Arthura, ne vývojáře):

1. V GA4 označit `generate_lead` jako klíčovou událost.
2. V Google Ads importovat `generate_lead` z GA4 jako **primární** konverzi „Lead“.
3. V Google Ads nevytvářet žádnou jinou konverzi pro formulář. Tak se nic nepočítá dvakrát.
4. `contact_click` volitelně označit jako klíčovou událost. Do Ads importovat jen jako **sekundární**.

Značka `AW-…` zůstává kvůli remarketingu a propojení kliknutí z reklamy (`_gcl_aw`).

## 9. Texty

Jmenný prostor `consent` v obou souborech:

| Klíč | cs | en |
|---|---|---|
| `bannerTitle` | Cookies a měření | Cookies and measurement |
| `bannerText` | Pomocí cookies měříme návštěvnost a účinnost reklam. Vyberte, co povolíte. Volbu změníte v patičce webu. | We use cookies to measure traffic and ad results. Choose what you allow. You can change it in the footer. |
| `acceptAll` | Přijmout vše | Accept all |
| `rejectAll` | Odmítnout | Reject |
| `settings` | Nastavení | Settings |
| `privacyLink` | Ochrana osobních údajů | Privacy policy |
| `dialogTitle` | Nastavení cookies | Cookie settings |
| `necessaryTitle` | Nezbytné | Necessary |
| `necessaryText` | Uloží vaši volbu. Jsou vždy zapnuté. | Store your choice. Always on. |
| `analyticsTitle` | Analytika | Analytics |
| `analyticsText` | Google Analytics měří, které stránky lidé čtou. | Google Analytics measures which pages people read. |
| `marketingTitle` | Marketing | Marketing |
| `marketingText` | Google Ads měří výsledky reklam a ukazuje vám naše reklamy na jiných webech. | Google Ads measures ad results and shows you our ads on other sites. |
| `save` | Uložit volbu | Save choice |
| `close` | Zavřít | Close |

`footer.cookieSettings`: cs „Nastavení cookies“, en „Cookie settings“.

Odkaz `privacyLink` v liště vede na `/cs/ochrana-osobnich-udaju` a `/en/privacy-policy`. Použít existující `useLocaleHref` nebo cestu ze stejného zdroje, který používá patička. Adresu nepsat natvrdo dvakrát.

## 10. Vzhled a přístupnost

Lišta:

- `<section role="region" aria-labelledby="cookie-banner-title">`, `fixed inset-x-0 bottom-0 z-50`, bílé pozadí, `shadow-popup`, `max-h-[50vh] overflow-y-auto`.
- Lišta není modální. Neblokuje stránku a nebere fokus. Stránka jde používat i s otevřenou lištou (kritérium 13).
- Tlačítka „Přijmout vše“ a „Odmítnout“ mají **stejné** `buttonClasses({ variant: 'filled' })` a stejnou šířku. Na 390 px jsou pod sebou přes celou šířku, na `sm` a víc vedle sebe. „Nastavení“ má `variant: 'outlined'`.
- Pořadí v DOM: text, Přijmout vše, Odmítnout, Nastavení.

Dialog:

- Nativní `<dialog>` otevřený přes `showModal()`. Prohlížeč drží fokus uvnitř a zavře ho klávesou Escape.
- `aria-labelledby` na nadpis. Po zavření vrátit fokus na prvek, který dialog otevřel.
- Přepínače: `<input type="checkbox" role="switch">` s `<label>`. Výchozí stav: hodnota z uložené volby, bez volby vypnuto (kritérium 3). Nezbytné: zaškrtnuté a `disabled`.
- Escape nebo „Zavřít“ volbu neuloží. Když volba ještě neexistuje, lišta zůstane.
- Dialog má tlačítka „Uložit volbu“ a „Přijmout vše“. Obě mají stejný vzhled jako v liště.

Kontrast a fokus: použít existující třídy `focus:ring-brand-tint` jako v `LeadForm`.

## 11. Okrajové případy

| Případ | Chování |
|---|---|
| Obě ID prázdná | Žádný skript, žádná lišta, žádný odkaz v patičce, `trackEvent` nic nedělá (kritérium 12). |
| Jen jedno ID | Značka se načte s tímto ID. Lišta se ukáže. Kategorie zůstávají obě. |
| Statické stránky | Server cookies nečte. Lišta se vykreslí až v prohlížeči. HTML v cache je pro všechny stejné. |
| Blokátor reklam | `gtag.js` se nenačte. `window.gtag` je náš zástupce a jen plní `dataLayer`. Lišta, formulář a odkazy fungují. Žádná chyba v konzoli z našeho kódu. |
| Do Not Track, GPC | Bez vlivu (R7). |
| Vypnutý JavaScript | Žádná lišta, žádné měření. Web funguje. |
| Poškozená cookie `rp_consent` | `parseConsent` vrátí `null`, lišta se ukáže. |
| Past na roboty ve formuláři | Vrací `success`, takže pošle `generate_lead`. Roboti obvykle JavaScript nespouštějí. Přijatelné, smlouvu akce neměníme. |
| Přepnutí jazyka | Cookie má `path=/`. Volba platí pro `/cs` i `/en`. |
| CSP | Neexistuje. Když přibude, musí povolit `www.googletagmanager.com`, `*.google-analytics.com`, `*.analytics.google.com`, `*.doubleclick.net`, `www.google.com`, `googleads.g.doubleclick.net`. |
| Administrace Payload | Mimo layout `(frontend)`. Bez značky a bez lišty. |
| Živý náhled | Je v layoutu `(frontend)`, takže měří. Přijatelné, týká se jen redaktorů. |

## 12. Rizika

1. Rozšířený consent mode posílá bez souhlasu anonymní signály. Filip to přijal (product.md bod 9).
2. `gtag.js` má asi 100 kB. Načtení po `load` drží dopad na Lighthouse nízko. Tester porovná skóre před a po (kritérium 14).
3. Import konverze z GA4 má zpoždění a používá atribuci GA4. Je to cena za jeden zdroj pravdy.
4. Arthur nesmí vyplnit ID dřív, než je zveřejněný text o cookies. Popis pole to říká.
5. Lokální vývoj s kopií produkční databáze by posílal data do produkční služby GA4. Před kopírováním pole vyprázdnit, nebo v GA4 filtrovat název hostitele `robopipe.io`.

## 13. Testy

### 13.1 Jednotkové (`tests/int/consent.int.spec.ts`, Vitest)

- `parseConsent`: chybějící, poškozená, jiné `v`, platná hodnota.
- `serializeConsent` a `parseConsent` jsou vzájemně inverzní.
- `toConsentMode`: `null`, jen analytika, jen marketing, obojí.

### 13.2 E2E (`tests/e2e/consent.e2e.spec.ts`, Playwright)

Příprava: v `beforeAll` přihlásit se (`tests/helpers/login.ts`) a přes REST nastavit `measurement.googleAnalyticsId = 'G-TEST000000'` a `googleAdsId = 'AW-000000000'`. V `afterAll` vrátit původní hodnoty. Pomocná funkce čte stav consent z `window.dataLayer`: poslední položka `['consent', 'default'|'update', {...}]`, převedená přes `Array.from`.

1. Nová návštěva `/cs`: lišta je vidět, tři tlačítka, „Přijmout vše“ a „Odmítnout“ mají stejný `boundingBox` (šířka a výška) a stejnou třídu.
2. Před volbou: první položka consent je `default` se čtyřmi `denied`. Je v `dataLayer` před první položkou `config`.
3. „Odmítnout“: lišta zmizí, `rp_consent` má `analytics:false, marketing:false`, `context.cookies()` neobsahuje `_ga`, `_gid`, `_gcl_*`.
4. „Přijmout vše“: poslední `update` má čtyři `granted`. Cookie `rp_consent` má `max-age` 180 dní (`expires` minus teď je 180 dní ± 1 den).
5. Nastavení, jen analytika: `analytics_storage: granted`, tři reklamní `denied`.
6. Obnovení stránky po volbě: lišta se neukáže, `update` je v `dataLayer` před `config`.
7. Patička „Nastavení cookies“: otevře dialog, přepínače odpovídají volbě, změna na odmítnutí pošle `update` s `denied` a smaže cookie `_ga` (předem ji test vloží přes `context.addCookies`).
8. `/en`: anglické texty, odkaz „Cookie settings“.
9. Formulář: vyplnit a odeslat, po hlášce o úspěchu je v `dataLayer` právě jedna položka `event` `generate_lead`. Odeslání ověřit přes `page.route` na akci, ať se nevytvoří lead (nebo použít stávající postup z `frontend.e2e.spec.ts`).
10. Klik na `mailto:` odkaz (zabránit otevření pošty přes `page.route` nebo `preventDefault` v testu): v `dataLayer` je `contact_click` s `method: 'email'`.
11. Bez ID (vyprázdnit pole): žádná lišta, žádný `<script src*="googletagmanager">`, `window.dataLayer` neexistuje.
12. Klávesnice: Tab z adresního řádku dojde nejdřív na „Přijmout vše“. Dialog se zavře klávesou Escape.
13. Telefon 390 px: lišta nemá vodorovný posuvník a výška je nejvýš polovina okna.
14. Regrese: `localeSwitch`, `heroVideo` a `frontend` testy projdou. `LocaleSuggestion` se ukáže až po zavření lišty.

Testy 1 až 14 nepotřebují síť Google. Požadavky na `googletagmanager.com` v testech blokovat přes `page.route(..., r => r.abort())`, aby byly testy stabilní. Vznik `_ga` po souhlasu (kritérium 6) ověří tester ručně na produkci, protože vyžaduje skutečnou službu GA4.

## 14. Plán pro vývojáře

1. Přidat skupinu `measurement` do `SiteSettings.ts`.
2. Vytvořit a spustit migraci. Přegenerovat `payload-types.ts`.
3. Přesunout pomocné funkce cookie do `src/lib/clientCookies.ts`. Upravit import v `localeSuggestion.ts`.
4. Napsat `src/lib/consent.ts` a jednotkové testy.
5. Přepsat `src/lib/analytics.ts` (kapitola 6.3, 6.4, 8).
6. Napsat `ConsentProvider`, `CookieBanner`, `CookieSettingsDialog`, `CookieSettingsButton`.
7. Přidat texty do `cs.json` a `en.json`.
8. Zapojit provider do layoutu a tlačítko do patičky.
9. Přidat `generate_lead` do `LeadForm`.
10. Přejmenovat události a přidat podmínku `bannerOpen` v `LocaleSuggestion`.
11. Upravit seed (text o cookies a hostingu), `.env.example` a `README.md`.
12. Napsat E2E testy. Spustit `pnpm lint`, `pnpm tsc --noEmit`, unit a E2E.
13. Změřit Lighthouse mobil na `/cs` před a po, s vyplněnými testovacími ID.

Po sloučení (Arthur):

1. Vložit schválený text o cookies na obě stránky v administraci.
2. Vyplnit `measurement` v `site-settings`.
3. Nastavit klíčovou událost a import konverze (kapitola 8).

## 15. Návrh textu pro Ochranu osobních údajů

Nahrazuje odstavec „Analytika“. Text schvaluje Filip.

**cs**

> **Cookies a měření.** Web používá cookies jen s vaším souhlasem. Nezbytná cookie `rp_consent` uloží vaši volbu na 6 měsíců.
>
> S vaším souhlasem s analytikou používáme Google Analytics. Měříme, které stránky lidé čtou a odkud přišli. Google ukládá cookies `_ga` a `_ga_*` až na 2 roky.
>
> S vaším souhlasem s marketingem používáme značku Google Ads. Měříme výsledky reklam a ukazujeme naše reklamy na jiných webech. Google ukládá cookies `_gcl_*` až na 90 dní.
>
> Bez souhlasu Google neukládá žádné cookies. Dostává jen anonymní signály bez identifikátorů. Z nich odhaduje počet návštěv.
>
> Data zpracovává Google Ireland Limited. Může je předat do USA podle rámce EU-US Data Privacy Framework.
>
> Volbu kdykoli změníte odkazem „Nastavení cookies“ v patičce webu.

**en**

> **Cookies and measurement.** This site uses cookies only with your consent. The necessary cookie `rp_consent` stores your choice for 6 months.
>
> With your consent to analytics, we use Google Analytics. We measure which pages people read and where they came from. Google stores the cookies `_ga` and `_ga_*` for up to 2 years.
>
> With your consent to marketing, we use the Google Ads tag. We measure ad results and show our ads on other sites. Google stores the cookies `_gcl_*` for up to 90 days.
>
> Without consent, Google stores no cookies. It gets only anonymous signals without identifiers. It uses them to estimate visits.
>
> Google Ireland Limited processes the data. It may transfer data to the USA under the EU-US Data Privacy Framework.
>
> You can change your choice at any time with the “Cookie settings” link in the footer.

Věta o hostingu v části „Kdo údaje zpracovává“ musí přestat uvádět Vercel (otázka 16.1).

## 16. Otázky pro Filipa

1. Kde běží Coolify (poskytovatel a země serveru)? Doplní se do věty „Web provozujeme na …“. Doporučení: uvést skutečného poskytovatele, třeba „na vlastním serveru u <poskytovatel> v EU“. Bez odpovědi věta o Vercelu zůstane chybná.
2. Má se `contact_click` importovat do Google Ads jako sekundární konverze? Doporučení: ano, sekundární. Neovlivní nabídky v kampaních. Při odpovědi „ne“ se změní jen nastavení v Ads, kód ne.

## 17. Co se nemění

- Server action `submitLead` a jeho návratové hodnoty.
- `CMSLink`, globál `footer`, kolekce `pages`.
- Způsob vykreslení stránek (SSG a ISR, `revalidate = 600`).
- Žádný Google Tag Manager, žádná placená služba pro souhlas, žádná nová závislost v `package.json`.
- Newsletter formulář neposílá konverzi (mimo rozsah product.md).
