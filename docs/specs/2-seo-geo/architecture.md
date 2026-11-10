# Architektura: SEO a GEO pro Česko (issue #2)

Zadání: [`product.md`](./product.md). Tento dokument říká, kam patří každá změna, jak se dostane do produkce a jak ji ověřit. Implementace podle tohoto dokumentu nemá vyžadovat další rozhodnutí. Otevřené otázky pro Filipa jsou v kapitole 13. Každá má doporučenou odpověď a plán s ní počítá.

## 1. Zjištění z kódu a z produkce (10. 11. 2026)

| Oblast | Zjištění | Důkaz |
|---|---|---|
| Kořen `/` | Jazyk podle prohlížeče už funguje (`cs` a `sk` jdou na `/cs`, `de` a `en` na `/en`). Chybu dělá cookie `NEXT_LOCALE`. Middleware next-intl ji nastaví na `en` při každé návštěvě `/en/*` z českého prohlížeče a při požadavku bez `Accept-Language`. Od té chvíle kořen posílá na `/en`. | `curl -H 'Accept-Language: cs' https://robopipe.io/en` vrací `set-cookie: NEXT_LOCALE=en`. Pak `/` s touto cookie vrací `location: /en`. Kód: `node_modules/next-intl/dist/esm/development/middleware/syncCookie.js`. |
| `/llms.txt` | Vrací 500. Stejně vrací 500 každá cesta bez jazyka s tečkou (`/foo.txt`, `/ads.txt`). Matcher v `src/proxy.ts` vynechá cesty s tečkou. Next je pak předá do `[locale]` s hodnotou `llms.txt`. Layout zavolá `notFound()`, ale nad ním není žádný `not-found`, protože `[locale]/layout.tsx` je kořenový layout. | `curl` na `/llms.txt`, `/foo.txt` vrací 500. `/cs/neexistuje` vrací 404. |
| Strukturovaná data | Jen `Article` v `blog/[slug]/page.tsx`. `image` je rozbitý. | `"image":"https://robopipe.iohttps://storage.googleapis.com/..."` |
| Open Graph obrázek | `ogImageUrl()` v `src/lib/meta.ts` přidá `SERVER_URL` před absolutní URL z GCS. Výsledek je neplatná URL na každé stránce s obrázkem. Výchozí obrázek `site-settings.defaultSeo.image` kód nikde nepoužívá. | `<meta property="og:image" content="https://robopipe.iohttps//storage..."/>` |
| Případové studie | Kolekce `case-studies` už má lokalizovaný `slug`, `excerpt`, `metrics`, prázdné `content` a skupinu `seo`. `pathFor()` už zná cestu `/{locale}/case-studies/{slug}`. Chybí jen route detailu. | `src/collections/CaseStudies.ts`, `src/lib/paths.ts`. V produkci 4 publikované studie, `content` je prázdné v obou jazycích. |
| Slugy studií | Lokální `pnpm seed` vytváří stejné slugy jako produkce. | `src/seed/index.ts:401-490` |
| FAQ | Kolekce `faqs` (9 záznamů v produkci) a komponenta `FAQList` existují. FAQ je v blocích `faqAccordion` (ceník) a `splitSection.faq` (úvod). | `src/blocks/FAQAccordion/Component.tsx` |
| Pás loga | Na úvodní stránce je jen blok `logoCloud` se zákazníky („Důvěřují nám…“). Pás „Jsme součástí“ neexistuje. Patička nemá pole pro loga. | API `pages/5`, `src/globals/Footer.ts` |
| Redirecty | Kolekce `redirects` je prázdná. Používá ji jen route `[locale]/[slug]`. Mapa ze Shopify posílá na `/en/ai-product-tagging`, což dnes vrací 404. | `next.config.ts`, `curl` |
| SEO plugin | Projekt nepoužívá `@payloadcms/plugin-seo`. SEO pole je vlastní `seoField` v `src/fields/seo.ts`. Zůstává. | `src/payload.config.ts` |
| Testy | `tests/e2e/frontend.e2e.spec.ts` je zbytek šablony a dnes selže (čeká titulek „Payload Blank Template“). Integrační testy píšou do databáze z `DATABASE_URL`. | soubory v `tests/` |
| Auto anotace ve Studiu | Funkce předanotace (GPT a SAM 3, běží jako úloha na pozadí, kontrola po oblastech) je ve větvi `origin/release` (vydání 30. 10. 2026). Ve větvi `main` není, `main` je starý fork Label Studia. `rnd/auto_annotate/` je jen výzkumný prototyp (Gemini a SAM 3). | `git -C ~/Documents/Studio-private merge-base --is-ancestor a9e57f07 origin/release` |
| Logo platformy | Oficiální mediakit je odkaz „Mediakit“ v patičce innovationczechia.cz (Google Drive `1FnJDB-PMpidL1cCZ-_Se710C72EFiP5V`). | HTML stránky innovationczechia.cz |

## 2. Hlavní rozhodnutí

