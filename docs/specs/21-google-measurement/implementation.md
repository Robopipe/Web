# Implementace: měření Google a cookie lišta (issue #21)

Zadání: [`product.md`](./product.md). Architektura: [`architecture.md`](./architecture.md).
Větev `feat/21-google-measurement`. PR obsahuje migraci (kapitola Migrace).

## Co je hotové

Všechny body plánu z kapitoly 14 architektury, kromě kroků po sloučení.

| Část | Soubory |
| --- | --- |
| ID měření v administraci (`site-settings.measurement`) s kontrolou formátu | `src/globals/SiteSettings.ts`, migrace, `src/payload-types.ts` |
| Pomocné funkce pro cookies v prohlížeči | `src/lib/clientCookies.ts`, `src/lib/localeSuggestion.ts` je importuje |
| Volba návštěvníka a mapování na consent mode | `src/lib/consent.ts` |
| Značka Google, aktualizace souhlasu, mazání cookies, události | `src/lib/analytics.ts` |
| Lišta, dialog nastavení, odkaz v patičce, kontext | `src/components/consent/*`, `layout.tsx`, `Footer.tsx` |
| Texty cs a en | `src/i18n/messages/*.json` (jmenný prostor `consent`, klíč `footer.cookieSettings`) |
| Událost `generate_lead` po úspěšném odeslání formuláře, jednou | `src/components/LeadForm.tsx` |
| Událost `contact_click` pro `mailto:` a `tel:` | posluchač v `ConsentProvider.tsx` |
| Nové názvy událostí nabídky jazyka, nabídka čeká na zavření lišty | `src/components/LocaleSuggestion.tsx` |
| Odstavec o cookies a věta o hostingu | `src/seed/cookiePolicy.ts`, `pnpm seed` i `pnpm seed:cookie-policy` |
| `.env.example` bez `NEXT_PUBLIC_PLAUSIBLE_DOMAIN`, README | `.env.example`, `README.md` |

Věta o hostingu je **čekající na potvrzení majitele**:
„Web provozujeme na serverech Google Cloud v Německu (Frankfurt).“
(en „We run the site on Google Cloud servers in Germany (Frankfurt).“). Filip musí potvrdit poskytovatele a zemi
(otázka 16.1 architektury) dříve, než se skript spustí na produkci. Text celého odstavce o cookies také schvaluje Filip.

## Odchylky od architektury

1. **Mazání cookies Google při každém uložení.** Kapitola 6.4 maže cookies kategorie jen po změně z `true` na `false`.
   Kód je maže při každém uložení volby, která kategorii nepovoluje. Důvod: `_ga` žije 2 roky, `rp_consent` jen
   180 dní. Po vypršení volby a novém odmítnutí by stará `_ga` jinak zůstala a kritérium 4 by neplatilo.
   Funkce `deniedCategories` v `src/lib/consent.ts`.
2. **Skript obsahu místo ruční úpravy.** Kapitola 14 („Po sloučení“) počítá s vložením textu v administraci.
   Text je v `src/seed/cookiePolicy.ts` a skript `pnpm seed:cookie-policy` ho vloží do existující databáze, stejně
   jako `seed:seo-geo`. Ruční úprava v administraci zůstává jako záloha. Převodník markdownu na Lexical je kvůli
   tomu vyčleněný ze `src/seed/index.ts` do `src/seed/lexical.ts`, aby seed i skript používaly stejný.
3. **Názvy cookies v textu bez formátu kódu.** Kapitola 15 píše `rp_consent`, `_ga` a `_gcl_*` jako kód. Převodník
   v seedu umí jen tučné písmo a kurzívu, proto jsou názvy prostý text.
4. **Věta o hostingu nahrazuje celou větu.** Stará věta „Web provozujeme na platformě Vercel a data ukládáme v EU.“
   zmizí celá. Frankfurt je v EU, takže informace zůstává.
