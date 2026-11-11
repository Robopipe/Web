# Architektura: SEO a GEO etapa 2 (issue #6)

Zadání: [`product.md`](./product.md). Etapa 1: [`../2-seo-geo/architecture.md`](../2-seo-geo/architecture.md) a [`implementation.md`](../2-seo-geo/implementation.md).

Tento dokument říká, kam patří každá změna, jak se dostane do produkce a jak ji ověřit. Otázky pro Filipa jsou v kapitole 16. Každá má doporučenou odpověď. Plán počítá s doporučenou odpovědí a u každé otázky říká, co se změní při jiné odpovědi.

## 1. Zjištění (10. 11. 2026)

| Oblast | Zjištění | Důkaz |
|---|---|---|
| Obsah etapy 1 v produkci | Kód etapy 1 je nasazený. Obsah ne. Skript `pnpm seed:seo-geo` v produkci ještě neběžel. Vstupní stránky vrací 404. `site-settings.memberships` je prázdné. Studie nemají sekce `problem` až `technique`. | `curl` na `/cs/kamerova-kontrola-kvality` vrací 404. API `pages` vrací jen 5 stránek. Denní poznámka 10. 11.: čeká se na přístup do Coolify. |
| Stránka řešení už existuje v seedu | `/cs/kamerova-kontrola-kvality` a `/en/camera-quality-inspection` jsou v `seed-assets/copy/seo-geo/landing-pages.json`. Text nemá žádnou z variant z product.md bodu 1. | `grep` v `landing-camera-quality-inspection.cs.md` |
| Překryv s product.md bodem 3 | Seed etapy 1 má i stránky `/cs/ai-kontrola-kvality`, `/cs/strojove-videni` a `/cs/pocitacove-videni`. Product.md říká: úvodní stránka cílí na „AI kontrola kvality“ a „strojové vidění“ patří do existujícího průvodce, novou stránku nedělat. | `landing-pages.json`, product.md bod 3, `keywords.md` řádek 3 tabulky „Doporučení“ |
| Průvodce | Článek id 10, slug `co-je-vizualni-system-srozumitelny-pruvodce-strojovym-videnim-ve-vyrobe`. `seo.title` už má „Strojové vidění“. První H2 je „Vizuální systém, strojové vidění, computer vision — v čem je rozdíl?“. Slovo „počítačové vidění“ chybí. Anglická verze existuje. | API `posts/10` |
| Ceník | Stránka `cenik` má blok `pricingTable` (id `pricing_1`, tarify Open source, Standard, Pro, Enterprise) a `faqAccordion` (id `pricing_5`, 5 otázek). `getPricing()` vezme první `pricingTable` ze všech stránek. | API `pages`, `src/lib/queries.ts:130` |
| Úvodní stránka | Bloky: `hero`, `logoCloud`, `featureGrid`, `industryCards`, `processSteps`, `testimonialBar`, `splitSection`, `ctaBanner`. Žádné odkazy na stránky řešení. | API `pages/5` |
| `Organization` | Je jednou v `[locale]/layout.tsx`. Ostatní typy na organizaci odkazují přes `@id`. Chybí `legalName` a IČO. `sameAs` obsahuje `linkedin.com/company/koala42`. | `src/lib/jsonLd.ts:34` |
| Adresa | Web: Sokolovská 81/55, Praha 8. Obchodní rejstřík: sídlo Plynární 1032/29, Praha 7. | `site-settings.contact.address`, ARES |
| Patička | Sloupce Produkt, Zdroje, Společnost z globálu `footer`. `copyright` je „Robopipe s.r.o.“. Rejstřík píše „robopipe s.r.o.“. | API `globals/footer`, ARES |
| `<head>` | Layout má statické `metadata`. Ověřovací značky nejsou. | `src/app/(frontend)/[locale]/layout.tsx:43` |
| Případové studie | `customer` je povinné pole. Kolekce popisuje zákazníka a jeho čísla. | `src/collections/CaseStudies.ts:48` |
| Reference k úlohám | Detekce vad: Crocodille, MG Servis, článek „Snižte zmetkovitost“. Počítání: Wolfberry. Kompletnost balení: MG Servis, Wolfberry. Etikety: žádná studie. Stránka Obory zmiňuje „přítomnost a orientaci etikety, čitelnost kódu šarže“. Čtení textu (data spotřeby) web neslibuje. | API `case-studies`, `pages` (obory) |

## 2. Rozpory s product.md a návrh

### 2.1 Stránka řešení není nová

Product.md bod 1 chce stránku „Kamerová kontrola kvality“. Ta už je v seedu etapy 1. **Návrh:** stránku nevytvářet znovu. Rozšířit ji o sekci úloh, o ceník a o varianty slov (kapitola 9.1).

### 2.2 Tři stránky etapy 1 si konkurují s úvodem a s průvodcem

`/cs/ai-kontrola-kvality` cílí na stejné slovo jako úvod. `/cs/strojove-videni` a `/cs/pocitacove-videni` cílí na stejná slova jako průvodce, který product.md rozšiřuje. Dvě stránky na jedno slovo si v Googlu konkurují. **Návrh (otázka 1):** odstranit tyto tři stránky ze seedu dřív, než skript poprvé poběží v produkci. Dnes nejsou veřejné, takže odstranění nic nerozbije. Při odpovědi „ponechat“ se kroky 3 a 4 plánu vynechají a průvodce dostane jen odkazy na tyto stránky.

### 2.3 Případy užití podle úlohy nejsou studie

Product.md bod 2 chce použít „existující mechanismus případů užití“. Kolekce `case-studies` vyžaduje zákazníka. Stránka „Kontrola etiket“ zákazníka nemá. Studie bez zákazníka by výpis `/case-studies` smíchal s referencemi a `customer` by přestal být povinný. **Návrh:** stránky úloh jsou dokumenty `pages` složené stejným mechanismem jako vstupní stránky etapy 1 (`landing-pages.json`, `landingLayout()`). Na studie odkazují blokem `caseStudyGrid`. Nový typ obsahu nevzniká.

### 2.4 Čtení data spotřeby

Product.md uvádí variantu „čtení data spotřeby“. Web slibuje jen přítomnost a orientaci etikety a čitelnost kódu šarže. **Návrh (otázka 4):** variantu nepoužít, dokud Filip nepotvrdí, že Robopipe čte text z etikety.

## 3. Hlavní rozhodnutí

