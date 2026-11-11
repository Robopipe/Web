# Implementace: úvodní stránka, Filipovy komentáře 11. 11. 2026 (issue #9)

Zadání: [`product.md`](./product.md). Architektura: [`architecture.md`](./architecture.md).
Větev `feat/9-home-comments`. Nic není v produkci. Produkci jsem jen četl (velikost `/cs`).

## 1. Co je hotové

| Kritérium | Změna | Kde |
|---|---|---|
| 1.1, 1.2 | Skript obsahu přesune pruh „Jsme součástí“ ze staré pozice za první `testimonialBar`. Na čerstvé databázi ho tam rovnou vloží. Jinou pozici nechá. | `src/seed/seoGeo.ts` (home page) |
| 2.1 až 2.5 | Nový obrázek `seed-assets/img/label-inspection-card.jpg`. Skript ho zapíše do `seo.image` stránky „Kontrola etiket“, jen když je pole prázdné. | `landing-pages.json` (`cardImage`), `seoGeo.ts` |
| 3.1 | Skript odebere blok `seo-geo-auto-annotation` (`removeBlocks`). Kód, který ho přidával, je pryč. | `home.json`, `seoGeo.ts` |
| 3.2 | Stránka a karta „Automatická anotace“ se nemění. Článek bere obrázek z `heroImage` ve frontmatteru. | `post-auto-annotation.cs.md` |
| 3.3 | Nové volitelné pole `link` u položky `featureGrid`. Karta „Nastavíte si sami“ má na konci textu odkaz na stránku automatické anotace (cs i en). | `src/blocks/FeatureGrid/*`, migrace `20261111_111049_feature_grid_link`, `home.json` (`featureLinks`) |
| 4.1 | Blok „Jsme součástí“ v patičce má `pt-8`. Mezera nad ním je 52 px. | `src/components/Footer.tsx` |
| 5.1, 5.2 | Platí pro `/cs` i `/en`. Nic nebylo nasazeno ani zapsáno do produkce. | |

Ostatní: README (tabulka obsahu), typy `src/payload-types.ts`, testy (kap. 4).

## 2. Otázky z architektury, kap. 3

Řešeno podle doporučení architekta:

- 3.1 Snímek etikety na přepravce s díly (video v6), ne vaničky.
- 3.2 Jména a adresy firem na etiketě jsou rozmazané.
- 3.3 `seo.image` stránky „Kontrola etiket“ se mění. Náhled při sdílení stránky bude tento snímek.
- 3.4 Věta je v kartě „Nastavíte si sami“: „Snímky vám pomůže označit automatická anotace.“ / „Auto annotation helps you label the images.“ Filip ji schválí v náhledu.

## 3. Obrázek karty a výstup dekodérů

Skript: `~/.openclaw/workspace/output/robopipe-web/hero-video/scripts/label_card.py` (spuštění `uv run scripts/label_card.py <out.jpg>`).
Druhý čtecí nástroj: `scripts/vision_read.swift` (Apple Vision). Zápis je v `catalogue.md`, sekce Build.
Skript skončí a nic nezapíše, když se oba dekodéry neshodnou nebo OCR hodnotu nepotvrdí. Text štítku čte z výstupu dekodéru.

Snímek: video `detekceSpravnehoPoctuKusuVKrabici.MOV`, čas 5,9 s. Výřez x 480–1680, y 180–1080 (1200×900).

Celý snímek:

```
zxing-cpp: Code 128 P256355-80 (845, 434, 1280, 478), Q250, V360565097, SK0347118311
vision:    Code128  P256355-80 (846, 427, 1279, 485), Q250, V360565097, SK0347118311
```

Výřez po rozmazání (poloha rámečku je z tohoto výstupu):

```
zxing-cpp: Code 128 P256355-80 (365, 254, 800, 298), Q250, V360565097, SK0347118311
vision:    Code128  P256355-80 (366, 247, 799, 305), Q250, V360565097, SK0347118311
OCR (Vision): "256355-80", jistota 1.00
```

Hotový JPEG s překryvem (kontrola po zápisu): zxing-cpp i Vision znovu čtou `P256355-80`. OCR čte tištěné číslo „256355-80“ i štítek „PART 256355-80“.

Štítek: `PART 256355-80` (hodnota kódu bez identifikátoru dat `P`). Bez procent a skóre. Soubor 1200×900, JPEG kvalita 85, 130 kB, bez EXIF.

## 4. Odchylky od architektury

1. **Řádky reportu úvodní stránky.** Architektura uvádí jednotlivé řádky (5.3) i souhrnný `home page` (kap. 10). Skript píše oboje: souhrnný `home page` v `updated`, když se stránka mění, a podrobné řádky `home page (removed block …)`, `home page (memberships moved after testimonialBar)`, `home page (feature link …)`. Druhý běh hlásí `home page (memberships position)` a `home feature link home_2_features_0 (set)` ve `skipped`.
2. **Přesun pruhu bez `testimonialBar`.** Architektura tento případ neřeší. Skript pruh v tom případě nepřesune a hlásí `skipped`.
3. **Cílová stránka odkazu chybí.** Když stránka `auto-annotation` neexistuje a není ani plánovaná, skript odkaz nezapíše a hlásí `home feature link … (page auto-annotation not found)`. Odkaz bez stránky by zablokoval pozdější doplnění.
4. **Rozmazání.** Maska má měkký okraj Gaussovým rozmazáním poloměru 8 px. Hodnota není v architektuře.

