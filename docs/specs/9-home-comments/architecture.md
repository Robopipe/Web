# Architektura: úvodní stránka, Filipovy komentáře 11. 11. 2026 (issue #9)

Zadání: [`product.md`](./product.md). Tento dokument říká, kam patří každá změna, a dává vývojáři plán po krocích.
Vývojář do produkce nezapisuje. Obsah do produkce spustí Arthur až po Filipově pokynu (kritérium 5.2).

## 1. Zjištění (11. 11. 2026, produkce jen čtena)

Zdroje: `curl https://robopipe.io/cs` a `/en`, Payload REST anonymně a účtem `arthur@robopipe.io` (jen GET).

| Co | Kde je to dnes | Kód, nebo obsah |
|---|---|---|
| Pořadí sekcí úvodní stránky | `pages` id 5 (`slug: home`), pole `layout`. Bloky ve stejném pořadí v cs i en (pořadí bloků Payload nelokalizuje). | obsah |
| Pruh „Jsme součástí“ | Blok `logoCloud`, `id` a `blockName` `seo-geo-memberships`, `source: memberships`, index 2 hned za logy zákazníků (`home_1`). Vložil ho skript `seed:seo-geo` (#2). Loga čte z `site-settings.memberships`. | obsah (pozice), kód (vzhled `src/blocks/LogoCloud/Component.tsx`) |
| Sekce „Automatická anotace: …“ | Blok `processSteps`, `id` a `blockName` `seo-geo-auto-annotation`, index 7. Vložil ho `seed:seo-geo`. | obsah |
| Karta „Kontrola etiket“ | Blok `industryCards` `seo-geo-solutions` se `source: solutions`. Karty skládá `getSolutionPages()` (`src/lib/queries.ts:205`) ze stránek v `site-settings.solutions` (`[7, 8, 9, 10, 11, 12]`). Obrázek karty = `seo.image` stránky, když je prázdný, tak obrázek jejího hero bloku. | kód (pravidlo), obsah (obrázek) |
| Obrázek té karty dnes | Stránka id 10 (`/cs/kontrola-etiket`, `/en/label-inspection`): `seo.image` je prázdný, hero má media id 45 `camera-front.png` (render kamery, 3125×3125, GCS `robopipe-payload-media`). Alt media 45: „Kontrola etiket“ / „Label inspection“. | obsah |
| Text karet „Nastavíte si sami“ a kroků | `featureGrid` `home_2`, položka `home_2_features_0`. Pole `text` je `textarea`, odkaz do něj dát nejde. Žádný blok úvodní stránky nemá odkaz uvnitř textu. | kód (chybí pole), obsah (text) |
| Blok „Jsme součástí“ v patičce | `src/components/Footer.tsx:84`, poslední potomek `div.space-y-5`. Mezera nad ním je jen `space-y-5` (20 px). | kód |
| „Příběh zákazníka“ a „Z blogu“ | `testimonialBar` `home_5` (štítek „Příběh zákazníka“ je obsah bloku) a `splitSection` `home_6` (nadpis „Z blogu“ a FAQ). | obsah |
| Koncepty v produkci | Stránky 5 a 10 nemají neschválený koncept. Poslední verze je publikovaná 11. 11. 00:53 (běh `seed:seo-geo`). Filip je ručně neupravil. | — |
| Revalidace | Zápis přes REST běží v serveru. Hook `src/hooks/revalidate.ts` zavolá `revalidatePath('/', 'layout')`. Úvodní stránka má navíc `revalidate = 600`. | kód (beze změny) |

Důležité pro opakované běhy: `seoGeo.ts` (sekce „home page“, ř. 631–759) přidá blok `seo-geo-memberships` za první `logoCloud` a blok `seo-geo-auto-annotation` před `testimonialBar`, **když chybí**. Kdo bloky v produkci jen ručně přesune nebo smaže, tomu je příští běh `seed:seo-geo` (nebo čerstvý `pnpm seed`) vrátí. Proto změna obsahu musí jít přes stejný skript, ne ručně v administraci.

## 2. Hlavní rozhodnutí

1. **Obsah mění existující skript `seed:seo-geo`** (`src/seed/seoGeo.ts`, data v `seed-assets/copy/seo-geo/`). Žádný nový jednorázový skript. Důvod: skript už úvodní stránku spravuje, má `--dry-run`, `--remote`, koncepty a publikaci. Druhý skript by držel druhou pravdu o téže stránce a starý by změny vracel.
2. **Každé pravidlo je idempotentní a nepřepíše Filipovu ruční úpravu.** Skript mění hodnotu jen ze známého stavu, který sám vytvořil (stejný princip jako `replaceIf` u eyebrow a SEO).
3. **Odkaz na automatickou anotaci dostane nové volitelné pole `link` u položky `featureGrid`** (existující `linkField`). Text karty se nemění. Věta je popisek odkazu a vykreslí se na konci textu karty.
4. **Obrázek karty jde do `seo.image` stránky „Kontrola etiket“**, ne do hero. Kód ho už pro kartu upřednostní. Stránka sama (hero) se nezmění.
5. **Patička je čistě kód**, jedna třída v `Footer.tsx`.

Zvažované a odmítnuté varianty:

- Ruční změna v administraci: příští běh `seed:seo-geo` ji vrátí (viz kap. 1). Odmítnuto.
- Odkaz ve formátu Markdown uvnitř `textarea` a jeho parsování: skrytá konvence, pevná adresa místo vazby na stránku (slug je lokalizovaný a může se změnit). Odmítnuto.
- Výměna hero obrázku stránky 10: změní i stránku `/cs/kontrola-etiket`, to odporuje kritériu 5.1. Odmítnuto.
- Nové pole `cardImage` jen pro kartu: nové schéma pro věc, kterou `seo.image` už umí. Odmítnuto.

## 3. Rozpory s product.md a otázky

### 3.1 Snímek s kódem: přepravka místo vaniček (k 2.1 až 2.4)

`product.md` uvádí jako příklad vaničky na pásu. Kód na vaničkách je čitelný, ale každý snímek má silné rozmazání pohybem pásu. To odporuje kritériu 2.4 (obrázek je ostrý). Navrhuji ostrý snímek etikety na přepravce s díly (kap. 6). Etiketa s čárovými kódy je přímo úloha „Kontrola etiket“.

### 3.2 Jména firem na etiketě (k 2.1)

Etiketa ukazuje jméno a adresu odběratele „Shape Corp. Czech Republic s.r.o.“ a dodavatele „KeyTec Ceske Budejovice s.r.o.“. Ani jedna firma není mezi zákazníky na webu (loga, případy užití). **Doporučení:** blok s těmito jmény a adresami rozmazat (kap. 6, krok 4). Kód a číslo dílu zůstanou ostré. Otázka pro Filipa: smí být jména vidět? Bez odpovědi platí rozmazání.

### 3.3 Obrázek pro sdílení stránky „Kontrola etiket“ (k 5.1)

`seo.image` je také obrázek Open Graph stránky `/cs/kontrola-etiket` a `/en/label-inspection`. Viditelná stránka se nezmění, změní se jen náhled při sdílení odkazu (dnes je to výchozí obrázek webu). **Doporučení:** přijmout, skutečný záběr je lepší náhled. Když to Filip nechce, je nutné nové pole `cardImage` (odmítnutá varianta výše).

### 3.4 Věta o automatické anotaci (k 3.3)

Doporučené místo je karta „Nastavíte si sami“ (`home_2_features_0`). Krok „Přidejte svůj produkt“ (`processSteps` `home_4`) je na tmavém pozadí a jeho pole `cta` už drží tlačítko „Domluvit demo“. Text věty je v kap. 5.3. Filip ho schválí v náhledu konceptu nebo v dry run výpisu.

## 4. Datový model a migrace

### 4.1 `featureGrid`, položka `features` (`src/blocks/FeatureGrid/config.ts`)

Za pole `text` přidej:

```ts
linkField({ required: false }),
```

Import `import { linkField } from '@/fields/link'` (stejně jako `src/blocks/IndustryCards/config.ts:3`). `linkField` neměň.

Pole `label` a `url` jsou lokalizovaná, `type`, `page` a `newTab` ne. To je stejné jako u karet `industryCards`.

Migrace (pnpm není v `PATH`, použij binárky z `node_modules/.bin`):

```bash
cd ~/Projects/robopipe-web-home
NODE_OPTIONS=--no-deprecation node_modules/.bin/payload migrate:create feature_grid_link
NODE_OPTIONS=--no-deprecation node_modules/.bin/payload migrate
NODE_OPTIONS=--no-deprecation node_modules/.bin/payload generate:types
```

Commitni migraci v `src/migrations/` (včetně `index.ts`) a `src/payload-types.ts`. Migrace jen přidává sloupce a cizí klíč. Nic nemaže. Produkční databázi migruje build v Coolify (`payload migrate && build`).

### 4.2 Co se v modelu nemění

`pages`, `media`, `site-settings`, `footer`, `processSteps`, `logoCloud`, `industryCards`. `seo.image` už existuje a není lokalizovaný, takže jeden zápis platí pro cs i en (kritérium 2.5).

## 5. Změny kódu po modulech

### 5.1 Patička (`src/components/Footer.tsx:85`)

```tsx
<div className="pt-8">
```

Mezera nad blokem bude 20 px (`space-y-5`) + 32 px = 52 px na mobilu i na počítači (kritérium 4.1). Použij `padding`, ne `margin`: `margin` se slije s mezerou od `space-y-5`. Nic jiného v patičce se nemění.

### 5.2 Karta s odkazem (`src/blocks/FeatureGrid/Component.tsx:81–88`)

Odkaz se vykreslí uvnitř stejného `<p>` za textem, oddělený mezerou. Když karta nemá text, vykreslí se v `<p>` sám.

```tsx
{(feature.text || feature.link?.label) && (
  <p className={`mt-2 text-sm leading-relaxed ${dark ? 'text-text-invert-60' : 'text-text-60'}`}>
    {feature.text}
    {feature.link?.label && (
      <>
        {feature.text ? ' ' : null}
        <CMSLink
          link={feature.link}
          className={`underline underline-offset-2 ${
            dark ? 'text-brand hover:text-text-invert' : 'text-brand-fg hover:text-brand-fg-hover'
          }`}
        />
      </>
    )}
  </p>
)}
```

- `CMSLink` (`src/components/CMSLink.tsx`) už řeší lokalizovaný slug cílové stránky. Když stránka nemá slug nebo chybí, vrátí `null`, takže nevznikne mrtvý odkaz.
- Barvy jsou stejné jako odkazy v `RichText` (`prose-a:text-brand-fg hover:prose-a:text-brand-fg-hover`).
- `getPageBySlug` čte s `depth: 2`, takže `link.page` přijde jako objekt (stejně jako `cta` v `processSteps`).

### 5.3 Skript obsahu (`src/seed/seoGeo.ts` a `seed-assets/copy/seo-geo/`)

Všechna pravidla platí pro lokální databázi, `--production` i `--remote`. Dry run nic nezapíše a vypíše plán.

**a) `home.json`**