1. **Žádná nová kolekce ani nový blok.** Stránky úloh a „O nás“ jsou dokumenty `pages`. Vznikají stávající funkcí `landingLayout()` ve skriptu `seoGeo.ts`.
2. **Jeden seznam stránek řešení.** Nové pole `site-settings.solutions` (vztah na `pages`). Čte ho patička (sloupec „Řešení“), úvodní stránka a výpis případů užití. Stejný vzor jako `memberships` v etapě 1. Ruční sloupec „Řešení“ z etapy 1 zaniká.
3. **Bloky dostávají volbu zdroje, jako `logoCloud.source`.** `industryCards.source: 'solutions'` vykreslí karty ze `site-settings.solutions`. `pricingTable.source: 'pricingPage'` vykreslí tarify z ceníku přes `getPricing()`. Ceny tak mají jeden zdroj.
4. **Fakta o firmě žijí jednou v `site-settings.company`.** Čte je `Organization`, patička, blok `contactForm` a `llms.txt`. Stránka „O nás“ je ukáže blokem `contactForm` s postranním panelem. Text stránky je neopakuje.
5. **Ověřovací značky jsou v `site-settings.verification`.** Layout je vloží přes `generateMetadata`. Prázdná hodnota značku nevykreslí. Arthur hodnotu zapíše přes API Payload bez nového nasazení.
6. **Žádné nové typy JSON-LD.** Nové stránky dostanou `BreadcrumbList` a `FAQPage` stávající routou `[slug]`. `Organization` a `WebSite` zůstávají v layoutu. `Organization` dostane `legalName`, `identifier` (IČO) a `description`.
7. **Obsah dál zapisuje jeden skript `pnpm seed:seo-geo`.** Texty jsou v `seed-assets/copy/seo-geo/`. Skript nepublikuje dokument se značkou `[doplnit Filip]` nebo `[ověřit]`.
8. **Skript funguje v obou pořadích nasazení.** Doporučené pořadí je jeden běh po sloučení etapy 2. Když etapa 1 poběží dřív, skript doplní chybějící bloky podle jejich `id` (kapitola 11.3).

## 4. Adresy stránek

| Stránka | cs | en | Stav |
|---|---|---|---|
| Kamerová kontrola kvality (řešení) | `/cs/kamerova-kontrola-kvality` | `/en/camera-quality-inspection` | etapa 1, rozšířit |
| Detekce vad | `/cs/detekce-vad-na-vyrobni-lince` | `/en/defect-detection` | nová |
| Počítání kusů | `/cs/pocitani-kusu-kamerou` | `/en/camera-part-counting` | nová |
| Kontrola etiket | `/cs/kontrola-etiket` | `/en/label-inspection` | nová |
| Kontrola kompletnosti balení | `/cs/kontrola-kompletnosti-baleni` | `/en/packaging-completeness-inspection` | nová |
| O nás | `/cs/o-nas` | `/en/about` | nová, koncept do doplnění faktů |
| Automatická anotace | `/cs/automaticka-anotace` | `/en/auto-annotation` | etapa 1, beze změny |
| Průvodce | `/cs/blog/co-je-vizualni-system-srozumitelny-pruvodce-strojovym-videnim-ve-vyrobe` | `/en/blog/what-is-a-vision-system-a-plain-english-guide-to-machine-vision-in-manufacturing` | rozšířit jen cs |
| Ceník | `/cs/cenik` | `/en/pricing` | nové otázky |
| AI kontrola kvality, Strojové vidění, Počítačové vidění | `/cs/ai-kontrola-kvality`, `/cs/strojove-videni`, `/cs/pocitacove-videni` | `/en/ai-quality-inspection`, `/en/machine-vision`, `/en/computer-vision` | odstranit ze seedu (otázka 1) |

Pravidla z etapy 1 platí beze změny: canonical na sebe, hreflang cs, en a `x-default` přes `alternatesFor()`, sitemap a `llms.txt` z `getIndexableDocs()`. Nové stránky se v nich objeví samy po publikaci. Žádný ruční seznam URL v kódu.

## 5. Datový model a migrace

Jedna migrace: `pnpm payload migrate:create seo_geo_stage2`. Pak `pnpm generate:types` a commit `src/payload-types.ts`.

### 5.1 `site-settings` (`src/globals/SiteSettings.ts`)

Přidat za `memberships`:

```ts
{
  name: 'solutions',
  type: 'relationship',
  relationTo: 'pages',
  hasMany: true,
  maxDepth: 0,
  admin: { description: 'Solution and task pages in display order. Shown in the footer "Solutions" column, in card blocks set to "Solutions" and on the use cases listing.' },
},
{
  name: 'company',
  type: 'group',
  fields: [
    { name: 'legalName', type: 'text', admin: { description: 'Exactly as in the commercial register.' } },
    { name: 'companyId', type: 'text', admin: { description: 'IČO.' } },
    { name: 'registration', type: 'textarea', localized: true,
      admin: { description: 'Registered office and register entry, one line.' } },
  ],
},
{
  name: 'verification',
  type: 'group',
  admin: { description: 'Search engine site verification. Empty value = no tag.' },
  fields: [
    { name: 'bing', type: 'text', admin: { description: 'content of <meta name="msvalidate.01">' } },
    { name: 'seznam', type: 'text', admin: { description: 'content of <meta name="seznam-wmt">' } },
  ],
},
```

`maxDepth: 0` je nutné. `getGlobals()` čte `site-settings` s `depth: 2` a bez omezení by na každém požadavku načetl celé stránky i s bloky.

### 5.2 `footer` (`src/globals/Footer.ts`)

- Odstranit pole `copyright`. Jeho hodnotu přebírá `site-settings.company.legalName`.
- Migrace v `up` nejdřív zkopíruje hodnotu: `UPDATE site_settings SET company_legal_name = (SELECT copyright FROM footer LIMIT 1) WHERE company_legal_name IS NULL`. Teprve pak smaže sloupec. `down` to udělá obráceně. Patička tak nemá okno bez názvu firmy.

### 5.3 Blok `industryCards` (`src/blocks/IndustryCards/config.ts`)

- Nové pole `source`: `select`, volby `custom` (výchozí) a `solutions`, `defaultValue: 'custom'`.
- `cards` dostane `admin.condition: (_, sibling) => sibling?.source !== 'solutions'`. Místo `required` a `minRows` dostane `validate`, který vyžaduje kartu jen pro `custom`. Kód zkopíruj z `src/blocks/LogoCloud/config.ts`.

### 5.4 Blok `pricingTable` (`src/blocks/PricingTable/config.ts`)

- Nové pole `source`: `select`, volby `custom` (výchozí) a `pricingPage`, `defaultValue: 'custom'`.
- `tiers` dostane stejnou podmínku a `validate` jako v 5.3.

### 5.5 Co se v modelu nemění

`pages`, `posts`, `case-studies`, `faqs`, `redirects`, `header` a ostatní bloky zůstávají beze změny.

## 6. Změny kódu po modulech