## 5. Ověření

Lokální databáze `robopipe_h9` (Postgres na `localhost:5432`), server `next start` na portu 3820.

1. Databázi jsem naplnil kódem před změnou (`541b256`): stav jako po #6.
2. Lokální dry run (`--status=published --dry-run`):
   ```
   created (1): media label-inspection-card.jpg
   updated (7): page kontrola-etiket (card image), home page (removed block seo-geo-auto-annotation),
     home page (memberships moved after testimonialBar), home page, home page (feature link home_2_features_0),
     page kontrola-etiket published, home page published
   ```
   Odpovídá očekávání z architektury, kap. 10, krok 3.
3. Ostrý lokální běh dal stejný výpis. Druhý běh: `created (0)`, `updated (0)`.
4. Pořadí bloků (cs i en): hero, logoCloud `home_1`, featureGrid, industryCards, industryCards `seo-geo-solutions`, processSteps, testimonialBar, logoCloud `seo-geo-memberships`, splitSection, ctaBanner.
5. Čerstvý `pnpm seed` na prázdné databázi dal stejné pořadí, odkaz i obrázek.
6. Migrace na prázdné databázi s `NODE_ENV=production`: všechny migrace prošly, nová za 10 ms. Migrace jen přidává sloupce, typy a cizí klíče.

| Kontrola | Výsledek |
|---|---|
| `tsc --noEmit` | 0 chyb |
| `eslint .` | 0 chyb, 2 stávající varování |
| `next build` | OK |
| `test:int` | 112/112 (20 souborů), z toho nové `homeComments.int.spec.ts` 3/3 |
| `test:e2e` | 76 prošlo, 2 selhaly (kap. 6, body 2 a 3). Nové `homeComments.e2e.spec.ts` 10/10 |

Screenshoty (`/cs` a `/en`, 1440 px a 375 px, celá stránka): `screens/home-{cs,en}-{desktop,mobile}.jpg`.

Jak ověřit znovu:

```bash
cd ~/Projects/robopipe-web-home
NODE_OPTIONS=--no-deprecation node_modules/.bin/tsx src/seed/applySeoGeo.ts --status=published --dry-run
node_modules/.bin/vitest run --config ./vitest.config.mts tests/int/homeComments.int.spec.ts
E2E_BASE_URL=http://localhost:<port> PLAYWRIGHT_CHROMIUM_PATH=<chrome-headless-shell> \
  node_modules/.bin/playwright test tests/e2e/homeComments.e2e.spec.ts
```

## 6. Známá omezení

1. **Hlavička nese celé stránky.** `Header` je klientská komponenta a dostává globál `header` s `depth: 2`. Odkaz „Úvod“ tak nese celou úvodní stránku. Nový odkaz v kartě přidá do toho celou stránku automatické anotace: asi 11 kB HTML navíc na každé stránce webu (lokálně `/cs` 215 kB). Problém je starší než tato změna. Návrh na samostatný úkol: v `getLayoutGlobals` (`src/lib/queries.ts`) omezit stránky v hlavičce na `slug` (`populate: { pages: { slug: true } }`).
2. **E2E: známá chyba L1.** Test `Blog featured card … long unbroken title` selhává i na `master` (viz `docs/specs/2-seo-geo/implementation.md`, bod 11).
3. **E2E: článek jen v produkci.** Odkaz ze stránky `/cs/kamerova-kontrola-kvality` na článek `co-je-vizualni-system-…` vrací lokálně 404. Lokální seed ten článek nemá (skript hlásí `post … (not found)`). Změna #9 tuto stránku nemění.
4. **Pořadí nasazení.** Kód s migrací musí být v produkci před během skriptu (architektura, kap. 8). Jinak Payload pole `link` zahodí.
5. **Sdílená složka `media/`.** Dvě lokální databáze v jednom worktree sdílejí `./media`. Druhá databáze pak dostane soubory s příponou `-1` a skript média nenajde podle názvu. Pro testy používej jednu databázi na worktree.
6. **Produkční dry run** podle architektury, kap. 10, krok 2, spustí Arthur. Já jsem ho nespouštěl.

## 7. Co má ověřit tester

- `/cs` a `/en` na šířce 375 px a 1440 px: pruh „Jsme součástí“ mezi příběhem zákazníka a blogem, žádná sekce automatické anotace.
- Odkaz v kartě „Nastavíte si sami“ vede na `/cs/automaticka-anotace` a `/en/auto-annotation`.
- Karta „Kontrola etiket“: ostrý snímek, štítek `PART 256355-80` odpovídá číslu na etiketě, jména firem nejsou čitelná.
- Patička: větší mezera nad „Jsme součástí“ na všech stránkách.
- Ruční úpravy zůstanou: přesunutý pruh, vlastní text odkazu, jiný `seo.image` (pokrývá `homeComments.int.spec.ts`).
