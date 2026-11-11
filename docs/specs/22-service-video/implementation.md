# #22 Video s vysvětlením na stránkách služeb: implementace

Režim B (jeden vývojář). Větev `feat/22-service-video` z `origin/master` (po sloučení #21, PR #23 a #24).

## Co je hotové

1. Video https://www.youtube.com/watch?v=8PjTE75sGm4 je na pěti stránkách služeb v cs i en, hned nad sekcí FAQ:
   `kamerova-kontrola-kvality` / `camera-quality-inspection`, `detekce-vad-na-vyrobni-lince` / `defect-detection`,
   `pocitani-kusu-kamerou` / `camera-part-counting`, `kontrola-etiket` / `label-inspection`,
   `kontrola-kompletnosti-baleni` / `packaging-completeness-inspection`.
2. Přehrávač se načte až po kliknutí. Před kliknutím stránka ukáže jen náhled z vlastního webu (médium v Payloadu, přes `/_next/image`) a nativní tlačítko `<button>` s přístupným popiskem. Enter i mezerník fungují. Před kliknutím nejde žádný požadavek na YouTube ani Google a nevznikne žádná cookie třetí strany.
3. Po kliknutí se vloží iframe z `https://www.youtube-nocookie.com/embed/<id>` s `autoplay=1`, `hl` a `cc_lang_pref` podle jazyka stránky a `rel=0`. Na stránce v jiném jazyce, než mluví video (en u českého videa), přidá `cc_load_policy=1`, takže titulky běží od začátku. Fokus jde do iframe.
4. Každá stránka s videem má JSON-LD `VideoObject`: `name`, `description`, `thumbnailUrl` (absolutní adresa náhledu z webu), `uploadDate` (`2026-11-11`), `duration` (`PT50S`), `embedUrl` (`https://www.youtube.com/embed/<id>`), `url` (stránka videa na YouTube), `inLanguage`, `publisher`. JSON-LD skládá stávající `src/lib/jsonLd.ts` a komponenta `JsonLd` na stránce `[slug]`.
5. Úvodní stránka a kontakt video nemají. Ověřuje to e2e test.

## Datový model

Každý údaj existuje jednou.

- Kolekce `videos` (`src/collections/Videos.ts`, skupina Content):
  - `title`, `description`, `playLabel`: lokalizované (cs, en). Nadpis nad přehrávačem, text pod ním, přístupný popisek tlačítka. `title` a `description` jsou i v `VideoObject`.
  - `url`: adresa na YouTube. Validace přijme tvar watch, youtu.be, embed, shorts a nocookie.
  - `thumbnail`: upload do `media` (náhled 16:9).
  - `language`: mluvený jazyk videa (`cs`, `en`). Řídí titulky a `inLanguage`.
  - `uploadDate`: datum (jen den), `duration`: délka v sekundách.
- Blok `videoEmbed` (`src/blocks/VideoEmbed/`): jen relace `video` na kolekci `videos`. Pět stránek odkazuje na jeden dokument. Editor blok přesune nebo odebere v layoutu stránky jako každý jiný blok.
- Migrace `src/migrations/20261111_213459_service_video.ts`: tabulky `videos`, `videos_locales`, `pages_blocks_video_embed`, `_pages_v_blocks_video_embed`, sloupec `payload_locked_documents_rels.videos_id`. Vygenerovaný krok `down` mazal tabulku `videos` dřív než omezení v `payload_locked_documents_rels` a selhal. Pořadí je opravené. Up, down a znovu up jsou ověřené na `robopipe_22` (migrace ve vlastní dávce).

Kód:

- `src/lib/youtube.ts`: `youTubeId`, `youTubeEmbedUrl`, `youTubeWatchUrl`, `isoDuration`. Čisté funkce.
- `src/blocks/VideoEmbed/Component.tsx`: serverová komponenta, nadpis, text a přehrávač.
- `src/blocks/VideoEmbed/YouTubePlayer.tsx`: klientská komponenta, náhled a tlačítko, po kliknutí iframe a fokus.
- `src/lib/jsonLd.ts`: `videoObjectLd`, `videosFromLayout`.

## Obsah: seed a skript pro produkci

- Texty a nastavení: `seed-assets/copy/service-video.json`. Náhled: `seed-assets/img/service-video-thumbnail.jpg` (kopie `hero-video/explainer/youtube/thumbnail.jpg`, 1280×720).
- `src/seed/serviceVideo.ts` a CLI `pnpm seed:service-video` (`--dry-run`, `--production`, `--remote=<URL>`), ve stylu `seed:cookie-policy`.
  - Najde nebo vytvoří náhled v `media` (alt cs a en) a dokument ve `videos` (podle adresy). Existující dokument nemění, texty z adminu zůstanou.
  - Na každé z pěti stránek vloží blok `videoEmbed` (id `service-video-<slug>`) před první blok FAQ. Píše z publikované verze a publikuje.
  - Stránku přeskočí, když už má blok `videoEmbed`, nemá blok FAQ nebo má nepublikovaný koncept. Koncept by se jinak publikoval s ní.
  - Druhý běh nic nemění. Anglické hodnoty ostatních bloků zůstanou (ověřuje to integrační test).
- `pnpm seed` (nová databáze) volá skript po obsahu SEO/GEO.

## Jak to ověřit

Místně: databáze `robopipe_22` (vlastník `robopipe_local`, TCP), server `next start` na portu 3922.

```
npx pnpm payload migrate
npx pnpm seed
npx pnpm build && npx next start -p 3922
E2E_BASE_URL=http://localhost:3922 PLAYWRIGHT_CHROMIUM_PATH=".../Google Chrome" npx pnpm test:e2e tests/e2e/serviceVideo.e2e.spec.ts
```

Výsledky (11. 11. 2026, po rebase na `origin/master` 46e2b50):

| Kontrola | Výsledek |
|---|---|
| `tsc --noEmit` | 0 chyb |
| `pnpm lint` | 0 chyb, 2 starší varování (postcss.config.mjs, admin.e2e.spec.ts) |
| `pnpm test:int` | 28 souborů, 214 testů, vše prošlo (nový `serviceVideo.int.spec.ts`: 52) |
| `pnpm build` | prošel |
| `pnpm test:e2e` | 135 prošlo, 2 selhaly, obě mimo #22 (viz níže). Nový `serviceVideo.e2e.spec.ts`: 17 z 17 |

Dvě selhání e2e nesouvisí s touto změnou:

1. `blogFeaturedCard … long unbroken title`: starší chyba L1 z `docs/specs/3-blog-card-self-account/test-report.md`. Test selhává záměrně (749 px).
2. `seo-stage2 … every internal link … answers 200`: text stránky z #6 odkazuje na článek `/cs/blog/co-je-vizualni-system-…`. Místní seed ten článek nemá, proto 404.

Co e2e testy ověřují: na všech deseti stránkách žádný požadavek na youtube, youtube-nocookie, ytimg, google, gstatic, doubleclick a podobné před kliknutím. Dále žádný iframe a žádnou cookie mimo localhost. Video je před první otázkou a stránka má jeden `VideoObject` se správnými poli. Tlačítko se ovládá Enterem (cs) i mezerníkem (en), iframe má správnou adresu a dostane fokus. Po kliknutí jde požadavek jen na `www.youtube-nocookie.com`. Kliknutí myší funguje. Na šířce 390 px není vodorovný posuvník. Úvodní stránka a kontakt (cs, en) video nemají.

Screenshoty (`screens/`): `cs-1440-before.png`, `cs-390-before.png`, `en-1440-before.png`, `en-390-before.png` (sekce videa a začátek FAQ), `cs-1440-after-click.png` (přehrávač s titulky po kliknutí).

## Kroky na produkci po nasazení

1. Nasaďte kód. Migrace `20261111_213459_service_video` se spustí s nasazením jako ostatní migrace.
2. Zkontrolujte, že pět stránek služeb nemá nepublikovaný koncept. Skript stránku s konceptem přeskočí a vypíše ji.
3. Spusťte náhled: `SEED_REMOTE_EMAIL=… SEED_REMOTE_PASSWORD=… pnpm seed:service-video --remote=https://robopipe.io --dry-run`. Čekejte `created`: media a video, `updated`: pět stránek.
4. Spusťte totéž bez `--dry-run`.
5. Otevřete jednu stránku cs a en. Zkontrolujte náhled, přehrání a `VideoObject` (Rich Results Test).

## Známá omezení

- Bez JavaScriptu tlačítko nic neudělá. Náhled, nadpis, text a `VideoObject` jsou v HTML ze serveru.
- Po kliknutí může youtube-nocookie.com při přehrávání uložit data do prohlížeče (localStorage, případně cookies). Návštěvník to spustí sám kliknutím. Zásady cookies to zmiňují v odstavci o YouTube. `pnpm seed:cookie-policy` ho přidá na stránku, která už má odstavce z #21.
- Přehrávač nezávisí na souhlasu z cookie lišty (#21). Ochranu dává to, že se bez kliknutí nic nenačte a používá se youtube-nocookie. Tak to určuje zadání.
- `embedUrl` ve `VideoObject` je `www.youtube.com/embed`, standardní adresa přehrávače pro roboty. Návštěvník dostane nocookie.
- Blok `videoEmbed` jde vložit na kteroukoli stránku. `VideoObject` ale přidává jen šablona stránek `[slug]`. Úvodní stránka ho nepřidá.