1. **Žádná nová kolekce ani nový blok.** Vstupní stránky a stránka auto anotace jsou dokumenty v kolekci `pages` složené z existujících bloků. Kód řeší jen to, co obsah nedokáže: detail případu užití, JSON-LD, `llms.txt`, hreflang, přesměrování kořene a loga členství.
2. **URL případů užití zůstává `/{locale}/case-studies`.** Mění se jen popisek v UI na „Případy užití“ a „Use cases“. Detail je `/{locale}/case-studies/{slug}` podle existujícího `pathFor()`. Kolekce se nepřejmenuje. Staré URL tak dál vrací 200 bez přesměrování a bez migrace dat.
3. **Struktura detailu je v poli kolekce, ne v blocích.** `case-studies` dostane lokalizovaná pole `problem`, `solution`, `result`, `technique` (rich text) a vztah `faqs` na kolekci `faqs`. Prázdné pole `content` se odstraní.
4. **Jeden zdroj pro členství.** Nové pole `site-settings.memberships` (logo, logo pro tmavé pozadí, název, URL) čtou tři místa: patička, pás na úvodní stránce (blok `logoCloud` s novou volbou `source: 'memberships'`) a JSON-LD `Organization.memberOf`.
5. **JSON-LD generuje jeden modul** `src/lib/jsonLd.ts` z dat, která stránka už vykresluje. Vkládá ho jedna komponenta `src/components/JsonLd.tsx`. Data FAQPage vznikají jen z FAQ, které jsou na stránce vidět.
6. **Sitemap a `llms.txt` čtou stejný seznam stránek** z nové funkce `getIndexableDocs()` v `src/lib/indexable.ts`. Žádný ručně psaný seznam URL.
7. **hreflang a canonical vzniká na jednom místě.** Nová funkce `alternatesFor()` v `src/lib/paths.ts` vrací mapu jazyků včetně `x-default`. Používají ji `buildMeta()`, sitemap a výpisy blogu a případů užití. `x-default` ukazuje na anglickou verzi dokumentu, ne na `/`, protože `/` je přesměrování a cíl hreflang má vracet 200.
8. **Kořen se řídí jen hlavičkou `Accept-Language`.** `routing.localeCookie = false`. Cookie `NEXT_LOCALE` se už nenastavuje ani nečte.
9. **Schéma jde do produkce migrací, obsah idempotentním skriptem.** Migrace Payload proběhne sama při nasazení (Dockerfile spouští `payload migrate` před buildem). Obsah zapíše skript `pnpm seed:seo-geo` až po Filipově schválení textů. Skript nikdy nepřepíše pole, které už má hodnotu.
10. **Texty jsou v repozitáři, v jednom místě.** Všechny nové texty jsou v `seed-assets/copy/seo-geo/`. Filip je schválí v PR. Stejné soubory čte skript pro produkci i lokální `pnpm seed`, takže lokální databáze a produkce mají stejný obsah.

## 3. URL schéma

| Obsah | cs | en |
|---|---|---|
| Kamerová kontrola kvality | `/cs/kamerova-kontrola-kvality` | `/en/camera-quality-inspection` |
| AI kontrola kvality | `/cs/ai-kontrola-kvality` | `/en/ai-quality-inspection` |
| Počítačové vidění | `/cs/pocitacove-videni` | `/en/computer-vision` |
| Strojové vidění | `/cs/strojove-videni` | `/en/machine-vision` |
| Auto anotace | `/cs/automaticka-anotace` | `/en/auto-annotation` |
| Výpis případů užití | `/cs/case-studies` | `/en/case-studies` |
| Potraviny (Crocodille) | `/cs/case-studies/crocodille-kvalita-na-lince` | `/en/case-studies/crocodille-line-quality` |
| Kapsle v dóze (Wolfberry) | `/cs/case-studies/wolfberry-pocitani-kapsli` | `/en/case-studies/wolfberry-capsule-counting` |
| Zalistování produktů | `/cs/case-studies/ai-tagovani-produktu` | `/en/case-studies/ai-product-tagging` |
| Kontrola balení (MG Servis) | `/cs/case-studies/mg-servis-kontrola-baleni` | `/en/case-studies/mg-servis-packaging-checks` |
| Koncept článku o auto anotaci | `/cs/blog/automaticka-anotace-dat` | `/en/blog/automatic-data-annotation` |

Pravidla:

- Slugy studií se nemění. Jsou to slugy z produkce.
- Segment `case-studies` zůstává stejný v obou jazycích, jak popisuje README.
- Každá stránka má `canonical` sama na sebe. hreflang obsahuje jen jazyky, kde dokument má slug. `x-default` je anglická URL, když existuje. Když anglická verze chybí, `x-default` se nevypíše.
- Kořen `/` není v hreflang ani v sitemap.

Přesměrování:

| Zdroj | Cíl | Kde |
|---|---|---|
| `/` | `/cs` nebo `/en` podle `Accept-Language`, 307 | `src/proxy.ts` (next-intl) |
| `/cs/case-studies`, `/en/case-studies` | bez přesměrování, výpis vrací 200 | route výpisu |
| shop: `/products/machine-vision-controller`, `/collections/all` | `https://robopipe.io/en/case-studies/ai-product-tagging` (dnes míří na 404) | `next.config.ts`, `shopRedirects` |
| změněný slug studie v budoucnu | záznam v kolekci `redirects` | nový společný helper, kapitola 5.6 |

## 4. Změny datového modelu Payload a migrace

Jedna migrace: `pnpm payload migrate:create seo_geo`. Vytvoří `src/migrations/<datum>_seo_geo.ts` a `.json`. Pak `pnpm generate:types` a commit `src/payload-types.ts`.

### 4.1 `case-studies` (`src/collections/CaseStudies.ts`)

Přidat za `metrics`:

```ts
{ name: 'problem', type: 'richText', localized: true },
{ name: 'solution', type: 'richText', localized: true },
{ name: 'result', type: 'richText', localized: true },
{ name: 'technique', type: 'richText', localized: true,
  admin: { description: 'Used techniques, e.g. object detection, counting, classification.' } },
{ name: 'faqs', type: 'relationship', relationTo: 'faqs', hasMany: true },
```

- Odstranit pole `content`. V produkci je prázdné v obou jazycích (ověřeno 10. 11.). Migrace odstraní sloupec z `case_studies_locales` i z tabulky verzí.
- Přidat `admin.preview` a `admin.livePreview` stejně jako v `Pages.ts`, s `collection: 'case-studies'`. `generatePreviewPath()` tuto kolekci už podporuje.
- Pole nejsou povinná. Detail vykreslí jen vyplněné sekce. Studie tak funguje i před spuštěním skriptu s obsahem.

### 4.2 `site-settings` (`src/globals/SiteSettings.ts`)

```ts
{
  name: 'memberships',
  type: 'array',
  admin: { description: 'Programmes and associations Robopipe is part of. Shown in the footer, in logo bands set to "Memberships" and in Organization structured data.' },
  fields: [
    { name: 'name', type: 'text', required: true },
    { name: 'url', type: 'text', required: true },
    { name: 'logo', type: 'upload', relationTo: 'media', required: true },
    { name: 'logoOnDark', type: 'upload', relationTo: 'media',
      admin: { description: 'Light variant for the dark footer. Falls back to logo.' } },
  ],
}
```

Pole nejsou lokalizovaná. Název programu a odkaz jsou stejné v obou jazycích.

### 4.3 Blok `logoCloud` (`src/blocks/LogoCloud/config.ts`)

- Nové pole `source`: `select`, volby `custom` (výchozí) a `memberships`, `defaultValue: 'custom'`. Existující bloky dostanou `custom` a vypadají stejně.
- `logos` dostane `admin.condition: (_, sibling) => sibling?.source !== 'memberships'`. Místo `required: true` a `minRows: 1` dostane `validate`, který vyžaduje aspoň jedno logo jen pro `custom`.

### 4.4 Co se v modelu nemění

`pages`, `posts`, `faqs`, `redirects`, `header`, `footer`, `seoField` a `slugField` zůstávají beze změny. Vstupní stránky jsou běžné dokumenty `pages`.

## 5. Změny kódu po modulech

### 5.1 Jazyk a přesměrování kořene

- `src/i18n/routing.ts`: přidat `localeCookie: false` do `defineRouting`. Proxy routing rozbaluje, takže změna platí i v `src/proxy.ts`.
- `src/proxy.ts`: opravit komentář. Cookie se už nepoužívá. Pořadí je: prefix v cestě, pak `Accept-Language`, pak `en`.
- Přepínač jazyka (`LanguageSwitcher.tsx`) se nemění. Volba jazyka v patičce platí pro odkaz, na který uživatel klikne. Kořen ji nepamatuje. To odpovídá zadání „podle jazyka prohlížeče“.

### 5.2 `/llms.txt`

- Nový soubor `src/app/llms.txt/route.ts` (`GET`, `export const revalidate = 600`, `Content-Type: text/plain; charset=utf-8`). Statická route má přednost před `[locale]`, takže `/llms.txt` přestane padat.
- Obsah skládá funkce `buildLlmsTxt(docs, settings)` v `src/lib/llmsTxt.ts`. Je čistá a testovatelná. Data dává `getIndexableDocs()` a `site-settings`.
- Formát podle llmstxt.org:

```
# Robopipe

> {site-settings.defaultSeo.description v cs}
> {site-settings.defaultSeo.description v en}

## Stránky / Pages
- [{title cs}](https://robopipe.io/cs/kamerova-kontrola-kvality): {seo.description cs}
- [{title en}](https://robopipe.io/en/camera-quality-inspection): {seo.description en}
...
## Případy užití / Use cases
...
## Blog
...
## Kontakt / Contact
- {site-settings.contactEmail}, {site-settings.contact.phone}
```

- Pořadí v sekci Stránky: nejdřív úvodní stránka, pak dokumenty podle `title` v češtině. Vstupní stránky tak nejsou ručně vyjmenované. Jsou v souboru, protože jsou publikované a nemají `noIndex`.
- Souhrn firmy nemá vlastní pole. Používá `defaultSeo.description`, které už existuje a je vyplněné.

### 5.3 Obecné 404 pro cesty s tečkou

- Nový soubor `src/app/global-not-found.tsx` (vlastní `<html>`, jednoduchá stránka 404 v angličtině, odkazy na `/cs` a `/en`) a v `next.config.ts` `experimental: { globalNotFound: true }`.
- Next 16.2 tuto volbu podporuje, ale je experimentální. Udělej to jako samostatný commit. Když build nebo test selže, commit vrať a napiš to do PR. `/llms.txt` na tomto kroku nezávisí.

### 5.4 Metadata, canonical, hreflang, Open Graph

- `src/lib/paths.ts`: nová funkce

```ts
export const alternatesFor = (
  urlsByLocale: Partial<Record<Locale, string>>, // absolute URLs
): Record<string, string> => ({
  ...urlsByLocale,
  ...(urlsByLocale.en ? { 'x-default': urlsByLocale.en } : {}),
})
```