5. **Adresa Ochrany osobních údajů.** Kapitola 9 chce adresu ze stejného zdroje jako patička. Patička bere odkazy
   z CMS bez stálého klíče. Slugy jsou proto jednou v `PRIVACY_SLUGS` (`src/lib/paths.ts`). Používá je lišta
   i skript obsahu.
6. **Lighthouse „před“.** Kapitola 14 bod 13 porovnává stav před a po změně. Měřený „před“ je stejné sestavení
   s prázdnými ID. To odpovídá stavu bez měření, protože bez ID se nic nenačte. Nové sestavení `master` by na stroji
   s 8 GB RAM neprošlo souběžně s jinými úlohami.
7. **Přihlášení v e2e testech.** Kapitola 13.2 uvádí `tests/helpers/login.ts` (přihlášení přes formulář). Test
   se přihlásí přes REST (`/api/users/login`) stejně jako `seo-stage2.e2e.spec.ts`. Uživatel je ze
   `tests/helpers/seedUser.ts`.
8. **Místo pod lištou (kolo 2, B1).** Kapitola 10 chce lištu `fixed` bez dalšího zásahu do stránky. Lišta teď
   nastaví `body` spodní odsazení a `html` `scroll-padding-bottom` na svou výšku (`ResizeObserver`). Konec stránky
   a přepínač jazyka v patičce jdou posunout nad lištu. Po zavření lišty se odsazení vrátí.
9. **Tlačítka na telefonu (kolo 2, B1).** Kapitola 10 chce pod `sm` tlačítka pod sebou přes celou šířku. Teď jsou
   ve dvou sloupcích: „Přijmout vše“ | „Odmítnout“, pod nimi „Nastavení“ | odkaz na ochranu údajů. Přijmout
   a Odmítnout mají dál stejnou třídu, šířku i výšku (kritérium 2). Od `sm` výše se vzhled nemění.
10. **Fokus po volbě (kolo 2, B4).** Kapitola 10 říká, že lišta nebere fokus. To platí dál pro otevření. Po zavření
   lišty ale `ConsentProvider` přesune fokus na `<main>` (`tabIndex={-1}`), když fokus spadl na `body`.
11. **Synchronizace záložek (kolo 2, B5).** Architektura synchronizaci neřeší. `ConsentProvider` po uložení pošle
   prázdnou zprávu do `BroadcastChannel('rp_consent')`. Ostatní záložky znovu přečtou cookie a použijí volbu.
   Cookie zůstává jediné úložiště volby (R2).
12. **`_gac_*` (kolo 2, B3).** Kapitola 6.4 maže pro marketing jen `_gcl_*`. `GOOGLE_COOKIES.marketing` teď maže
   také `_gac_*`.

## Migrace

Ano: `src/migrations/20261111_181546_site_settings_measurement.ts`. Přidá do tabulky `site_settings` dva sloupce
`varchar` s hodnotou `NULL` (`measurement_google_analytics_id`, `measurement_google_ads_id`). Produkce ji spustí
při sestavení. Po nasazení jsou pole prázdná, takže se nenačte žádná značka ani lišta.
`payload migrate:create` po migraci nenašel žádný další rozdíl ve schématu.

## Jak to ověřit

Místní databáze `robopipe_21` (`pnpm seed`), server `next start` na portu 3921.

| Kontrola | Výsledek |
| --- | --- |
| `tsc --noEmit` | prošlo |
| `pnpm lint` | 0 chyb, 2 stará varování |
| `pnpm build` | prošlo |
| `test:int` | 26 souborů, 159 testů, vše prošlo. Nové: `consent.int.spec.ts`, `cookiePolicy.int.spec.ts`. |
| `test:e2e` (celá sada) | 111 prošlo, 0 selhalo. Nový `consent.e2e.spec.ts`: 13 testů. Známé chyby (blog s dlouhým titulkem, článek jen v produkci) se v tomto běhu neprojevily. |

Spuštění e2e na jiném portu:

```sh
PLAYWRIGHT_CHROMIUM_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
NEXT_PUBLIC_SERVER_URL=http://localhost:3921 E2E_BASE_URL=http://localhost:3921 \
  pnpm test:e2e tests/e2e/consent.e2e.spec.ts --project=chromium
```

Test nastaví testovací ID přes REST a na konci vrátí původní hodnoty. Požadavky na Google blokuje.

### Ruční ověření se skutečným gtag.js

Místní databáze má `G-TEST000000` a `AW-000000000`. Playwright (Chrome) bez blokování Google:

| Stav | Cookies | Poslední consent v `dataLayer` |
| --- | --- | --- |
| Před volbou | žádná | `default`, čtyřikrát `denied` |
| Přijmout vše | `rp_consent`, `_ga`, `_ga_TEST000000`, `_gcl_au` | `update`, čtyřikrát `granted` |
| Změna v patičce na odmítnutí | `rp_consent` | `update`, čtyřikrát `denied` |
| Obnovení po odmítnutí | `rp_consent` | `default` a `update`, vše `denied` |
| Odmítnout (`/en`) | `rp_consent` | `update`, čtyřikrát `denied` |
| Jen analytika | `rp_consent`, `_ga`, `_ga_TEST000000` | `analytics_storage: granted`, reklamní `denied` |
| Odeslání formuláře `/cs/kontakt` | | právě jedna `['event', 'generate_lead', { form_location: '/cs/kontakt' }]` |

Kontrola polí v administraci (REST): `G-F89GSGDB8T` a `AW-16874443332` projdou (odpověď 200). `UA-12345` a `AW-abc`
vrátí 400 s hláškou formátu. Produkční ID nejsou v kódu ani v seed datech.

Skript obsahu na kopii staré databáze (text s Vercelem, stejná struktura jako produkce): první běh nahradil odstavec
i větu v cs i en, druhý běh nic nezměnil. Anglická věta po náhradě: „We run the site on Google Cloud servers in
Germany (Frankfurt). Emails are delivered via Resend. …“

### Lighthouse mobil `/cs` (místní build)

Lighthouse 12.8.2, mobil, simulované omezení, Chrome.

| Stav | Výkon | LCP | TBT |
| --- | --- | --- | --- |
| Bez ID (2 běhy, první zahřívací běh 68 vynechán) | 81, 81 | 5,1 s | 20 ms |
| S testovacími ID (3 běhy) | 81, 80, 81 | 5,1 s | 90 až 120 ms |

Rozdíl je nejvýš 1 bod (kritérium 14 dovoluje 3).

### Screenshoty

`screens/banner-{cs,en}-{1440,390}.png` a `screens/settings-{cs,en}-{1440,390}.png` (obnovené v kole 2).
`screens/fix-footer-{1440,390,320}.png`: konec stránky `/cs` s otevřenou lištou po opravě B1.

## Známá omezení

- Vznik `_ga` se skutečnou službou GA4 (kritérium 6) ověří tester na produkci. Místně ho ověřil skutečný gtag.js
  s testovacím ID.
- Konverzi v Google Ads (kritérium 10) dodá import klíčové události `generate_lead` z GA4. Kód posílá jen událost
  do GA4. Import má zpoždění až 24 hodin.
- Past na roboty ve formuláři vrací `success`, takže pošle `generate_lead` (kapitola 11 architektury to přijímá).
- Živý náhled v administraci je v layoutu webu, takže také měří.
- Skript obsahu publikuje stránku z publikované verze. Rozpracovaný koncept stránky v administraci by se tím
  přepsal. Před spuštěním zkontrolujte koncept, nebo spusťte nejdřív `--dry-run`.
- Místní vývoj s kopií produkční databáze by posílal data do produkční služby GA4. Před kopírováním vyprázdněte
  pole `measurement`.

## Kroky na produkci po nasazení

1. Filip potvrdí odstavec o cookies a větu o hostingu (otázka 16.1).
2. Zkontrolujte plánované změny:
   `SEED_REMOTE_EMAIL=… SEED_REMOTE_PASSWORD=… pnpm seed:cookie-policy --remote=https://robopipe.io --dry-run`
