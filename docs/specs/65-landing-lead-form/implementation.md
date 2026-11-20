# #65 Formulář poptávky na cílových stránkách reklam: implementace

## Cílové stránky

Kampaň ve vyhledávání (`output/robopipe-web/ads/search-2026-11-19/kampan.json` v pracovním prostoru asistenta, čte ho `scripts/gads_search_campaign.py`) má tři `final_url`:

- `/cs` (domovská stránka),
- `/cs/kamerova-kontrola-kvality`,
- `/cs/detekce-vad-na-vyrobni-lince`.

## Stav před změnou

- Žádná z těchto stránek nemá blok `contactForm`. Obsah stránek je v Payloadu. Seed `landing-pages.json` dává oběma stránkám služeb jen `cta` (tlačítko „Domluvit demo“ na `/cs/kontakt`). Domovská stránka v seedu formulář také nemá. Místní kopie databáze to potvrzuje: blok `contactForm` mají jen `kontakt` a `o-nas`.
- Telefon byl povinný ve formuláři (`required`, kontrola v `LeadForm`) a na serveru (`z.string().min(1)` v `submitLead`). V kolekci `leads` povinný nebyl, proto migrace není potřeba.

## Co je hotové

- Skript `pnpm seed:landing-lead-form` (`src/seed/landingLeadForm.ts`) přidá na tři stránky blok `contactForm` bez postranního panelu (`showSidebar: false`), před závěrečný `ctaBanner`. Závěrečná výzva zůstane. Nadpis a drobný text jsou stejné jako na stránce kontaktu (`seed-assets/copy/landing-lead-form.json`, cs i en).
- Formulář je stejná komponenta `LeadForm` jako na `/cs/kontakt`. Utm a odkazující stránka (#61), souhlasy a značka kliknutí (#26), událost `generate_lead` a data pro rozšířené konverze (#21, #26), honeypot a limit 5 odeslání za hodinu na IP a e-mail o nové poptávce proto fungují beze změny.
- Telefon je nepovinný: popisek „Telefon (nepovinné)“ / „Phone (optional)“ jako u společnosti, bez `required`, server přijme prázdnou hodnotu. E-mail o poptávce řádek `Phone` bez telefonu vynechá (beze změny). Jméno, e-mail a zpráva zůstávají povinné.
- Čtení argumentů skriptů je ve sdíleném `src/seed/seedArgs.ts`. `seed:service-video` ho používá také.

## Skript

Skript běží stejně jako `seed:service-video`. Druhý běh nic nemění. Stránku s nepublikovaným konceptem přeskočí. Stránku, která už nějaký blok `contactForm` má, nechá beze změny.

1. Spusťte `pnpm seed:landing-lead-form --dry-run --remote=https://robopipe.io` a zkontrolujte výpis.
2. Spusťte `pnpm seed:landing-lead-form --remote=https://robopipe.io`.

Účet je v `SEED_REMOTE_EMAIL` a `SEED_REMOTE_PASSWORD`. Skript spusťte až po nasazení kódu (nepovinný telefon).

## Testy

- `tests/int/landingLeadForm.int.spec.ts`: pozice bloku, argumenty, skript s Payloadem (oba jazyky, druhý běh, koncept) a `submitLead` bez telefonu (uloží zdroj, e-mail bez telefonu, jméno, e-mail a zpráva povinné).
- `tests/e2e/landingLeadForm.e2e.spec.ts`: formulář na šesti stránkách (cs, en), poptávka bez telefonu z kliknutí na reklamu s utm (souhlasy, `gclid`, utm, jedna událost `generate_lead`).

## Round 2

### Pages with the form

Filip asked for the form on every published page that sells a service or a solution. The list is in `seed-assets/copy/landing-lead-form.json` (Czech slugs). It has 15 pages. Filip removed the home page from the list on 2026-11-20: the form is for industry, service and narrow search pages only. The production list comes from `https://robopipe.io/api/pages?limit=200&depth=0&locale=cs` on 2026-11-20.

- Services: `kamerova-kontrola-kvality` (7), `detekce-vad-na-vyrobni-lince` (8).
- Industries: `obory` (3).
- Use cases: `pocitani-kusu-kamerou` (9), `kontrola-etiket` (10), `kontrola-kompletnosti-baleni` (11), `automaticka-anotace` (12).
- Narrow search pages, made in the admin in production only: `ceska-ai-kamera-pro-kontrolu-kvality` (14), `kamerova-kontrola-kvality-na-pronajem` (15), `kamerova-kontrola-do-mokreho-provozu` (16), `kamerova-kontrola-svaru-obalu` (17), `pocitani-kapsli-kamerou` (18), `kontrola-data-spotreby-a-sarze-kamerou` (19), `open-source-strojove-videni` (20), `ai-kamera-bezpecnost-skladu` (21).

Pages without the form:

- `home` (5): Filip does not want the form on the home page.
- `kontakt` (1) and `o-nas` (13) already have a `contactForm` block.
- `cenik` (2) has its own enquiry path. Each pricing tier links to `/cs/kontakt?tier=...`.
- `ochrana-osobnich-udaju` (4) is a legal page.
- Blog posts and the login are not in the `pages` collection.

A new landing page needs its slug in the JSON file. Then run the script again.

### Industry select arrow

The select uses `appearance-none` and its own SVG chevron. The chevron sits 14 px (`right-3.5`) from the right edge, the same inset as the field text. It is vertically centred. A measurement in Chromium desktop, Chromium on a Pixel 7, WebKit on an iPhone 14 and WebKit desktop gave a 14 px inset and a 0 px centre offset.

### Tests

- The int suite adds a minimal published stand-in for each page that the local database does not have (14 to 21). It deletes them after the run.
- The e2e suite reads the page list from the JSON file and checks both locales. It finds a page by its Czech slug and then reads the path in each locale. A page that is not in the local database is skipped.
- A new e2e test checks the chevron inset and centre in Chromium.

The first e2e run of round 2 gave 23 skipped tests instead of 16. The lookup used the English locale with the Czech slug. Only `home` has the same slug in both locales, so 15 English tests were skipped. The lookup now always uses the Czech locale.