- `src/lib/meta.ts`:
  - `ogImageUrl()`: přidat `SERVER_URL` jen tehdy, když URL začíná `/`. Absolutní URL vrátit beze změny.
  - `buildMeta()` přijme místo `collection` a `slugs` hotové cesty `paths: Partial<Record<Locale, string>>` a volitelné `type: 'website' | 'article'`. Volající stránky cesty spočítají přes `pathFor()`. Výpisy blogu a případů užití tak použijí stejnou funkci. Ruční `alternates` v `blog/page.tsx` a `case-studies/page.tsx` zmizí.
  - `buildMeta()` doplní `openGraph.url` (canonical), `openGraph.locale` (`cs_CZ` nebo `en_US`), `alternateLocale` a obrázek. Pořadí obrázku: `seo.image`, pak obrázek předaný volajícím (hero studie nebo článku), pak `site-settings.defaultSeo.image`. Výchozí obrázek dostane `buildMeta()` parametrem `fallbackImage`. Volající ho vezme z `getGlobals()`.
- `src/lib/queries.ts`: obalit `getGlobals` do `cache()` z Reactu. Layout, metadata i JSON-LD tak sdílí jeden dotaz na požadavek.

### 5.5 JSON-LD

Nový modul `src/lib/jsonLd.ts`. Čisté funkce bez přístupu k databázi:

| Funkce | Typ schema.org | Kde se vkládá | Zdroj dat |
|---|---|---|---|
| `organizationLd(settings)` | `Organization`, `@id: {SERVER_URL}/#organization` | `[locale]/layout.tsx`, každá stránka | `siteName`, `/logo.svg`, `contactEmail`, `contact.phone`, `contact.address` (jako text `address`), `socials` jako `sameAs`, `memberships` jako `memberOf` |
| `websiteLd(settings, locale)` | `WebSite`, `@id: {SERVER_URL}/#website`, `publisher` odkazem na organizaci, `inLanguage` | `[locale]/layout.tsx` | `siteName`, `SERVER_URL` |
| `productLd(home, locale)` | `Product`, `brand` a `manufacturer` odkazem na organizaci | jen úvodní stránka, `[locale]/page.tsx` | `title`, `seo.description`, `seo.image` úvodní stránky. Bez `offers`, ceny se nevymýšlí. |
| `blogPostingLd(post, locale)` | `BlogPosting` (nahradí `Article`) | `blog/[slug]/page.tsx` | stávající pole, opravený `image`, `publisher` odkazem, `inLanguage` |
| `faqPageLd(faqs)` | `FAQPage` | stránky s FAQ | otázky a odpovědi převedené na prostý text funkcí `convertLexicalToPlaintext` z `@payloadcms/richtext-lexical/plaintext` |
| `breadcrumbLd(items)` | `BreadcrumbList` | každá stránka kromě úvodní | Úvod, pak sekce (Blog, Případy užití), pak dokument |

- FAQ na stránce `pages` sbírá funkce `faqsFromLayout(layout)` v `src/lib/jsonLd.ts`. Prochází bloky `faqAccordion` (`faqs`) a `splitSection` (`faq.faqs`). Stejnou otázku vloží jednou (podle `id`). Detail studie bere `caseStudy.faqs`.
- Komponenta `src/components/JsonLd.tsx` vypíše `<script type="application/ld+json">`. Před vložením nahradí `<` za `<`, aby text z CMS nemohl ukončit tag `script`.
- Názvy položek drobečkové navigace jsou v překladech: `common.home`, `blog.title`, `caseStudies.title`.
- Úvodní stránka má `Organization`, `WebSite`, `Product` a `FAQPage` (FAQ ze `splitSection`).

### 5.6 Případy užití

- Nová route `src/app/(frontend)/[locale]/case-studies/[slug]/page.tsx` podle vzoru `blog/[slug]/page.tsx`: `revalidate = 600`, `generateStaticParams` přes `getCaseStudies` pro oba jazyky, `generateMetadata` přes `buildMeta`, podpora `draftMode` a `LivePreviewListener`.
- Obsah stránky: štítek oboru, logo zákazníka, `h1` = `title`, perex = `excerpt`, metriky, sekce `problem`, `solution`, `result`, `technique` (každá s `h2` z překladů `caseStudies.problem` atd.), FAQ přes `FAQList`, závěrečná výzva se stávajícími klíči `caseStudies.cta*`. JSON-LD: `BreadcrumbList` a `FAQPage`.
- `src/lib/queries.ts`: nová funkce `getCaseStudyBySlug(slug, locale, draft)` podle `getPostBySlug`.
- `src/components/CaseStudyCard.tsx`: karta je odkaz na detail (`pathFor('case-studies', slug, locale)`). Metriky přesunout do komponenty `CaseStudyMetrics`, kterou použije karta i detail. Upravit komentář „listing-only“.
- `src/lib/redirects.ts`: nová funkce `redirectOrNotFound(paths: string[])`. Přesunout do ní logiku z `[locale]/[slug]/page.tsx` (hledání v kolekci `redirects`, pak `notFound()`). Použít ji v `[slug]` i v novém detailu studie.
- `src/i18n/messages/cs.json` a `en.json`: `caseStudies.title` a `common.caseStudies` na „Případy užití“ a „Use cases“. Nové klíče `caseStudies.problem`, `solution`, `result`, `technique`, `faq`, `common.home`, `footer.memberOf` („Jsme součástí“, „Part of“). Upravit `caseStudies.headline` a `description` tak, aby obsahovaly cílový výraz. Text schvaluje Filip v PR.
- `next.config.ts`: dva cíle shop přesměrování z `/en/ai-product-tagging` na `/en/case-studies/ai-product-tagging`.

