# #19 Opravy SEO v kódu: implementace

Podklad: audit viditelnosti z 11. 11. 2026, nálezy 1, 3, 5, 7 a 9. Režim B (jeden vývojář).

## Změny

| Část | Co | Proč | Soubory |
| --- | --- | --- | --- |
| a) Nález 1 | Layout načte mapu adres pro jazyk stránky (stránky, články, případové studie, sekce blog a případové studie). Přepínač v patičce z ní vezme adresu stránky ve druhém jazyce. Funguje to už v HTML ze serveru. Stránka bez překladu odkazuje na úvodní stránku druhého jazyka. | Přepínač dřív v HTML jen zaměnil předponu (`/cs/cenik` na `/en/cenik`, to je 404). Hreflang četl až v prohlížeči. Roboti bez JavaScriptu tak na každé stránce našli odkaz na 404. | `src/lib/paths.ts`, `src/lib/queries.ts` (`getLocaleSwitchPaths`), `src/lib/useLocaleHref.ts`, `layout.tsx`, `LanguageSwitcher.tsx` |
| b) Nález 3 | `<Analytics />` a `<SpeedInsights />` jsou pryč z layoutu. Balíčky `@vercel/analytics` a `@vercel/speed-insights` jsou pryč z `package.json`. `trackEvent` nic nedělá, dokud se nevybere nový nástroj. | Na Coolify oba skripty vrací 404 a dávají 2 chyby v konzoli. | `layout.tsx`, `src/lib/analytics.ts`, `package.json`, `pnpm-lock.yaml` |
| c) Nález 5 | Video v bloku Hero má `preload="none"`. Přehrávání (ztlumené, ve smyčce, `playsinline`) spustí skript po události `load`. Pole `image` bloku slouží jako plakát (varianta 1080 px), když je vyplněné. Obrázek v Hero má `sizes` a `fetchpriority="high"`. | Video 5 MB se stahovalo hned se stránkou. Obrázek LCP na stránkách řešení stahoval variantu 3840 px. | `src/blocks/Hero/Component.tsx`, `src/blocks/Hero/HeroVideo.tsx`, `src/blocks/Hero/config.ts` (jen popis pole), `src/components/Media.tsx` |
| d) Nález 7 | Organization má `foundingDate`, `numberOfEmployees`, `parentOrganization` (KOALA42) a LinkedIn Robopipe v `sameAs`. Adresa kanceláře z nastavení webu je `PostalAddress`. | Modely AI a Google skládají entitu firmy z těchto polí. | `src/lib/jsonLd.ts` |
| e) Nález 9 | Titulek výpisu blogu je cs „Blog o strojovém vidění a kontrole kvality \| Robopipe“ a en „Blog on machine vision and quality control \| Robopipe“. Nový klíč `blog.metaTitle` jde do `seo.title`, stejně jako u případových studií. Chip, drobečková navigace a JSON-LD dál používají `blog.title` („Blog“). | Titulek „Blog \| Robopipe“ byl v obou jazycích stejný a neříkal, o čem blog je. | `blog/page.tsx`, `src/i18n/messages/cs.json`, `en.json` |

Rozhodnutí:

- a) Stránky zůstávají statické (SSG a ISR, `revalidate = 600`). Layout nečte hlavičky požadavku. Mapa jde z layoutu do přepínače přes kontext. Přepínač zná cestu stránky z `usePathname`, to funguje i při vykreslení na serveru.
- c) Atribut `autoplay` už ve značce není. S ním prohlížeč stahuje video hned a `preload` ignoruje. Skript volá `play()` na ztlumeném videu. To povolí Chrome i Safari na iPhonu. Bez JavaScriptu video nehraje a zůstane plakát (nebo barevná plocha).
- c) Plakát ze snímku videa jsem nedělal. Knihovna médií pro video snímek nemá. Vytvořit ho bez ruční práce by vyžadovalo ffmpeg v obrazu Dockeru a novou migraci. V produkci blok Hero úvodní stránky nemá obrázek, jen video (`hero-cs.mp4`). Plakát se tam ukáže, až někdo v administraci nahraje obrázek do pole `image` bloku Hero. Pole není lokalizované, video ano.
- d) Údaje jsou konstanty v kódu se zdrojem v komentáři. `foundingDate` je `2025-12-31` (ARES, datum vzniku robopipe s.r.o.). Text „práce od roku 2024“ na /o-nas mluví o produktu, ne o firmě, proto ho nepoužívám. `numberOfEmployees` je 5 (/o-nas: „tým 5 lidí“). KOALA42 má jako `sameAs` jen svůj LinkedIn, protože web jinou adresu KOALA42 neuvádí.