### 6.1 Seznam řešení

- `src/lib/queries.ts`: nová funkce `getSolutionPages(locale)` obalená `cache()`. Přečte ID ze `settings.solutions` (z `getGlobals`). Pak `payload.find` na `pages` s `where: { id: { in: ids } }`, `select: { title, slug, seo, layout }`, `depth: 1`, `PUBLIC_ONLY`. Vrátí pole `{ title, path, description, image }` v pořadí ze settings. Vynechá stránky bez slugu v daném jazyce a nepublikované stránky. `description` = `seo.description`. `image` = `seo.image`, jinak obrázek prvního bloku `hero`.
- `src/blocks/IndustryCards/Component.tsx`: když `source === 'solutions'`, vykreslí karty z `getSolutionPages(locale)`. Popisek odkazu je `t('common.readMore')`. Karta bez obrázku se vykreslí bez obrázku (podmínka na řádku 28 už existuje). Prázdný seznam = blok se nevykreslí.
- `src/components/Footer.tsx`: za sloupce z `footer.columns` přidat sloupec s nadpisem `t('footer.solutions')` a odkazy z `getSolutionPages(locale)`. `--footer-columns` počítat včetně tohoto sloupce. Prázdný seznam = sloupec chybí.
- `src/app/(frontend)/[locale]/case-studies/page.tsx`: mezi mřížku studií a citát vložit `IndustryCardsBlock` s `source: 'solutions'` a nadpisem `t('caseStudies.byTask')`.

### 6.2 Cena na stránce řešení

- `src/blocks/PricingTable/Component.tsx`: když `source === 'pricingPage'`, vezme `tiers` z `getPricing(locale)`. Nadpis a text bloku zůstávají vlastní. Když `getPricing` vrátí `null`, blok se nevykreslí.
- `src/lib/queries.ts`, `getPricing()`: hledat jen blok `pricingTable`, který nemá `source === 'pricingPage'`. Jinak by funkce mohla vrátit prázdný blok ze stránky řešení a z `Product.offers` by zmizely ceny.

### 6.3 Fakta o firmě

- `src/lib/jsonLd.ts`, `organizationLd()`: přidat `legalName` (`company.legalName`), `description` (`defaultSeo.description` v jazyce stránky) a `identifier: { '@type': 'PropertyValue', propertyID: 'IČO', value: company.companyId }`. Prázdné hodnoty odstraní stávající `compact()`.
- `src/components/Footer.tsx`, řádek 122: `settings.company?.legalName || settings.siteName`.
- `src/blocks/ContactForm/Component.tsx`: pod adresou v postranním panelu malý text `t('contact.companyIdLabel')` s IČO a pod ním `company.registration`. Prázdné hodnoty se nevykreslí.
- `src/lib/llmsTxt.ts`: v sekci „Kontakt / Contact“ přidat řádek `{legalName}, IČO {companyId}`. Ostatní sekce generuje `getIndexableDocs()` jako dnes.

### 6.4 Ověřovací značky

- `src/lib/meta.ts`: nová čistá funkce `verificationMeta(settings): Metadata['verification'] | undefined`. Vrátí `{ other: { 'msvalidate.01': bing, 'seznam-wmt': seznam } }` jen s neprázdnými hodnotami (po `trim()`). Bez hodnot vrátí `undefined`.
- `src/app/(frontend)/[locale]/layout.tsx`: statické `metadata` nahradit funkcí `generateMetadata({ params })`. Vrací `metadataBase`, `title: 'Robopipe'` a `verification: verificationMeta(settings)`. Data z `getGlobals(locale)`, který je v `cache()`, takže nevzniká další dotaz.
- Next vypíše `<meta name="msvalidate.01" content="…">` a `<meta name="seznam-wmt" content="…">` na každé stránce `/cs/*` a `/en/*`.

### 6.5 Překlady (`src/i18n/messages/cs.json`, `en.json`)

| Klíč | cs | en |
|---|---|---|
| `footer.solutions` | Řešení | Solutions |
| `caseStudies.byTask` | Řešení podle úlohy | Solutions by task |
| `contact.companyIdLabel` | IČO | Company ID |

### 6.6 Skript obsahu (`src/seed/seoGeo.ts`)

Typy a soubory:

- `LandingLocale.steps` a `LandingLocale.cta` jsou volitelné. Nová volitelná pole: `tasks?: string` (soubor Markdownu pro samostatný blok `content`), `pricing?: { heading: string; text: string }`, `contact?: { heading: string; microcopy: string }`.
- `landingLayout()`: pořadí bloků `hero`, `content`, `tasks` (blok `content`, id `…-tasks`), `steps`, `caseStudyGrid`, `pricing` (blok `pricingTable`, `source: 'pricingPage'`, id `…-pricing`), `faqAccordion`, `contactForm` (`showSidebar: true`, id `…-contact`), `ctaBanner`. Volitelný blok bez dat se vynechá.
- `NavigationCopy.footerColumn` nahradit novým souborem `settings.json` (kapitola 11.1). Kód, který zapisuje sloupec „Řešení“ do `footer.columns`, smazat.

Nová pravidla skriptu (doplňují pravidla 1 až 8 z etapy 1, kapitola 7.1):

1. **Pojistka publikace.** Funkce `hasCopyMarkers(value)` hledá v serializovaném dokumentu `[doplnit Filip]` a `[ověřit]`. V režimu `--status=published` skript takový dokument nepublikuje. Nechá ho jako koncept a vypíše `draft (markers): <klíč>`.
2. **Chybějící bloky existující stránky.** Když stránka z `landing-pages.json` existuje, skript porovná `id` bloků s `landingLayout()`. Blok, jehož `id` chybí, vloží na stejné místo v pořadí. Existující bloky nemění.
3. **Seznam řešení.** `site-settings.solutions` zapíše jen tehdy, když je prázdný. Pořadí podle `settings.json`. Jen v režimu `published`.
4. **Fakta o firmě.** Pole `company.*` zapíše jen prázdná. Jen v režimu `published`. `verification` skript nikdy nezapisuje.
5. **Úklid po etapě 1.** Když `footer.columns` obsahuje sloupec s nadpisem „Řešení“ (cs) a „Solutions“ (en), skript ho v režimu `published` odstraní. Vznikl jen skriptem etapy 1.
6. **Odkaz na „O nás“ v patičce.** Do sloupce „Společnost“ / „Company“ přidá odkaz na `/cs/o-nas` a `/en/about` jen tehdy, když je stránka publikovaná a odkaz tam ještě není.
7. **Ceník.** Do prvního bloku `faqAccordion` stránky se slugem `cenik` připojí FAQ z `existing-pages.json`, která v něm ještě nejsou.
8. **Průvodce.** V článku podle slugu z `existing-pages.json` (jen cs):
   - nahradí text prvního H2 jen tehdy, když má přesně dnešní hodnotu,
   - vloží odstavec z `guide-vision-terms.cs.md` jako poslední uzel první sekce (před druhý H2), jen když článek ten text ještě nemá (porovnání prvních 60 znaků),
   - změní `seo.title` jen tehdy, když má přesně dnešní hodnotu.
   Změna jde jako koncept. Režim `published` publikuje poslední koncept tohoto článku. Jiné články skript dál nemění.