### 5.7 Sitemap

- Nový `src/lib/indexable.ts`, funkce `getIndexableDocs()`. Vrací pro `pages`, `case-studies` a `posts` seznam `{ collection, updatedAt, locales: { [locale]: { path, title, description } } }`. Dotaz: `locale: 'all'`, `depth: 0`, `overrideAccess: false`. Vynechá dokumenty s `seo.noIndex` a jazyky bez slugu. Popis bere z `seo.description`, pak z `excerpt`.
- `src/app/sitemap.ts` použije `getIndexableDocs()` a `alternatesFor()`. Přibudou detaily studií a `x-default`. Přidat `export const revalidate = 600`, aby sitemap nebyla zamrzlá od buildu.
- Nově se z sitemap vynechají i články s `noIndex`. Dnes tam jsou.

### 5.8 Loga členství

- `src/blocks/LogoCloud/Component.tsx`: když `source === 'memberships'`, vykreslí `settings.memberships` (`getGlobals(locale)`, komponenta je serverová). Jinak beze změny. Markup a styl zůstávají.
- `src/components/Footer.tsx`: pod poznámkou a sociálními sítěmi v prvním sloupci malý nadpis `t('memberOf')` a loga z `settings.memberships`. Použije `logoOnDark`, jinak `logo`. Odkaz `target="_blank" rel="noopener"`, `aria-label` = název. Výška loga stejná jako ikony sociálních sítí v řádku nad ním, aby se layout na mobilu nerozbil.
- Soubor loga: SVG z mediakitu (odkaz „Mediakit“ v patičce innovationczechia.cz). Světlou a tmavou variantu ulož do `seed-assets/img/innovation-czechia.svg` a `innovation-czechia-on-dark.svg`. Skript je nahraje do Media.

### 5.9 Testy, které dnes neprojdou

`tests/e2e/frontend.e2e.spec.ts` přepsat. Má ověřit, že `/cs` vrací 200 a má `h1`. Šablonový text „Payload Blank Template“ smazat.

## 6. Obsah v Payload

Veškerý obsah zapisuje skript z kapitoly 7. Texty jsou v `seed-assets/copy/seo-geo/`.

| Soubor | Co obsahuje |
|---|---|
| `landing-pages.json` | 5 stránek (4 vstupní, 1 auto anotace). Pro každý jazyk `title`, `slug`, `seo.title`, `seo.description` a pole bloků. |
| `case-studies.json` | Pro každou studii (klíč = anglický slug) `problem`, `solution`, `result`, `technique` v Markdownu a seznam FAQ. |
| `faqs.json` | Nové otázky a odpovědi (cs, en), každá s klíčem pro idempotenci. |
| `home.json` | Blok „Jsme součástí“ a sekce auto anotace na úvodní stránce, nové `seo.title` a `seo.description` úvodní stránky. |
| `navigation.json` | Nový sloupec patičky „Řešení“ / „Solutions“ s odkazy na 5 stránek, nový popisek hlavní navigace „Případy užití“. |
| `post-auto-annotation.cs.md`, `post-auto-annotation.md` | Koncept článku. Jen koncept, nikdy publikovat skriptem. |

### 6.1 Skladba vstupní stránky (stejná pro všechny 4)

1. `hero`: `h1` s přesným cílovým výrazem, jedna věta vysvětlení, tlačítko na kontakt.
2. `content`: srozumitelné vysvětlení pojmu a toho, jak to řeší Robopipe (300 až 600 slov, mezititulky `h2`).
3. `featureGrid` nebo `processSteps`: jak nasazení probíhá.
4. `caseStudyGrid`: ručně vybrané relevantní případy užití.
5. `faqAccordion`: 4 až 6 otázek, které se týkají právě tohoto výrazu.
6. `ctaBanner`.

Každá stránka má jiný úhel, aby si stránky nekonkurovaly:

| Stránka | Úhel |
|---|---|
| Kamerová kontrola kvality | hardware na lince, kamera IP67, kontrola každého kusu |
| AI kontrola kvality | učení na vlastních vzorcích, srovnání s pravidlovým strojovým viděním |
| Počítačové vidění | pojem obecně, co umí (detekce, počítání, klasifikace) a kde se to v průmyslu použije |
| Strojové vidění | průmyslové nasazení, integrace na lince, srovnání s klasickými systémy |

Vstupní stránky se navzájem odkazují v textu bloku `content`.

### 6.2 Pravidla pro texty

- Fakta o firmě, zákaznících a číslech jen z dnešního webu (úvod, obory, ceník, karty studií, publikované články). Žádná nová jména ani čísla.
- Fakta o auto anotaci jen z kódu Studia ve větvi `origin/release`: `apps/api/src/modules/vision-preannotate/`, `apps/api/src/modules/pre-annotate-settings/`, `apps/web/src/modules/label/components/PreAnnotateSettingsDialog/` a `Toolbar/`. Výzkumný prototyp `rnd/auto_annotate/` není zdroj.
- `seo.title` českých stránek obsahuje cílový výraz, nejvýše 60 znaků. `seo.description` nejvýše 155 znaků.

### 6.3 Úvodní stránka

- Za stávající `logoCloud` se zákazníky přidat nový `logoCloud` se `source: 'memberships'`, nadpis „Jsme součástí“ / „Part of“, `blockName: 'seo-geo-memberships'`.
- Před `testimonialBar` přidat `processSteps` o auto anotaci s tlačítkem na `/cs/automaticka-anotace`, `blockName: 'seo-geo-auto-annotation'`.