Vynechané:

- `founder`: zakladatele web ani ARES neuvádí.
- Sídlo z ARES (Plynární 1032/29) jako `legalAddress`: zadání chce jen kancelář jako dosud.
- LinkedIn KOALA42 zůstává v `sameAs`, protože ho tam dává nastavení webu (pole socials). Patří spíš k mateřské firmě. Smazat ho může Filip v administraci.
- Nové měření návštěvnosti (rozhodne se zvlášť).

Migrace: žádná. Změna popisu pole v administraci nemění schéma.

## Testy

Místní databáze `robopipe_19` (migrace přes `pnpm seed`), server `next start` na portu 3919 (ukončen podle PID).

| Kontrola | Výsledek |
| --- | --- |
| `tsc --noEmit` | prošlo |
| `eslint .` | 0 chyb, 2 stará varování |
| `pnpm build` | prošlo |
| `test:int` | 24 souborů, 135 testů, vše prošlo. Nové: `tests/int/localeSwitch.int.spec.ts`, rozšířený `jsonLd.int.spec.ts`. |
| `test:e2e` | 98 prošlo, 2 selhaly. Obě chyby jsou známé: blog s dlouhým titulkem a článek jen v produkci (`co-je-vizualni-system-…` vrací lokálně 404). |
| a) `tests/e2e/localeSwitch.e2e.spec.ts` | Všech 44 adres z místní sitemap: odkaz přepínače v HTML ze serveru (bez JavaScriptu) se shoduje s hreflang stránky a vrací 200. Produkční sitemap má 58 adres. Místní seed má méně stránek. |
| c) `tests/e2e/heroVideo.e2e.spec.ts` | Chromium (Chrome) a WebKit (iPhone 14): video má `preload="none"`, nemá `autoplay` a `currentTime` po načtení roste. |
| c) Plakát | Ručně v místní databázi: s obrázkem v Hero má video `poster` (varianta 1080 px, odpověď 200). Bez obrázku `poster` chybí. |
| e) Titulek blogu | Místní build: `/cs/blog` a `/en/blog` mají nový text v `<title>`, `og:title` a `twitter:title`. `tsc --noEmit` a `pnpm build` prošly. |

Spuštění testů na jiném portu:

```sh
PLAYWRIGHT_CHROMIUM_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
NEXT_PUBLIC_SERVER_URL=http://localhost:<port> E2E_BASE_URL=http://localhost:<port> \
  pnpm test:e2e tests/e2e/localeSwitch.e2e.spec.ts tests/e2e/heroVideo.e2e.spec.ts
```

Projekt `webkit-iphone` v `playwright.config.ts` spouští jen test videa. Potřebuje `playwright install webkit`.

## Lighthouse mobil (místní build)

Lighthouse 12, mobil, simulované omezení, Chromium 1248. Dva běhy na adresu. Před: build s částí a). Po: build s částmi a) až c).

| Stránka | Před: výkon | Před: LCP | Po: výkon | Po: LCP |
| --- | --- | --- | --- | --- |
| `/cs` | 86, 81 | 4,1 s, 5,1 s | 83, 87 | 4,8 s, 4,1 s |
| `/cs/kamerova-kontrola-kvality` | 79, 83 | 5,7 s, 4,8 s | 80, 83 | 5,4 s, 4,8 s |

Rozdíl skóre je v rozptylu měření. Jasný rozdíl: obrázek LCP na stránce řešení se stahuje v šířce 750 místo 3840 (místně 95 KiB na 39 KiB). Prvek LCP na `/cs` je text pod nadpisem, ne video. Místní server nemá CDN a místní video (`line-loop.mp4`, 13,5 MB) není produkční. Skutečný účinek ukáže až měření produkce po nasazení.