3. Spusťte stejný příkaz bez `--dry-run`. Kód 2 znamená, že skript nenašel odstavec. Upravte ho v administraci.
4. Otevřete `/cs/ochrana-osobnich-udaju` a `/en/privacy-policy`. Zkontrolujte odstavec „Cookies a měření“.
5. V administraci otevřete *Site Settings → Measurement*.
6. Vyplňte `G-F89GSGDB8T` a `AW-16874443332`. Uložte.
7. Otevřete web v anonymním okně. Zkontrolujte lištu a cookie `_ga` po „Přijmout vše“.
8. V GA4 označte `generate_lead` jako klíčovou událost (Arthur).
9. V Google Ads importujte `generate_lead` z GA4 jako primární konverzi „Lead“ (Arthur).
10. Volitelně importujte `contact_click` jako sekundární konverzi (otázka 16.2).

## Kolo 2

Tester vrátil větev s verdiktem „nelze sloučit“ (`test-report.md`, oddíl „Nalezené chyby“). Opravy:

| Chyba | Oprava | Commit |
| --- | --- | --- |
| B1 lišta zakrývá konec stránky | Místo pod lištou (odchylka 8). Nižší lišta na telefonu (odchylka 9). | `f0a3e18` |
| B2 poškozená `rp_consent` shodí stránku | `readCookie` vrátí `undefined`, když `decodeURIComponent` selže. Platí pro všechny volající (`ConsentProvider`, `localeSuggestion`). | `84199b9` |
| B3 odvolání nesmaže `_gac_*` | `_gac_*` patří do kategorie marketing (odchylka 12). | `ce82f67` |
| B4 fokus po volbě | Fokus jde na `<main>` (odchylka 10). | `8d46dc5` |
| B5 záložky drží starou volbu | `BroadcastChannel` (odchylka 11). | `e378961` |

Výška lišty s otevřenou stránkou `/cs`, změřená v Chrome:

| Okno | Před | Po |
| --- | --- | --- |
| 1440 × 900 | 140 px | 140 px (16 %) |
| 390 × 844 | 36 % | 224 px (27 %) |
| 320 × 568 | 50 % | 224 px (39 %) |

Nové testy: `consent.e2e.spec.ts` má test fokusu po volbě v liště a po uložení v dialogu z lišty (B4), test dvou
záložek (B5) a test patičky na 390 a 320 px (B1). Test „13: at 390 px“ teď chce výšku nejvýš 30 % okna
a Přijmout a Odmítnout vedle sebe se stejnou velikostí. `consent.int.spec.ts` kontroluje `_gac_*` a poškozenou
hodnotu cookie. Testy testera (`consentTesterFindings.*`) jsou beze změny.

Výsledky (11. 11. 2026, server `next start` na portu 3921, databáze `robopipe_21`):

| Kontrola | Výsledek |
| --- | --- |
| `tsc --noEmit` | prošlo |
| `pnpm lint` | 0 chyb, 2 stará varování |
| `pnpm test:int` | 27 souborů, 162 testů, vše prošlo |
| `pnpm build` | prošlo |
| `test:e2e` (celá sada, oba projekty) | 118 prošlo, 0 selhalo. Známé chyby (blog s dlouhým titulkem, článek jen v produkci) se v tomto běhu neprojevily. |

Běh e2e měl vyplněná testovací ID. Před i po běhu měla `site_settings` hodnoty `G-TEST000000` a `AW-000000000`.
HTML `/cs` před během obsahovalo obě ID. Tvrzení z kola 1 (111 prošlo) tester zpochybnil, protože běh mohl mít
prázdná ID. Tento běh to vylučuje.

Otevřená otázka pro Filipa: text o cookies (`src/seed/cookiePolicy.ts`, kapitola 15 architektury) jmenuje jen
`_gcl_*`. Pokud má text jmenovat i `_gac_*`, je nutné ho upravit. Text jsem bez souhlasu neměnil.