1. Smaž objekt `autoAnnotation`. Přidej `"removeBlocks": ["seo-geo-auto-annotation"]`.
2. `memberships` neměň. Pravidlo pozice (5.3 b) je chování skriptu, ne text, a patří jen do kódu. Komentář u `HomeCopy.memberships` přepiš na novou pozici.
3. Přidej:

```json
"featureLinks": [
  {
    "block": "home_2",
    "feature": "home_2_features_0",
    "page": "auto-annotation",
    "cs": "Snímky vám pomůže označit automatická anotace.",
    "en": "Auto annotation helps you label the images."
  }
]
```

`page` je klíč z `landing-pages.json` (stránka id 12 v produkci). Věty schvaluje Filip (kap. 3.4).

**b) Blok „Jsme součástí“ na úvodní stránce (ř. 641–658)**

- Blok chybí: vlož ho hned za první `testimonialBar`. Když `testimonialBar` není, vlož ho na konec. (Čerstvý `pnpm seed` tak dostane novou pozici.)
- Blok existuje a leží **přímo za prvním `logoCloud` se `source` jiným než `memberships`** (stará pozice z #2): přesuň ho za první `testimonialBar`. Obsah bloku (nadpis cs i en) se nemění, přesouvá se jen pozice.
- Blok existuje jinde: nech ho být. Report: `skipped`. (Filip ho mohl přesunout ručně.)
- Report řádek: `home page (memberships moved after testimonialBar)`.

**c) Sekce automatické anotace (ř. 660–689)**