## 7. Jak se obsah dostane do produkce

### 7.1 Skript

- `src/seed/seoGeo.ts` exportuje `applySeoGeo(payload, { status, dryRun })`. Čte soubory ze `seed-assets/copy/seo-geo/`. Markdown převádí existující funkce `markdownToLexical` ze `src/jobs/markdown.ts`. Nekopíruj další verzi `mdToLexical`.
- `src/seed/applySeoGeo.ts` je CLI obal. Do `package.json` přidat `"seed:seo-geo": "cross-env NODE_OPTIONS=--no-deprecation tsx src/seed/applySeoGeo.ts"`.
- `src/seed/index.ts` na konci zavolá `applySeoGeo(payload, { status: 'published' })`. Čerstvá lokální databáze tak má stejný obsah jako produkce. Když je nastavená proměnná `SKIP_SEO_GEO=1`, volání přeskočí (pro test podle 7.2).

Pravidla skriptu:

1. Pojistka: když hostitel v `DATABASE_URL` není `localhost` ani `127.0.0.1`, skript skončí s chybou. Výjimka je přepínač `--production`.
2. `--dry-run` jen vypíše plánované změny.
3. `--status=draft` (výchozí) zapisuje do `pages`, `case-studies` a `posts` jen koncepty (`draft: true`). Publikovaná verze se nemění. Globals (`header`, `footer`, `site-settings`) koncepty nemají, takže je v tomto režimu přeskočí.
4. `--status=published` publikuje stránky, studie a globals. Článek o auto anotaci zůstává vždy koncept.
5. Idempotence: dokument se hledá podle slugu (stránky, článek), podle anglického slugu (studie), podle klíče (FAQ), podle `blockName` (bloky na úvodní stránce), podle názvu (členství, sloupec patičky). Když existuje, skript ho nevytváří znovu. Pole s hodnotou nepřepisuje. Popisek navigace a `seo` úvodní stránky změní jen tehdy, když mají dnešní hodnotu.
6. Média se nahrávají jen tehdy, když soubor se stejným názvem v Media ještě není.
7. Skript nesahá na jiné články. Paralelně vzniká článek o Manufacturing Forum a skript ho nesmí změnit.
8. Na konci skript vypíše seznam vytvořených a přeskočených položek.

Skript běží mimo Next.js, takže nevyvolá revalidaci. Stránky se obnoví do 10 minut (`revalidate = 600`). Nové URL se vykreslí při prvním požadavku.

### 7.2 Lokální vyzkoušení bez produkce

1. Nastav v `.env` lokální `DATABASE_URL` z `.env.example`. Nikdy nepoužívej produkční URL.
2. Spusť `docker compose up -d`.
3. Spusť `pnpm payload migrate`.
4. Spusť `pnpm seed`. Seed zavolá i `applySeoGeo`.
5. Spusť `pnpm seed:seo-geo` ještě jednou a ověř, že nic nevytvořil (idempotence).
6. Spusť `pnpm dev` a otevři stránky z kapitoly 3.

Pro test chování nad databází s produkční strukturou bez nového obsahu: smaž volume (`docker compose down -v`), zopakuj kroky 2 a 3, spusť `pnpm seed` s proměnnou `SKIP_SEO_GEO=1` a pak `pnpm seed:seo-geo --status=draft`.

### 7.3 Pořadí nasazení

1. Filip schválí texty v PR (soubory `seed-assets/copy/seo-geo/*`).
2. Lukáš nebo Filip sloučí PR. Coolify nasadí. Migrace proběhne při buildu. Bez obsahu web vypadá jako dnes, jen karty studií vedou na detail s perexem a metrikami.
3. Ve stejný den Arthur spustí `pnpm seed:seo-geo --production --status=draft` s produkční `DATABASE_URL` a proměnnými GCS. Filip zkontroluje koncepty v administraci přes náhled.
4. Po souhlasu Arthur spustí `pnpm seed:seo-geo --production --status=published`.
5. Ověř akceptační kritéria na produkci (kapitola 10, část „po nasazení“).

## 8. Okrajové případy

| Případ | Chování |
|---|---|
| Studie jen v jednom jazyce | Detail jen v tom jazyce. hreflang bez druhého jazyka. `x-default` jen tehdy, když existuje anglická verze. |
| Koncept studie nebo stránky | 404 pro veřejnost, v sitemap ani v `llms.txt` není. Náhled funguje přes `draftMode`. |
| `seo.noIndex` | Stránka má `robots: noindex`, chybí v sitemap i v `llms.txt`. |
| Změna slugu v administraci | Stará URL vrátí 404, dokud editor nepřidá záznam do `redirects`. Detail studie redirecty čte (helper z 5.6). |
| Prázdné sekce studie | Sekce i nadpis se nevykreslí. Bez FAQ chybí i `FAQPage`. |
| Odpověď FAQ s odkazy a tučným písmem | V JSON-LD prostý text. |
| Text v CMS obsahuje `</script>` | `JsonLd` nahradí `<` za `<`. |
| Prohlížeč se starou cookie `NEXT_LOCALE=en` | Cookie se ignoruje. Kořen se řídí `Accept-Language`. |
| `Accept-Language: sk` | `/cs` (ověřeno v produkci, hlídá to test). |
| Robot bez `Accept-Language` (Googlebot) | `/en`. Českou verzi najde přes hreflang a sitemap. |
| Dotaz v URL na kořeni (`/?utm_source=x`) | Zachová se (`/cs?utm_source=x`). |
| `/llms.txt` při výpadku databáze | 500 jako ostatní stránky. Žádná statická záloha, aby nevznikl druhý zdroj pravdy. |
| `site-settings.memberships` prázdné | Pás na úvodní stránce i blok v patičce se nevykreslí. `memberOf` chybí. |
| Stejná FAQ ve dvou blocích jedné stránky | V `FAQPage` jednou. |

