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

`screens/banner-{cs,en}-{1440,390}.png` a `screens/settings-{cs,en}-{1440,390}.png`.

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