- Kód, který blok přidává, smaž celý. Typ `HomeCopy.autoAnnotation` nahraď `removeBlocks: string[]`.
- Každý blok, jehož `blockName` je v `removeBlocks`, z `layout` odeber. Report: `home page (removed block seo-geo-auto-annotation)`.
- Média `annotate-ui.png` se nemažou. Používá je článek a stránka automatické anotace.
- Článek (ř. 801) bral obrázek z `home.autoAnnotation.image`. Přidej do frontmatteru `post-auto-annotation.cs.md` řádek `heroImage: annotate-ui.png`, do typu `PostCopy` pole `heroImage?: string` a v ř. 801 čti `post.cs.heroImage`. Žádná druhá kopie názvu souboru.

**d) Odkaz v kartě (`featureLinks`)**

- Najdi blok `block` a v něm položku `feature` podle `id`. Když chybí, report `skipped: home feature link home_2_features_0 (not found)` a nic nepiš.
- V každém jazyce zapiš `link` jen tehdy, když `link.label` v tom jazyce je prázdný: `{ label, type: 'internal', page: pageIds.get(page) }`. Hodnota, kterou tam dal Filip, zůstane.
- Když stránka `page` nemá id (dry run nové stránky), zapiš jen do plánu, jako dnes u `ctaFor`.
- Report: `home page (feature link home_2_features_0)`.