## 9. Rizika

| Riziko | Dopad | Opatření |
|---|---|---|
| 4 vstupní stránky s podobným tématem si konkurují | Google vybere jen jednu, ostatní se nezobrazí | Jiný úhel každé stránky (6.1), jiné `h1` a `seo.title`, vzájemné odkazy |
| Odstranění pole `content` ze studií | Ztráta dat | Pole je v produkci prázdné. Před sloučením PR to Arthur znovu ověří přes API (`content` u 4 studií v obou jazycích). |
| Sloučení PR spustí migraci v produkci | Změna schématu bez obsahu | Migrace jen přidává sloupce a tabulky a maže prázdný sloupec. Nový kód zvládne prázdná pole. |
| `experimental.globalNotFound` | Build nebo chování se může změnit s verzí Next | Samostatný commit, test na `/foo.txt`, při problému vrátit (5.3) |
| `Product` bez `offers` | Google Rich Results test ukáže u fragmentu produktu chybu. Validátor schema.org projde. | Akceptační kritérium uznává validátor schema.org. Ceny lze doplnit později (otázka 4). |
| `FAQPage` | Google od roku 2023 nezobrazuje FAQ fragmenty komerčním webům | Data zůstávají, pomáhají jazykovým modelům. Rich Results test je ukáže jako platná. |
| Logo platformy v šedé (styl `logoCloud`) | Může porušit jejich logomanuál | Ověřit v mediakitu. Když šedá nevadí, nic neměnit. Jinak otázka 6. |
| Integrační testy píšou do `DATABASE_URL` | S produkční URL by test zapsal do produkce | Spouštět jen s lokální databází. Pojistka ze skriptu (7.1, bod 1) se přidá i do `vitest.setup.ts`. |
| Skript spuštěný s produkční URL omylem | Neschválené změny v produkci | Pojistka `--production`, výchozí režim koncept |
| Sociální síť `linkedin` míří na KOALA42 | `sameAs` spojí Robopipe s KOALA42 | Ponechat, je to dnešní obsah webu. Změna je mimo rozsah. |

## 10. Plán pro vývojáře

Pracuj ve větvi `feat/seo-geo-use-cases`. Po každém kroku spusť `pnpm lint` a `pnpm exec tsc --noEmit`. Testy spouštěj jen s lokální databází.

| # | Krok | Soubory | Test |
|---|---|---|---|
| 1 | Oprav šablonový e2e test. Přidej pojistku proti nelokální databázi do `vitest.setup.ts`. | `tests/e2e/frontend.e2e.spec.ts`, `vitest.setup.ts` | `pnpm test:e2e` projde na čistém seedu |
| 2 | `localeCookie: false`, komentář v proxy | `src/i18n/routing.ts`, `src/proxy.ts` | e2e `root-locale`: `/` s `cs` → `/cs`, se `sk` → `/cs`, s `de` → `/en`, bez hlavičky → `/en`, `cs` s cookie `NEXT_LOCALE=en` → `/cs`, odpověď na `/en` nemá `set-cookie: NEXT_LOCALE` |
| 3 | `alternatesFor`, oprava `ogImageUrl`, nové `buildMeta`, `cache()` pro `getGlobals`, přepis volajících | `src/lib/paths.ts`, `src/lib/meta.ts`, `src/lib/queries.ts`, všechny `page.tsx` s `generateMetadata` | int `meta`: absolutní URL obrázku zůstane, relativní dostane `SERVER_URL`, `x-default` = `en`, bez `en` chybí. e2e: každá URL z kapitoly 3 má jeden `canonical` na sebe a `og:image` začíná `https://` jen jednou. |
| 4 | Migrace schématu (4.1 až 4.3), `generate:types` | kolekce, global, blok, `src/migrations/*`, `src/payload-types.ts` | `pnpm payload migrate` na čisté databázi a na databázi po `pnpm seed` ze `master` |
| 5 | `JsonLd` a `jsonLd.ts`, vložení do layoutu, úvodu, `[slug]`, blogu | `src/lib/jsonLd.ts`, `src/components/JsonLd.tsx`, routy | int `jsonLd`: `faqPageLd` z Lexical vrátí prostý text, `breadcrumbLd` čísluje pozice od 1, `faqsFromLayout` odstraní duplicitu, escapování `</script>`. e2e: každá URL z kapitoly 3 má platný JSON v každém `ld+json` a očekávané typy (tabulka 5.5). |
| 6 | Detail studie, karta jako odkaz, `CaseStudyMetrics`, `redirectOrNotFound`, překlady, cíle shop přesměrování | 5.6 | e2e: 8 detailů vrací 200 a mají `h1`, `/cs/case-studies` a `/en/case-studies` vrací 200 a odkazují na detaily, neexistující slug → 404, záznam v `redirects` přesměruje |
| 7 | `getIndexableDocs`, nová sitemap | `src/lib/indexable.ts`, `src/app/sitemap.ts` | int `indexable`: koncept a `noIndex` chybí. e2e: `sitemap.xml` obsahuje všech 18 nových URL a u každé `hreflang` cs, en a `x-default`. |
| 8 | `/llms.txt` | `src/app/llms.txt/route.ts`, `src/lib/llmsTxt.ts` | e2e: 200, `text/plain`, obsahuje 10 URL vstupních stránek a 8 URL studií. int: `buildLlmsTxt` začíná `# Robopipe`. |
| 9 | Členství: blok, patička | `src/blocks/LogoCloud/*`, `src/components/Footer.tsx`, `seed-assets/img/innovation-czechia*.svg` | e2e: `/cs` a `/en` mají odkaz `https://innovationczechia.cz` v `main` i ve `footer` |
| 10 | Skript obsahu a texty | `src/seed/seoGeo.ts`, `src/seed/applySeoGeo.ts`, `src/seed/index.ts`, `package.json`, `seed-assets/copy/seo-geo/*` | int `seoGeo`: dvě spuštění po sobě nevytvoří duplicitu, ručně změněné pole se nepřepíše, režim koncept nezmění publikovanou verzi, bez `--production` skript odmítne vzdálenou databázi |
| 11 | README: SEO, případy užití, skript, jazyk kořene | `README.md` | čtení |
| 12 | `global-not-found` (samostatný commit) | `src/app/global-not-found.tsx`, `next.config.ts` | e2e: `/foo.txt` → 404, `/llms.txt` → 200 |
| 13 | Celková kontrola | | `pnpm build` projde. `pnpm test` projde. Lighthouse (kapitola 11). Mobilní e2e: na šířce 375 px nemá žádná URL z kapitoly 3 vodorovné posouvání (`scrollWidth <= innerWidth`). |