9. **Odstraněné stránky etapy 1.** Když stránka s klíčem, který už v `landing-pages.json` není (`ai-quality-inspection`, `computer-vision`, `machine-vision`), v databázi existuje, skript ji nemaže. Vypíše `obsolete: <slug>`. Postup je v kapitole 11.3.

## 7. JSON-LD podle typu stránky

| Stránka | Typy | Zdroj | Změna |
|---|---|---|---|
| Všechny `/cs/*`, `/en/*` | `Organization` (`@id: {SERVER_URL}/#organization`), `WebSite` | layout | `Organization` + `legalName`, `identifier`, `description` |
| Úvod | + `Product` s `offers` z ceníku, `FAQPage` | `[locale]/page.tsx` | beze změny |
| Stránka řešení, 4 stránky úloh | + `BreadcrumbList` (Úvod, stránka), `FAQPage` z bloků `faqAccordion` | `[slug]/page.tsx` | beze změny kódu |
| O nás | + `BreadcrumbList` | `[slug]/page.tsx` | beze změny kódu. Bez `faqAccordion` chybí `FAQPage`. |
| Ceník | + `BreadcrumbList`, `FAQPage` | `[slug]/page.tsx` | nové otázky se do `FAQPage` dostanou samy |
| Průvodce | + `BlogPosting`, `BreadcrumbList` | `blog/[slug]/page.tsx` | beze změny |
| Výpis a detail studie | jako dnes | | beze změny |

`Organization` vzniká jen v layoutu. Ostatní typy na ni odkazují jen `{ "@id": … }`. Vnořené organizace v `memberOf` mají jiné `@id` (žádné) a test je nepočítá.

Zamítnuté varianty: `Service` na stránkách úloh a `AboutPage` na „O nás“. Obojí by vyžadovalo nový příznak typu stránky v `pages` a nepřidá fakt, který už není v `Organization`.

## 8. Ověřovací značky: postup po nasazení

1. Filip nebo Arthur založí účet Bing Webmaster Tools a Seznam Webmaster (mimo rozsah).
2. Arthur zapíše token přes `PATCH /api/globals/site-settings` s `verification.bing` a `verification.seznam`. Heslo je v Keychainu `robopipe-payload-password`.
3. Do 10 minut (`revalidate = 600`) se značky objeví. Ověř `curl -s https://robopipe.io/cs | grep -o 'msvalidate.01[^>]*'`.
4. Spusť ověření ve webmaster nástroji.

Riziko: kořen `/` přesměruje (307) na `/en` nebo `/cs`. Když nástroj přesměrování nesleduje, zaregistruj web jako `https://robopipe.io/cs`. Bing umí i ověření záznamem DNS u Cloudflare.

## 9. Osnova obsahu

### 9.0 Společná pravidla

- Každá stránka má jiné H1 a `seo.title`. Hlavní slovo je v `seo.title`, v H1 (hero `heading`) a v prvním odstavci (hero `text`). `seo.title` nejvýše 60 znaků, `seo.description` nejvýše 155 znaků.
- České texty uvedou u prvního výskytu „strojové vidění (anglicky machine vision)“ nebo „počítačové vidění (anglicky computer vision)“.
- Čísla a jména zákazníků v textu nepiš. Ukazuje je blok `caseStudyGrid` z karet studií. Ceny nepiš nikdy. Ukazuje je blok `pricingTable` se `source: 'pricingPage'` nebo odkaz na ceník.
- Stránky úloh nemají blok `processSteps`. Postup nasazení je jen na stránce řešení. Stránky úloh na něj odkazují.
- Auto anotace: jen tarify Pro a Enterprise, návrhy kontroluje a schvaluje člověk. Poskytovatele modelu ani umístění dat nejmenuj.
- Text 250 až 450 slov v bloku `content`, mezititulky H2.
- Anglická verze má stejnou osnovu. Hlavní slovo en je v tabulce každé stránky.

### 9.1 Kamerová kontrola kvality (rozšíření stránky etapy 1)

| | |
|---|---|
| Hlavní slovo | kamerová kontrola kvality / camera quality inspection |
| Varianty | kamerový systém pro kontrolu výroby, vizuální kontrola kvality, optická kontrola kvality, automatická vizuální kontrola výrobků, průmyslová kamera s AI |
| Nové bloky | `tasks` za `content`, `pricing` před `faqAccordion` |
| Reference | stávající `caseStudyGrid` (Crocodille, MG Servis, Wolfberry) |

Blok `tasks` (`landing-camera-quality-inspection-tasks.cs.md`, `.md`):

- H2 „Vizuální kontrola kvality podle úlohy“. Odstavec s variantami: kamerový systém pro kontrolu výroby, optická kontrola kvality, automatická vizuální kontrola výrobků, průmyslová kamera s AI.
- Čtyři krátké odstavce, každý jedna věta a odkaz: detekce vad, počítání kusů, kontrola etiket, kontrola kompletnosti balení.

Blok `pricing`: H2 „Kolik stojí kamerová kontrola kvality“, jedna věta textu bez čísla. Tarify vykreslí blok.

Úprava `landing-camera-quality-inspection.cs.md`: u prvního „strojové vidění“ doplnit „(anglicky machine vision)“. Odkazy na odstraněné stránky nahradit podle 9.8.

### 9.2 Detekce vad na výrobní lince

| | |
|---|---|
| Hlavní slovo | detekce vad na výrobní lince / defect detection |
| Varianty | detekce vad kamerou, kontrola povrchu |
| `seo.title` | „Detekce vad na výrobní lince kamerou s AI \| Robopipe“ (52), „Defect detection on the production line \| Robopipe“ (50) |
| Obrázek | `inspection-detection.jpg` |
| Reference | `caseStudyGrid`: `crocodille-line-quality`, `mg-servis-packaging-checks` |