**e) Zápis úvodní stránky**

Pravidla b), c), d) změní pole `blocks` a jeho hodnoty po jazycích. Použij existující smyčku ř. 731–753: podmínku `continue` rozšiř o „pořadí nebo sada bloků se změnila“ a „odkaz se zapsal“. Každý jazyk se znovu čte (`latest(..., locale)`), takže hodnoty ostatních bloků v daném jazyce zůstanou. Koncept a publikace jdou existující cestou (`managed`, `publishLatest`).

**f) Obrázek karty (`landing-pages.json`, položka `label-inspection`)**

Přidej `"cardImage": "label-inspection-card.jpg"`. V cyklu stránek (ř. 528–624):

- Existující stránka: když `seo.image` v posledním konceptu je prázdný, zapiš `seo: { ...seo, image: await media(cardImage, title) }` do konceptu (stačí jazyk `cs`, pole není lokalizované). Když `seo.image` už má hodnotu, nech ji (Filipova volba). Report: `page kontrola-etiket (card image)`.
- Nová stránka: dej `seo.image` rovnou do `pageData`.
- Alt nového média = titulek stránky cs a en, stejně jako u hero (`media(page.image, …)`). Tak alt karty zůstane „Kontrola etiket“ / „Label inspection“ (kritérium 2.5).
- Soubor leží v `seed-assets/img/label-inspection-card.jpg` (kap. 6). Helper `media()` ho najde podle názvu, takže druhý běh nové médium nevytvoří.

### 5.4 Co se v kódu nemění

`LogoCloud` (vzhled pruhu, kritérium 1.2), `IndustryCards`, `getSolutionPages`, `ProcessSteps`, `RenderBlocks`, `jsonLd.ts`, `meta.ts`, `revalidate.ts`, překlady `src/i18n/messages/*.json`, stránka a karta „Automatická anotace“ (kritérium 3.2), `site-settings`.

## 6. Obrázek karty „Kontrola etiket“

### 6.1 Ověřený snímek

