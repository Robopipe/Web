# #61 Zdroj poptávky (utm a odkazující stránka): implementace

## Co je hotové

- Formulář při odeslání přidá do dat formuláře `utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, `utm_content` z adresy stránky s formulářem a odkazující stránku z `document.referrer`. Na zařízení návštěvníka nic neukládá. Platí vždy, i bez souhlasu (`src/components/LeadForm.tsx`).
- Se souhlasem s analytikou uloží `ConsentProvider` utm hodnoty a odkazující stránku prvního přistání do cookie `rp_source` na 90 dní. Platná cookie zůstává (první přistání), nová ji nepřepíše. Přistání bez utm a bez cizí odkazující stránky cookie nezapíše. Bez souhlasu hodnoty zůstanou v paměti stránky a souhlas během návštěvy je uloží (stejně jako `rp_click`).
- `rp_source` je v `GOOGLE_COOKIES.analytics` v `src/lib/consent.ts`. Odmítnutí analytiky cookie smaže.
- Server (`src/actions/submitLead.ts`) přečte cookie jen se souhlasem s analytikou a všechny hodnoty znovu vyčistí. Pole jsou ve skupině `attribution` v `leads`: `utmSource`, `utmMedium`, `utmCampaign`, `utmTerm`, `utmContent`, `referrer`, `sourceFrom`, `landedAt`. V administraci jsou jen pro čtení.
- Oznamovací e-mail o poptávce má nové řádky `utm_*`, `Referrer` a `Source from`.
- Migrace `20261120_085941_lead_source`: 8 sloupců s hodnotou NULL a typ `enum_leads_attribution_source_from`. Existující poptávky zůstanou beze změny.

## Priorita hodnot

Platná cookie `rp_source` (se souhlasem s analytikou) má přednost jako celek. Adresa stránky s formulářem je záloha. Hodnoty se nemíchají: poptávka nikdy nemá utm z jedné návštěvy a odkazující stránku z jiné. Pole `sourceFrom` říká, odkud hodnoty jsou (`landing` nebo `formPage`). `landedAt` je čas prvního přistání, jen u `landing`.

## Čištění vstupu (`src/lib/leadSource.ts`)

- utm: NFC, bílé znaky na mezeru, povolená jsou jen písmena, číslice, mezera a `_ . - + : / | ( ) & , ! ? # @ % ~ * =`. Úvodní `= + - @` a mezery jdou pryč (vzorec v CSV). Nejvýš 100 znaků. Vstup delší než 2048 znaků se zahodí.
- Odkazující stránka: jen `http` a `https`, bez uživatele, hesla, query stringu a fragmentu. Vlastní doména (hostitel z požadavku, `x-forwarded-host` a `NEXT_PUBLIC_SERVER_URL`, i s `www` a subdoménami) se neukládá. Delší než 300 znaků: jen origin.
- Kolekce má `maxLength` 100 a 300. Když databáze poptávku s atribucí odmítne, `createLeadWithAttribution` ji uloží bez atribuce. Měření poptávku nikdy neztratí.

## Migrace v produkci

Coolify staví obraz z `Dockerfile` při nasazení z `master`. Krok `builder` spustí `pnpm payload migrate && pnpm build` proti produkční databázi (secret `DATABASE_URL`). Migrace tedy proběhne sama před buildem. Ruční krok není potřeba. Když migrace selže, build selže a stará verze běží dál.

## Jak ověřit

1. `pnpm payload migrate`.
2. `pnpm test:int` (soubor `tests/int/leadSource.int.spec.ts`).
3. Spusťte server a `E2E_BASE_URL=... pnpm test:e2e tests/e2e/leadSource.e2e.spec.ts`.

## Otevřené body

- Text zásad cookies (`src/seed/cookiePolicy.ts`) zatím nezmiňuje `rp_source` ani ukládání utm a odkazující stránky k poptávce. Text potřebuje schválení (Filip), proto je mimo tuto změnu.
- Prohlížeč posílá u přechodu z HTTPS na jiný web obvykle jen origin (`strict-origin-when-cross-origin`). Cesta odkazující stránky proto často chybí.
- Odkazy z aplikací (`android-app://…`) se neukládají.