E2e testy patří do nového souboru `tests/e2e/seo.e2e.spec.ts`. Seznam URL vezmi z jednoho pole v testu, ne ze sitemap, aby test zachytil chybějící položky v sitemap.

## 11. Ověření akceptačních kritérií

| Kritérium | Před sloučením (lokálně) | Po nasazení (produkce) |
|---|---|---|
| Nové stránky 200, v sitemap s hreflang, titulek, popis, canonical, JSON-LD | e2e krok 3, 5, 6, 7 | `curl` na každou URL, sitemap |
| JSON-LD projde validací | HTML stránky (`curl localhost:3000/cs/kamerova-kontrola-kvality`) vlož do validator.schema.org v režimu kódu. Pro jednu vstupní stránku, jednu studii, úvod a článek. | Google Rich Results test na stejné 4 URL |
| `/llms.txt` 200 s odkazy | e2e krok 8 | `curl https://robopipe.io/llms.txt` |
| `Accept-Language: cs` → `/cs`, bez hlavičky → `/en` | e2e krok 2 | `curl -sI -H 'Accept-Language: cs' https://robopipe.io/` |
| Staré URL studií nevrací 404 | e2e krok 6 | `curl` |
| Logo platformy na úvodu a v patičce v obou jazycích | e2e krok 9 | prohlížeč |
| Stávající stránky a testy, build, Lighthouse SEO ≥ 95, mobil | `pnpm build && pnpm start`, pak `npx lighthouse http://localhost:3000/cs --only-categories=seo` a totéž pro `/cs/kamerova-kontrola-kvality`. Mobilní e2e. | Lighthouse na produkčních URL |

## 12. Co se nemění

- Jazyky, prefixy `/cs` a `/en`, lokalizované slugy, segmenty `/blog` a `/case-studies`.
- Přepínač jazyka a návrh jazyka podle země (`LocaleSuggestion`).
- Kolekce `pages`, `posts`, `faqs`, `redirects`, `leads` a jejich přístupová práva.
- Generování článků přes AI, cron, formuláře, ceník, design a Tailwind tokeny.
- Dockerfile, nasazení přes Coolify, `robots.ts`.
- Článek o Manufacturing Forum. Řeší ho jiný agent.

## 13. Otevřené otázky pro Filipa

1. **Smí skript před tvým schválením vytvořit v produkci neveřejné koncepty, abys je viděl v náhledu?** Doporučuji ano. Koncepty návštěvník nevidí. Jiný náhled bez stagingu není. Když ne, schválíš texty jen v souborech a na snímcích z lokálního webu.
2. **Je předanotace ve Studiu (vydání 30. 10.) dostupná všem zákazníkům?** Doporučuji psát jen o tom, co je ve větvi `release`, a ty to potvrdíš. Když funkce není pro všechny, stránka to musí říct.
3. **Zůstane adresa `/case-studies` i pro případy užití?** Doporučuji ano. Česká adresa `/cs/pripady-uziti` přinese malý zisk, ale přidá přesměrování a nový typ lokalizovaného segmentu.
4. **Má JSON-LD `Product` obsahovat ceny z ceníku?** Doporučuji zatím ne. Ceny by měly druhý zdroj v kódu. Validátor schema.org projde i bez nich.
5. **Mají cílové výrazy dostat i titulky stávajících českých stránek (úvod, obory, výpis případů užití)?** Doporučuji ano pro úvod a výpis, obory nechat. Nové titulky budou v PR ke schválení.
6. **Může logo platformy být šedé jako loga zákazníků?** Doporučuji ano, když to mediakit nezakazuje. Jinak dostane blok `logoCloud` volbu barevného zobrazení.