- H1: „Detekce vad na výrobní lince kamerou s AI“.
- H2 „Jaké vady kamera najde“: kontrola povrchu, tvar a vzhled výrobku, cizí předmět v balení, těsnost svaru obalu. Jen příklady z karet studií a ze stránky Obory.
- H2 „Jak detekce vad kamerou funguje“: model se učí na vašich dobrých a vadných kusech. Odkaz na stránku řešení a na průvodce (strojové vidění).
- H2 „Co se stane s vadným kusem“: obsluha vidí výsledek na displeji, snímek zůstane v archivu. Odkaz na článek `/cs/blog/snizte-zmetkovitost`.
- Odkaz na `/cs/kontrola-kompletnosti-baleni`.
- FAQ (3 až 4, nové klíče `dd-*`): jak model pozná novou vadu, zda kontrola zpomalí linku (odkaz na stránku řešení, bez čísla), co potřebuje k naučení, zda funguje v mokrém provozu. Odpověď jen z faktů na webu. Otázku bez faktu vynech.

### 9.3 Počítání kusů kamerou

| | |
|---|---|
| Hlavní slovo | počítání kusů kamerou / part counting with a camera |
| Varianty | aplikace na počítání kusů |
| `seo.title` | „Počítání kusů kamerou přímo na lince \| Robopipe“ (47), „Part counting with a camera on the line \| Robopipe“ (50) |
| Obrázek | `pharma-hmi.jpeg` |
| Reference | `caseStudyGrid`: `wolfberry-capsule-counting` |

- H1: „Počítání kusů kamerou přímo na výrobní lince“.
- H2 „Co kamera spočítá“: kapsle v dóze, kusy v balení, míra naplnění. Jen příklady ze studie Wolfberry a ze stránky Obory.
- H2 „Aplikace na počítání kusů, nebo kamera na lince“: rozdíl mezi aplikací v telefonu a trvalou kontrolou každého kusu na lince. Robopipe nepopisuj jako mobilní aplikaci.
- H2 „Doklad ke každému balení“: snímek ke každé kontrole pro audit.
- Odkazy: stránka řešení, `/cs/kontrola-kompletnosti-baleni`, ceník.
- FAQ (3, klíče `pc-*`): co když se kusy překrývají, jak se počet ukáže obsluze, jak dlouho trvá naučení.

### 9.4 Kontrola etiket

| | |
|---|---|
| Hlavní slovo | kontrola etiket / label inspection |
| Varianty | kontrola etiket kamerou, kontrola potisku. „Čtení data spotřeby“ jen po kladné odpovědi na otázku 4. |
| `seo.title` | „Kontrola etiket kamerou na výrobní lince \| Robopipe“ (51), „Label inspection with a camera on the line \| Robopipe“ (53) |
| Obrázek | `product-classification-screen.jpeg` |
| Reference | žádná studie, blok `caseStudyGrid` chybí |

- H1: „Kontrola etiket kamerou na výrobní lince“.
- H2 „Co kontrola etiket hlídá“: přítomnost etikety, správná pozice a orientace, čitelnost kódu šarže (fakta ze stránky Obory).
- H2 „Kontrola potisku“: čitelnost a přítomnost potisku jako stejná úloha.
- H2 „Reference“: věta „Veřejnou referenci na kontrolu etiket zatím nemáme. Na demu vám kontrolu ukážeme na vašich etiketách.“ Odkaz na Obory (farmacie) a na článek `/cs/blog/trendy-v-kontrole-kvality-2026-co-se-na-vyrobnich-linkach-skutecne-meni`.
- Odkazy: stránka řešení, ceník.
- FAQ (3, klíče `li-*`): různé druhy etiket na jedné lince, lesklé nebo průhledné etikety (jen když web o tom něco říká, jinak vynech), co se stane s kusem bez etikety.

### 9.5 Kontrola kompletnosti balení

| | |
|---|---|
| Hlavní slovo | kontrola kompletnosti balení / packaging completeness inspection |
| Varianty | kontrola balení kamerou, kontrola plnění |
| `seo.title` | „Kontrola kompletnosti balení kamerou \| Robopipe“ (47), „Packaging completeness inspection \| Robopipe“ (44) |
| Obrázek | `retail-packing.jpg` |
| Reference | `caseStudyGrid`: `mg-servis-packaging-checks`, `wolfberry-capsule-counting` |

- H1: „Kontrola kompletnosti balení kamerou“.
- H2 „Co znamená kompletní balení“: všechny díly na místě, správný počet, nic navíc, neporušený obal. Příklady z karet MG Servis a Wolfberry bez čísel.
- H2 „Kontrola plnění“: míra naplnění a počet kusů v dóze. Odkaz na `/cs/pocitani-kusu-kamerou`.
- H2 „Kontrola balení kamerou přímo na lince“: kontrola každého balení, ne vzorku. Odkaz na stránku řešení a na `/cs/detekce-vad-na-vyrobni-lince`.
- FAQ (3, klíče `pk-*`): více kontrol na jednom balení, změna druhu balení, záznam pro audit.

### 9.6 O nás

| | |
|---|---|
| Hlavní slovo | Robopipe |
| `seo.title` | „O nás: Robopipe, AI kontrola kvality z Prahy“ (44), „About Robopipe: AI quality inspection from Prague“ (49) |
| Bloky | `hero` (bez obrázku), `content`, `caseStudyGrid` (všechny 4 studie), `contactForm` se `showSidebar` |
| Stav | koncept, dokud text obsahuje `[doplnit Filip]` |

- H1: „Robopipe: kamerová kontrola kvality od české firmy“.
- H2 „Co Robopipe dělá“: poznámka z patičky a claim úvodu. Odkaz na stránku řešení a na Studio (auto anotace jen Pro a Enterprise).
- H2 „Pro koho“: obory potravinářství, farmacie, retail, logistika. Odkaz na `/cs/obory` a `/cs/case-studies`.
- H2 „Kdo za Robopipe stojí“: jednatelé podle rejstříku. Role, medailonky a vztah ke KOALA42 jsou `[doplnit Filip]`.
- H2 „Otevřený zdrojový kód“: organizace `github.com/robopipe`, popis z GitHubu.
- Adresa, telefon, e-mail, IČO a zápis v rejstříku ukáže blok `contactForm` ze `site-settings`. Text je neopakuje. Členství ukazuje patička. Text ho neopakuje.

### 9.7 Ceník a průvodce

Ceník (`existing-pages.json`, nové FAQ `price-*`):

- „Kolik stojí kamerová kontrola kvality?“: tarify jsou za kameru a měsíc, aktuální částky jsou v tabulce na této stránce. Bez čísla.
- „Co je v ceně kamerového systému pro kontrolu kvality?“: jen položky z tabulky tarifů a srovnání.
- „Kolik stojí automatická anotace?“: je v tarifech Pro a Enterprise.

Průvodce (jen cs):