| | |
|---|---|
| Video | `~/.openclaw/workspace/output/robopipe-web/hero-video/src/detekceSpravnehoPoctuKusuVKrabici.MOV` (v6, 1920×1080, HEVC) |
| Čas | 5,90 s (`ffmpeg -ss 5.9 -i … -frames:v 1`). Použitelné jsou i 5,70 s a 6,03 s. |
| Obsah | Etiketa přepravky s díly: PART, QTY, SUPPLIER, SERIAL, každý s kódem Code128. |
| Dekodér 1 | zxing-cpp 2.x: `P256355-80`, `Q250`, `V360565097`, `SK0347118311`. Kód PART leží v rámečku x 845–1280, y 434–478 (celý snímek). |
| Dekodér 2 | Apple Vision `VNDetectBarcodesRequest`: stejné čtyři hodnoty. |
| OCR | Apple Vision `VNRecognizeTextRequest`: tištěné číslo nad kódem „256355-80“ (jistota 1,00). Shoduje se s kódem bez identifikátoru dat `P`. |
| Hodnota do štítku | `PART 256355-80` |

Další nálezy: video v3 (vaničky, `7FAA02E7-….MP4`, 1,27–4,30 s) má EAN-8 `20363901` (kontrolní číslice sedí). Všechny snímky jsou rozmazané pohybem pásu, proto ne (kap. 3.1). Videa v1, v2, v4, v5 nemají čitelný kód.

Náhledy pro kontrolu: `~/.openclaw/workspace/output/robopipe-web/home-comments-probe/` (`v6_590_small.jpg` celý snímek, `v6_590_crop_check.jpg` navržený výřez s rozmazáním).

### 6.2 Výroba (vývojář)

Skript dej do `~/.openclaw/workspace/output/robopipe-web/hero-video/scripts/label_card.py`, vedle `render.py`. Do repa jde jen výsledný obrázek. Skript zapiš do `catalogue.md` (sekce Build).

1. Vytáhni snímek: `ffmpeg -v error -ss 5.9 -i "<video>" -frames:v 1 /tmp/label-frame.png`.
2. Ověř snímek oběma dekodéry. Hodnota `P256355-80` musí přijít z obou. Když nepřijde, zkus 5,70 s nebo 6,03 s. Hodnotu nikdy nepiš ručně, čti ji z výstupu dekodéru.
3. Vyřízni 4:3 bez změny měřítka: x 480–1680, y 180–1080 (1200×900). Výřez nemá obličeje (jsou nad y 130) ani pracovníka ve vestě.
4. Rozmaž blok s firmami a adresami (kap. 3.2): obdélník ve výřezu x 555–935, y 420–645, Gaussovo rozmazání poloměr 14 a měkký okraj masky. Kódy a číslo dílu zůstanou ostré.
5. Spusť dekodér znovu na výřezu. Musí vrátit `P256355-80`. Polohu rámečku vezmi z tohoto výstupu.
6. Nakresli překryv ve stylu `render.py`: rohové závorky barvou `#cef94c` (tloušťka 5 px, odsazení 14 px od kódu, jemná záře), štítek se zaoblením 6 px, výplň `#cef94c`, text `#1a2410`, písmo `fonts/SpaceMono-Bold.ttf` 30 px. Text štítku: `PART 256355-80`. Bez procent a bez skóre (kritérium 2.4).
7. Štítek dej pod rámeček, ne nad něj. Tištěné číslo „256355-80“ nad kódem musí zůstat vidět. Tak návštěvník sám porovná štítek s etiketou.
8. Ulož `seed-assets/img/label-inspection-card.jpg`: 1200×900, JPEG kvalita 85, sRGB, bez metadat EXIF. Cíl pod 300 kB.
9. Do `implementation.md` zapiš čas snímku, výstupy obou dekodérů a OCR z kroků 2 a 5.

### 6.3 Cesta do Payload

