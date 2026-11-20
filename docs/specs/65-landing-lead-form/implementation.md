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