- H2 „Vizuální systém, strojové vidění, computer vision — v čem je rozdíl?“ změnit na „Vizuální systém, strojové vidění a počítačové vidění: v čem je rozdíl?“.
- Nový odstavec na konci této sekce (`guide-vision-terms.cs.md`): počítačové vidění je český název pro computer vision. Strojové vidění (machine vision) je jeho průmyslové použití. Odkaz na stránku řešení. Nový odstavec nesmí opakovat věty, které sekce už má.
- `seo.title` z „Co je vizuální systém? Strojové vidění srozumitelně“ na „Strojové a počítačové vidění: co je vizuální systém“ (51).

### 9.8 Odkazy po odstranění stránek etapy 1

| Starý cíl v Markdownu | Nový cíl |
|---|---|
| `/cs/ai-kontrola-kvality`, `/en/ai-quality-inspection` | `/cs`, `/en` |
| `/cs/strojove-videni`, `/cs/pocitacove-videni` | průvodce cs |
| `/en/machine-vision`, `/en/computer-vision` | průvodce en |

FAQ, které používaly jen odstraněné stránky (`aqi-*`, `cv-*`, `mv-*`), smaž z `faqs.json`.

### 9.9 Úvodní stránka

Nový blok `industryCards` se `source: 'solutions'` hned za stávající `industryCards`, `blockName: 'seo-geo-solutions'`:

- cs nadpis „Kontrola kvality ve výrobě podle úlohy“, text s variantou „AI kamera“.
- en nadpis „Quality control in production, by task“.

Titulek a hero úvodu se nemění.

## 10. O nás: fakta

Ověřeno 10. 11. 2026. ARES = `ares.gov.cz`, záznam veřejného rejstříku.

| Fakt | Hodnota | Zdroj | Kde se použije |
|---|---|---|---|
| Značka | Robopipe | web, `site-settings.siteName` | všude |
| Obchodní firma | robopipe s.r.o. (malé „r“). Web píše „Robopipe s.r.o.“. | ARES | `company.legalName`, patička, `Organization.legalName` |
| IČO | 24111791 | ARES | `company.companyId` |
| DIČ | rejstřík neuvádí | ARES | nepoužít |
| Právní forma | společnost s ručením omezeným | ARES | `company.registration` |
| Zápis | Městský soud v Praze, oddíl C, vložka 439289, zapsáno 31. 12. 2025 | ARES | `company.registration` |
| Sídlo podle rejstříku | Plynární 1032/29, Holešovice, 170 00 Praha 7 | ARES | `company.registration` |
| Adresa na webu | Sokolovská 81/55, 186 00 Praha 8 - Karlín | `site-settings.contact.address` | `[doplnit Filip]` (otázka 2) |
| Jednatelé | Filip Molčík, Jan Jelínek | ARES | text „Kdo za Robopipe stojí“ |
| Role a medailonky lidí | | | `[doplnit Filip]` |
| Vztah ke KOALA42 | LinkedIn na webu vede na `linkedin.com/company/koala42` | `site-settings.socials` | `[doplnit Filip]` (otázka 3) |
| Rok vzniku produktu | Organizace GitHub vznikla 26. 11. 2024, firma 31. 12. 2025. Rok vzniku produktu nikde není. | GitHub, ARES | `[doplnit Filip]`. Bez odpovědi se rok neuvádí. |
| Co dělá | AI kontrola kvality pro průmyslové provozy | patička `footer.note` | text |
| Claim | AI kontrola kvality, která se váš produkt naučí sama | úvod | text |
| Obory | potravinářství, farmacie, retail, logistika | `/cs/obory`, `defaultSeo.description` | text |
| Reference | Crocodille, Wolfberry, MG Servis, E-commerce retailer | `case-studies` | blok `caseStudyGrid` |
| E-mail | jan.jelinek@robopipe.io | `site-settings.contactEmail` | blok `contactForm` |
| Telefon | +420 728 488 116, Po–Pá 8:00–17:00 | `site-settings.contact` | blok `contactForm` |
| Schůzka | Calendly, Jan Jelínek | `site-settings.contact` | blok `contactForm` |
| Open source | organizace `robopipe`, „open source machine vision platform“, 5 veřejných repozitářů | GitHub API | text |
| GitHub | https://github.com/robopipe | `site-settings.socials` | `sameAs` |
| Členství | Česká inovační platforma | etapa 1, `seed-assets/copy/seo-geo/home.json` (v produkci po běhu skriptu) | patička, `memberOf` |
| Počet lidí | | | `[doplnit Filip]`, nepovinné. Bez odpovědi se neuvádí. |
| Logo | `/logo.svg` | web | `Organization.logo` |

Povinné `[doplnit Filip]` pro publikaci: role lidí, vztah ke KOALA42, adresa. Ostatní body bez odpovědi z textu vypadnou a značku nemají.

## 11. Cesta do produkce

### 11.1 Soubory s texty (`seed-assets/copy/seo-geo/`)

| Soubor | Změna |
|---|---|
| `landing-pages.json` | +5 stránek (`defect-detection`, `part-counting`, `label-inspection`, `packaging-completeness`, `about`). U `camera-quality-inspection` pole `tasks` a `pricing`. −3 stránky (otázka 1). |
| `landing-<klíč>.cs.md`, `landing-<klíč>.md` | 5 nových dvojic + `landing-camera-quality-inspection-tasks.*`. Smazat 3 dvojice odstraněných stránek. |
| `faqs.json` | nové `dd-*`, `pc-*`, `li-*`, `pk-*`, `price-*`. Smazat `aqi-*`, `cv-*`, `mv-*`. |
| `settings.json` (nový) | `solutions`: klíče stránek v pořadí `camera-quality-inspection`, `defect-detection`, `part-counting`, `label-inspection`, `packaging-completeness`, `auto-annotation`. `company`: hodnoty z kapitoly 10. |
| `existing-pages.json` (nový) | `pricing.faqs`, `guide` (slug, `replaceIf` H2 a `seo.title`, nové hodnoty, soubor odstavce) |
| `guide-vision-terms.cs.md` (nový) | odstavec do průvodce |
| `home.json` | blok `solutions` (`blockName`, nadpis a text cs a en) |
| `navigation.json` | smazat `footerColumn`. `renameLabels` zůstává. Přidat `aboutLink: { column: { cs: 'Společnost', en: 'Company' }, page: 'about' }`. |

Nadpisy sloupců v produkci 10. 11.: cs „Společnost“, en „Company“ (`GET /api/globals/footer`).

### 11.2 Doporučené pořadí