Soubor nahraje skript obsahu (kap. 5.3 f) přes `media()`. V režimu `--remote` jde soubor jako `multipart` na `POST /api/media`. Server ho uloží do GCS (`robopipe-payload-media`) a vytvoří velikosti `thumbnail`, `card`, `hero`, `og`. Ručně do administrace se nenahrává. Jen po Filipově pokynu (kap. 9).

## 7. Tok dat po změně

```
seed-assets/copy/seo-geo/{home.json,landing-pages.json} + seed-assets/img/label-inspection-card.jpg
        │  seed:seo-geo (--dry-run → plán, pak --status=published)
        ▼
Payload: pages 5 (layout: pořadí, bez seo-geo-auto-annotation, link v home_2_features_0)
         pages 10 (seo.image → nové médium)      media (nový soubor v GCS)
        │  afterChange hook → revalidatePath('/', 'layout')
        ▼
/[locale]/page.tsx → RenderBlocks → LogoCloud (nová pozice), FeatureGrid (+CMSLink),
                                    IndustryCards → getSolutionPages → seo.image
Footer.tsx (pt-8) na všech stránkách
```

Výsledné pořadí úvodní stránky (cs i en): hero, loga zákazníků, featureGrid, obory, úlohy, „AI kontrola v provozu za jediný den“, příběh zákazníka, **Jsme součástí**, Z blogu a FAQ, CTA.

## 8. Okrajové případy a rizika

| Případ | Chování |
|---|---|
| cs a en | Pořadí bloků je společné. Odkaz má popisek v obou jazycích a míří na lokalizovaný slug (`/cs/automaticka-anotace`, `/en/auto-annotation`). Obrázek je jeden (`seo.image` není lokalizovaný). |
| Mobil | Pruh má stejný kód, mění se jen pozice. Odkaz se zalomí s textem karty. Obrázek karty má pevný poměr 4:3 (`aspect-4/3`), velikost `card` (768 px). Tester ověří šířky 375 a 1440 px. |
| Cache | Zápis přes REST spustí revalidaci celého webu. Bez ní platí `revalidate = 600`. Nasazení kódu (patička, pole odkazu) přegeneruje stránky při buildu. |
| Pořadí nasazení | Kód (migrace pole `link`) musí být v produkci **před** během skriptu. Jinak Payload pole `link` zahodí a skript to neohlásí. Dry run po nasazení musí plánovat `feature link`. |
| Filip mezitím upraví úvodní stránku | Skript čte poslední verzi a mění jen pozici pruhu, odebírá jeden blok a doplňuje prázdný odkaz. Ostatní hodnoty zůstanou. |
| Neschválený koncept jiné stránky | Režim `--status=published` publikuje poslední koncept každé spravované stránky. Když dry run hlásí `… published` u jiné stránky než `home page` a `page kontrola-etiket`, zastav a zeptej se Filipa. |
| Filip pruh později přesune jinam | Skript ho nechá být (pravidlo 5.3 b). |
| Filip sekci anotace vrátí z historie verzí | Další běh ji znovu odebere (stejný `blockName`). Zapiš do README. |
| `featureGrid` na stránce Ceník | Nové pole je volitelné a prázdné. Nic se nevykreslí. |
| JSON-LD | `productLd` čte `seo.image` jen úvodní stránky. Beze změny. |
| Soukromí na snímku | Jména firem rozmazaná (kap. 3.2). Obličeje mimo výřez. |

## 9. Plán pro vývojáře

1. Ve worktree `~/Projects/robopipe-web-home` (větev `feat/9-home-comments`) spusť lokální Postgres a seed podle README.
2. Patička: kap. 5.1.
3. Pole `link` v `featureGrid`, migrace a typy: kap. 4.1.
4. Vykreslení odkazu: kap. 5.2.
5. Skript obsahu: kap. 5.3 a) až f).
6. Obrázek: kap. 6.2. Ulož ho do `seed-assets/img/`.
7. Testy (`tests/int/`, bez produkce):
   - Nový `homeComments.int.spec.ts`: na databázi ve stavu po #6 (blok anotace na indexu 7, pruh za `home_1`) jeden běh skriptu dá pořadí z kap. 7, bez `seo-geo-auto-annotation`, s odkazem v cs i en a se `seo.image` stránky 10. Druhý běh nic nezmění (report jen `skipped`).
   - Ručně přesunutý pruh a ručně vyplněný odkaz zůstanou. `seo.image` s jinou hodnotou zůstane.
   - Dry run nezapíše nic (počet verzí stránek 5 a 10 se nezmění).
   - Upravit `seoGeoStage2.int.spec.ts:579`, jestli očekává jiný report úvodní stránky.