1. Filip odpoví na otázky z kapitoly 16 a schválí texty v PR.
2. PR se sloučí. Coolify nasadí. Migrace proběhne při buildu.
3. Arthur spustí `pnpm seed:seo-geo --production --dry-run`, pak `--production` (koncepty).
4. Filip zkontroluje koncepty v náhledu.
5. Arthur spustí `pnpm seed:seo-geo --production --status=published`. Stránka „O nás“ zůstane konceptem, dokud má značky.
6. Po doplnění faktů Arthur upraví soubor, PR s textem se sloučí a skript poběží znovu. „O nás“ se publikuje, patička dostane odkaz.
7. Po založení účtů Arthur zapíše ověřovací značky (kapitola 8).

Jeden běh skriptu tak vytvoří obsah etapy 1 i 2 najednou.

### 11.3 Když skript etapy 1 poběží v produkci dřív

- Nové bloky stránky řešení (`tasks`, `pricing`) skript doplní podle `id` (pravidlo 2).
- Úprava `landing-camera-quality-inspection.cs.md` (machine vision, odkazy) se neprojeví. Arthur ji po souhlasu Filipa udělá v administraci přes API.
- Tři odstraněné stránky budou existovat. Skript vypíše `obsolete`. Po souhlasu Filipa je Arthur přepne na koncept a do kolekce `redirects` přidá přesměrování podle tabulky 9.8.
- Ruční sloupec „Řešení“ v patičce skript odstraní (pravidlo 5).

### 11.4 Lokální vyzkoušení

Postup z `docs/specs/2-seo-geo/implementation.md`, kapitola 4. Navíc:

1. Spusť skript etapy 1 z `master` (`git stash`, checkout `master`, `pnpm seed:seo-geo --status=published`), pak se vrať na větev a spusť `pnpm payload migrate` a `pnpm seed:seo-geo --status=published`. Tak ověříš pořadí z 11.3.
2. Na čisté databázi ověř doporučené pořadí z 11.2.

## 12. Okrajové případy

| Případ | Chování |
|---|---|
| Stránka v `solutions` je koncept nebo nemá slug v jazyce | Karta ani odkaz v patičce se nevykreslí. Žádný odkaz na 404. |
| `solutions` prázdné | Sloupec v patičce, blok na úvodu a sekce ve výpisu chybí. |
| Ceník nepublikovaný nebo bez `pricingTable` | Blok `pricing` na stránce řešení se nevykreslí. `Product.offers` chybí jako dnes. |
| Někdo vloží `pricingTable` se `source: 'pricingPage'` přímo na ceník | `getPricing` ho přeskočí a najde blok `custom`. Bez bloku `custom` vrátí `null`. |
| Token ověření s mezerami | `trim()`. Prázdný řetězec = žádná značka. |
| Token jen pro Bing | Vykreslí se jen `msvalidate.01`. |
| `company` prázdné | `Organization` bez `legalName` a `identifier`. Patička ukáže `siteName`. |
| „O nás“ se značkou `[doplnit Filip]` | Koncept, 404 pro veřejnost, není v sitemap, `llms.txt` ani v patičce. |
| Stránka úlohy bez reference | Bez bloku `caseStudyGrid`. Text to říká a odkazuje na demo. |
| Editor změní H2 průvodce v administraci | Skript H2 nemění (porovnává přesnou hodnotu). Odstavec vloží, když ho článek nemá. |
| Druhý běh skriptu | Nic nevytvoří ani nezmění. |
| Stejné FAQ ve dvou blocích stránky | `FAQPage` ho má jednou (`faqsFromLayout`, etapa 1). |

## 13. Rizika

| Riziko | Dopad | Opatření |
|---|---|---|
| Stránka řešení a 4 stránky úloh si konkurují | Google ukáže jen jednu | Jiné hlavní slovo, jiné H1 a `seo.title`, stránka řešení odkazuje na úlohy, úlohy zpět. Postup nasazení jen na stránce řešení. |
| Odstranění 3 stránek etapy 1 | Ztráta schválených textů | Texty zůstávají v historii gitu. Rozhodne Filip (otázka 1). |
| Migrace smaže `footer.copyright` | Ztráta hodnoty | Migrace hodnotu nejdřív zkopíruje do `company.legalName`. Test migrace na kopii databáze po `pnpm seed`. |
| `getPricing` vrátí blok ze stránky řešení | Zmizí ceny v `Product.offers` | Filtr v 6.2 a test. |
| Ověřovací nástroj nesleduje přesměrování kořene | Ověření selže | Registrace `https://robopipe.io/cs` nebo DNS (kapitola 8). |
| `sameAs` na KOALA42 | Jazykové modely spojí Robopipe s jinou firmou | Otázka 3. |
| Dvě adresy (web a rejstřík) | Rozporné údaje pro vyhledávače a modely | Otázka 2. Sídlo z rejstříku je jen v `company.registration`. |
| Text slíbí schopnost, kterou web nemá | Nepravdivá tvrzení | Pravidla 9.0, tester porovná tvrzení se zdroji z kapitoly 10. |

## 14. Co se nemění

- Routy, `[slug]`, hreflang, canonical, sitemap, `llms.txt` (kromě řádku firmy), `robots.ts`.
- Kolekce `pages`, `posts`, `case-studies`, `faqs`, `redirects` a jejich práva.
- Detail a výpis studií (kromě sekce řešení ve výpisu).
- Stránka automatické anotace, článek o auto anotaci, článek o Manufacturing Forum, ostatní články.
- Titulek a hero úvodu, claim, ceník (kromě FAQ), design, Tailwind tokeny, Dockerfile, Coolify.
- Nízké chyby testera etapy 1 (T5, T7, T8, T10 až T12).

## 15. Plán pro vývojáře

Větev `feat/seo-geo-stage2`. Po každém kroku spusť `pnpm lint` a `pnpm exec tsc --noEmit`. Testy jen s lokální databází.

| # | Krok | Soubory | Test |
|---|---|---|---|
| 1 | Schéma 5.1 až 5.4, migrace s kopií `copyright`, `generate:types` | `src/globals/*`, `src/blocks/IndustryCards/config.ts`, `src/blocks/PricingTable/config.ts`, `src/migrations/*`, `src/payload-types.ts` | `pnpm payload migrate` na čisté databázi a na databázi po `pnpm seed` z `master`. Po migraci má `company.legalName` hodnotu z `copyright`. |
| 2 | `getSolutionPages`, `industryCards` se zdrojem, patička, výpis studií, překlady | 6.1, 6.5 | int `solutions`: pořadí, vynechání konceptu a jazyka bez slugu |
| 3 | `pricingTable` se zdrojem, filtr v `getPricing` | 6.2 | int `jsonLd`/`pricing`: `getPricing` přeskočí blok `pricingPage` |
| 4 | Fakta o firmě: `organizationLd`, patička, `contactForm`, `llms.txt` | 6.3 | int `jsonLd`: `legalName`, `identifier`, prázdné hodnoty chybí. int `llmsTxt`: řádek firmy. |
| 5 | Ověřovací značky | 6.4 | int `meta`: `verificationMeta` pro oba tokeny, jeden token, žádný token, mezery |
| 6 | Skript: typy, `landingLayout`, pravidla 1 až 9 z 6.6 | `src/seed/seoGeo.ts` | int `seoGeo` (kapitola 15.1) |
| 7 | Texty: kapitola 9 a 11.1, odstranění 3 stránek a oprava odkazů | `seed-assets/copy/seo-geo/*` | int `copyLinks` (15.1) |
| 8 | Úprava testů etapy 1 | `tests/e2e/seo.e2e.spec.ts` (`NEW_PAIRS`), `tests/int/seoGeo.int.spec.ts`, `tests/int/llmsTxt.int.spec.ts` | počty URL podle tabulky v kapitole 4 |
| 9 | Nový e2e soubor `tests/e2e/seo-stage2.e2e.spec.ts` | | kapitola 15.1 |
| 10 | README: sekce „SEO and GEO content script“ doplnit o `settings.json`, `existing-pages.json`, pojistku značek, ověřovací značky | `README.md` | čtení |
| 11 | Celková kontrola | | `pnpm build`, `pnpm test:int`, `pnpm test:e2e`, Lighthouse |

### 15.1 Testy k akceptačním kritériím

E2e testy čtou seznam URL z jednoho pole `STAGE2_PAGES = [{ cs, en, keyword: { cs, en } }]` v testu, ne ze sitemap.

| AC | Test | Typ |
|---|---|---|
| 1 | 5 párů URL (řešení a 4 úlohy) vrací 200. Každá URL je v `sitemap.xml` s `hreflang` cs, en a `x-default`. Každá je v `/llms.txt`. | e2e |
| 2 | Každá URL: `<title>` do 60 znaků, `meta description` do 160 znaků, jeden `canonical` na sebe, `og:image` vrací 200, každý `ld+json` je platný JSON a obsahuje `BreadcrumbList`. Strukturální kontrola povinných vlastností jako v etapě 1. | e2e |
| 3 | Hlavní slovo (bez ohledu na velikost písmen) je v `<title>`, v `h1` a v prvním `<p>` uvnitř `main`. | e2e |
| 4 | Každá stránka úlohy má v `main` odkaz na `/case-studies/` nebo `/blog/`, nebo text „referenci“ / „reference“. Stránka etiket text obsahuje. | e2e |
| 5 | `/cs/o-nas` a `/en/about` vrací 200, když `landing-about*.md` neobsahuje `[doplnit Filip]`, jinak 404. Na každé URL ze `STAGE2_PAGES`, na úvodu a na ceníku je právě jeden objekt s `@id` = `{SERVER_URL}/#organization` a vlastností `name`. | e2e |
| 5 | `organizationLd` s plnými a prázdnými `company` | int |
| 6 | `verificationMeta` se dvěma, jedním a žádným tokenem. E2e: bez hodnoty `/cs` nemá `msvalidate.01` ani `seznam-wmt`. Int test s Payload: zapiš tokeny do `site-settings`, vyrenderuj metadata layoutu, ověř obě značky, smaž tokeny. | int, e2e |
| 7 | Tarify v bloku `pricing` na stránce řešení mají stejné názvy a ceny jako `pricingTable` na `/cs/cenik` a jako `Product.offers` na `/cs`. | e2e |
| 8 | Žádná URL ze `sitemap.xml` nemá v HTML `[doplnit Filip]` ani `[ověřit]`. Int `seoGeo`: dokument se značkou zůstane po `--status=published` konceptem. | e2e, int |
| 9 | Na šířce 320 a 390 px nemá žádná URL ze `STAGE2_PAGES`, `/cs/case-studies` ani `/cs` vodorovné posouvání (`scrollWidth <= innerWidth`). | e2e |
| 10 | `pnpm lint`, `tsc --noEmit`, `pnpm build`, `pnpm test:int`, `pnpm test:e2e`. Lighthouse SEO aspoň 95 na `/cs/kamerova-kontrola-kvality` a `/cs/kontrola-etiket`. Známá chyba L1 z issue #3 se počítá jako známá. | ruční, e2e |

Další testy:

- int `seoGeo`: druhý běh nic nezmění. Chybějící blok existující stránky se doplní na správné místo. Ručně změněný blok zůstane. Sloupec „Řešení“ z etapy 1 zmizí. Odkaz „O nás“ v patičce vznikne jen pro publikovanou stránku. FAQ ceníku se nepřidají dvakrát. H2 průvodce se změní jen z přesné dnešní hodnoty. Odstavec se nevloží dvakrát. Stránka `obsolete` se nesmaže.
- int `copyLinks`: každý odkaz `](/…)` v `seed-assets/copy/seo-geo/*.md` míří na slug ze seedu, na sekci (`/cs`, `/cs/cenik`, `/cs/obory`, `/cs/case-studies`, `/cs/blog/<slug>` existujícího článku) nebo na studii. Každý klíč ve `faqs.json` někdo používá.
- e2e: úvod, výpis studií a patička na `/cs` i `/en` odkazují na všech 5 stránek z `STAGE2_PAGES`.
- e2e: každý interní odkaz v `main` nových stránek vrací 200.

## 16. Otázky pro Filipa

1. **Odstranit ze seedu stránky „AI kontrola kvality“, „Strojové vidění“ a „Počítačové vidění“ z etapy 1?** Doporučuji ano. Cílí na stejná slova jako úvod a průvodce a nejsou veřejné. Při „ne“ zůstanou a průvodce na ně jen odkáže.
2. **Která adresa platí pro kontakt: Sokolovská 81/55 (web) nebo Plynární 1032/29 (rejstřík)?** Doporučuji: kontakt nechat podle skutečné kanceláře a sídlo z rejstříku ukázat jen v řádku o zápisu. Když Sokolovská už neplatí, nahradit ji.
3. **Má Robopipe vlastní profil na LinkedIn?** Doporučuji ho použít místo profilu KOALA42. Když neexistuje, profil KOALA42 z `socials` odebrat, protože `sameAs` tvrdí, že jde o stejnou firmu.
4. **Umí Robopipe přečíst text z etikety (datum spotřeby)?** Doporučuji psát jen o přítomnosti, pozici a čitelnosti kódu šarže, jak to říká web. Při „ano“ přidám variantu „čtení data spotřeby“.
5. **Může skript etapy 1 v produkci počkat na sloučení etapy 2?** Doporučuji ano. Jeden běh je jednodušší a nevyžaduje ruční úklid z kapitoly 11.3.