8. E2E (`tests/e2e/`): pořadí sekcí na `/cs` a `/en`, žádný nadpis „Automatická anotace: …“, odkaz v kartě vede na stránku se stavem 200, obrázek karty „Kontrola etiket“ je nové médium, patička má nad blokem „Jsme součástí“ aspoň 48 px (`getBoundingClientRect`).
9. Kontroly: `node_modules/.bin/tsc --noEmit`, `node_modules/.bin/eslint .`, `test:int`, `test:e2e` (příkazy z `package.json` přes `node_modules/.bin`).
10. README: do tabulky obsahu v sekci „SEO and GEO content script“ doplň `removeBlocks`, `featureLinks`, `cardImage` a pravidlo přesunu pruhu.
11. `implementation.md` se stavem, výstupy dekodérů a lokálním dry run. Produkční dry run spustí Arthur (kap. 10, krok 3).

## 10. Nasazení do produkce (jen po Filipově pokynu)

Kód a obsah jsou dva kroky. Oba čekají na Filipův pokyn (kritérium 5.2).

1. **Kód.** Merge PR do `master`. Coolify sestaví obraz, spustí migraci a build. Ověř:
   ```bash
   curl -s https://robopipe.io/cs | grep -c '<div class="pt-8"><p class="mb-3 text-sm font-semibold text-text-invert">'   # 1 = patička nasazená
   ```
   Úvodní stránka se jinak nezmění (pole odkazu je prázdné).
2. **Dry run obsahu** (jen čtení, klient odmítne každý zápis):
   ```bash
   cd ~/Projects/robopipe-web-home && git fetch origin && git switch --detach origin/master
   SEED_REMOTE_EMAIL=arthur@robopipe.io \
   SEED_REMOTE_PASSWORD="$(security find-generic-password -a arthur@robopipe.io -s robopipe-payload-password -w)" \
   NODE_OPTIONS=--no-deprecation node_modules/.bin/tsx src/seed/applySeoGeo.ts \
     --remote=https://robopipe.io --status=published --dry-run | tee /tmp/seo-geo-9-dry.txt
   ```
3. **Kontrola plánu.** Očekávaný výsledek:
   - `created`: jen `media label-inspection-card.jpg`.
   - `updated`: `page kontrola-etiket (card image)`, `home page` (přesun pruhu, odebraný blok, odkaz), `page kontrola-etiket published`, `home page published`.
   - Vše ostatní `skipped`.
   Jiný řádek v `created` nebo `updated` znamená stop. Pošli Filipovi výpis a nic nespouštěj.
4. **Filipův pokyn** na základě výpisu z kroku 3.
5. **Zápis:** stejný příkaz jako v kroku 2 bez `--dry-run`.
6. **Ověření:**
   ```bash
   curl -s https://robopipe.io/cs | grep -o 'Jsme součástí\|Automatická anotace: rámečky\|automaticka-anotace\|label-inspection-card' | sort | uniq -c
   curl -s https://robopipe.io/en | grep -o 'Part of\|Auto annotation: AI proposes\|/en/auto-annotation\|label-inspection-card' | sort | uniq -c
   ```
   Očekávání: „Automatická anotace: rámečky“ / „Auto annotation: AI proposes“ chybí. Ostatní jsou přítomné. Pořadí sekcí ověř výpisem `layout` (`GET /api/pages/5?depth=0`).
7. **Návrat:** změny jsou nové verze stránek 5 a 10. Při problému obnov v administraci předchozí verzi (Verze → Restore). Nové médium lze nechat.
