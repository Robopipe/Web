# #40 SEO audit 12. 11.: implementace

Režim B (jeden vývojář). Větev `fix/40-seo-audit` z `origin/master` (`7193baa`). Zadání říká `main`, ale repo má jen `master`. Zdroj je audit `visibility/audit-2026-11-12-carbon.md`, nálezy 3, 7, 8, 9, 11, 12 a 13. Migrace databáze není potřeba.

## Stav podle nálezů

| Nález | Stav | Kde |
|---|---|---|
| 7: 302 místo 301 | mimo repo, návod pro Coolify níže | Traefik v Coolify |
| 9: `no-store` a skrytý 11. článek | hotovo | výpis blogu, `src/proxy.ts` |
| 8: JSON-LD | hotovo kromě dvou bodů (viz níže) | `src/lib/jsonLd.ts`, stránky |
| 3: IndexNow | hotovo, klíč se vloží v administraci (nastavení webu) | `src/lib/indexNow.ts`, `src/hooks/indexNow.ts`, `src/globals/SiteSettings.ts` |
| 11: llms.txt, sitemap | hotovo kromě `/llms-full.txt` | `src/lib/llmsTxt.ts`, `src/app/sitemap.ts` |
| 12: og:image, apple-touch-icon | ikona a mezipaměť hotové, obrázky jsou obsah | `next.config.ts` |
| 13: nadpisy, 404, kontrast | nadpisy a kontrast hotové, 404 ne (viz níže), popis je obsah | bloky, `styles.css` |

## Nález 7: přesměrování 301 (mimo repo)

Přesměrování nedělá aplikace. Důkazy:

1. Odpověď 302 má tělo `Found` (5 bajtů) a hlavičku `alt-svc: h3`. Nemá hlavičku `x-powered-by: Next.js, Payload`, kterou posílá každá odpověď aplikace. Tak odpovídá middleware Traefiku.
2. Repo nemá žádné pravidlo pro `www.` ani pro `http://`. `next.config.ts` přesměrovává jen staré adresy Webflow a `shop.robopipe.io`, vždy jako 301.

Coolify sám generuje pro aplikaci štítky Traefiku `redirect-to-https` (`redirectscheme`) a `redirect-to-non-www` (`redirectregex`). Bez `permanent=true` vrací Traefik 302.

Co má správce Coolify udělat:

1. Otevřít aplikaci robopipe-web, záložku Configuration, část General.
2. Zkontrolovat, že Domains obsahuje `https://robopipe.io,https://www.robopipe.io` a Direction je „Redirect to non-www“.
3. V části Container Labels vypnout „Readonly labels“.
4. Přidat tyto dva řádky:
   ```
   traefik.http.middlewares.redirect-to-https.redirectscheme.permanent=true
   traefik.http.middlewares.redirect-to-non-www.redirectregex.permanent=true
   ```
5. Uložit a nasadit znovu (Redeploy). Štítky platí až po novém spuštění kontejneru.
6. Ověřit:
   ```
   curl -sS -o /dev/null -w "%{http_code} %{redirect_url}\n" http://robopipe.io/cs
   curl -sS -o /dev/null -w "%{http_code} %{redirect_url}\n" https://www.robopipe.io/cs
   curl -sS -o /dev/null -w "%{http_code} %{redirect_url}\n" http://www.robopipe.io/cs
   ```
   Všechny tři mají vrátit `301`. Adresa `http://www.` má dál dva skoky (`http://www.` na `https://www.` a pak na `https://robopipe.io`). Oba skoky jsou 301, což vyhledávačům stačí. Jeden skok by potřeboval vlastní router Traefiku, a to audit nežádá.

Když Coolify u některého štítku hlásí jiný název middleware, platí název ze sekce Container Labels (vygenerované řádky s `redirectscheme` a `redirectregex`).

## Nález 9: výpis blogu

1. `/cs/blog` a `/en/blog` nečtou `searchParams`, takže jsou statické s ISR jako zbytek webu. Hlavička je `s-maxage=600, stale-while-revalidate=31535400` místo `no-store`.
2. Na stránce je 24 článků (`POSTS_PER_PAGE` v `src/lib/blogPages.ts`). Dnešních 11 článků je tedy na první stránce.
3. Další stránky jsou `/<jazyk>/blog/page/<n>` (`src/app/(frontend)/[locale]/blog/page/[page]/page.tsx`). Každá má vlastní kanonickou adresu a titulek „Blog: Stránka 2 z 3“. Neexistující stránka vrací 404, `/blog/page/1` vrací 308 na `/blog`.
4. Staré odkazy `?page=<n>` dostanou 301 na `/blog/page/<n>` (`src/lib/blogPageRedirect.ts`, volá ho `src/proxy.ts`). Ostatní parametry (`utm_*`) zůstanou.
5. Výpis a stránkování jsou společná komponenta `src/components/BlogListing.tsx`.

Zveřejnění článku v administraci volá `revalidatePath('/', 'layout')` jako dosud, takže nový článek se ve výpisu ukáže hned.

Chování Next.js, které jsem viděl místně: když byla `/cs/blog/page/2` v mezipaměti jako 404 a pak začala existovat, první obnova po 10 minutách měla správné články, ale bez titulku a kanonické adresy. Nové vykreslení bez staré položky v mezipaměti je správné. Týká se to jen stránky, která přejde z 404 na 200 obnovou podle času.

## Nález 8: JSON-LD

Hotovo:

1. `Product` na `/cs` a `/en`: `name` je název produktu „Robopipe“ (`siteName` z nastavení webu), ne titulek stránky. `image` je obrázek stránky, jinak výchozí obrázek webu. Každá `Offer` má `availability: https://schema.org/InStock`.
2. `Product` s nabídkami je i na ceníku (`/cs/cenik`, `/en/pricing`). Ceník se pozná podle bloku ceníku s vlastními tarify (`ownPricingTable`). Stejnou funkci teď používá i `getPricing`.
3. `Service` na stránkách řešení. Řešení jsou stránky vybrané v nastavení webu (`solutions`), tedy pět stránek řešení a automatická anotace v obou jazycích. Pole: `name`, `description`, `image`, `url`, `provider`.
4. `Article` na případových studiích: `headline`, `description`, `datePublished` (vytvoření v CMS), `dateModified`, `image`, `author` (organizace se jménem a adresou, studie nemají pole autora), `publisher`, `inLanguage`.
5. `Organization.logo` je `https://robopipe.io/logo.png`, čtverec 512 × 512 px vykreslený z `logo.svg` (bílé pozadí). Google bere jen rastrová loga.
6. Fakta o firmě jsou v `src/lib/companyFacts.ts`. Čte je JSON-LD i `llms.txt`.

Adresa: JSON-LD bere adresu z pole `contact.address` v nastavení webu. Na produkci je to Sokolovská 81/55, Karlín. Kód adresu nikde nepíše. Test hlídá, že `src/` a `public/` nikde neobsahují „Plynární“.

Záměrně beze změny:

1. `VideoObject.inLanguage` na anglických stránkách zůstává `cs-CZ`. Video mluví česky (pole `language` u videa má popis „Spoken language“). Anglická stránka ho pouští s titulky. Hodnota `en` by byla nepravdivá.
2. České názvy členství (`Česká inovační platforma`) v `Organization` na anglických stránkách. Pole `memberships.name` v nastavení webu není lokalizované. Oprava potřebuje lokalizované pole, migraci a překlad v administraci. To je obsah, ne tato úloha.

## Nález 3: IndexNow

1. Po zveřejnění nebo úpravě zveřejněné stránky, článku nebo případové studie odešle hook `indexNowAfterChange` adresy dokumentu v obou jazycích. U článku a studie přidá i výpis (`/cs/blog`, `/en/blog` a podobně).
2. Cíl je `https://www.bing.com/indexnow` a `https://search.seznam.cz/indexnow`, metoda POST, JSON s `host`, `key`, `keyLocation` a `urlList`.
3. Klíč je v Payloadu: Site settings → Verification → IndexNow key (`site-settings`, pole `verification.indexNowKey`). Proměnná `INDEXNOW_KEY` platí jen tehdy, když je pole prázdné. Vyhledávače klíč čtou na `https://robopipe.io/indexnow-key.txt`. Bez klíče adresa vrací 404. Viz „Doplněk: klíč v Payloadu“.
4. Odesílá se jen tehdy, když platí všechno: platný klíč (8 až 128 znaků a-z, A-Z, 0-9, pomlčka), `NODE_ENV=production` a `NEXT_PUBLIC_SERVER_URL` je `https` mimo `localhost`. Testy, `next dev` a místní `next start` na localhostu neodešlou nic.
5. Koncepty, automatické ukládání a dokumenty s `seo.noIndex` se neodesílají.
6. Požadavek běží na pozadí s limitem 5 s. Chyba vyhledávače ani chyba čtení dokumentu uložení v administraci nezastaví. Výsledek jde do logu Payloadu (`IndexNow https://www.bing.com/indexnow: 202 for 4 URLs`).
7. Smazané dokumenty se neodesílají. Vyhledávač je najde jako 404 sám.

Hook čte dokument ve všech jazycích ve stejné transakci (`req`). Local API přitom přepíše `req.locale` a `req.query.depth`. Hook je vrátí zpět.

Hook nepošle nic za stránky, které se nezmění. 14 nových stránek řešení z auditu tedy odejde až při jejich příští úpravě. Rychlejší cesta je jednorázové odeslání v Bing Webmaster Tools (viz „Co musí udělat člověk“).

## Nález 11: llms.txt a sitemap

1. `sitemap.xml`: výpisy `/cs/blog`, `/en/blog`, `/cs/case-studies` a `/en/case-studies` mají `lastmod`. Hodnota je nejnovější `updatedAt` článku nebo studie v daném jazyce (`latestUpdate`).
2. `llms.txt`: nová sekce „O firmě / About“ (datum vzniku, kancelář z nastavení webu, mateřská firma KOALA42, velikost týmu, GitHub, dokumentace). Sekce „Případy užití“ a „Blog“ začínají odkazy na výpisy v obou jazycích.
3. `/llms-full.txt` nevzniklo. Audit ho jen zmiňuje, návrh opravy ho nežádá.

## Nález 12: ikony a og:image

1. `/apple-touch-icon.png` a `/apple-touch-icon-precomposed.png` vrací 200 (přepis na `src/app/apple-icon.png`, 180 × 180 px).
2. `logo.svg`, `logo-white.svg`, `logo.png`, `favicon.ico`, `icon.svg` a obě ikony Apple mají `Cache-Control: public, max-age=86400, stale-while-revalidate=604800` místo `max-age=0`.
3. Dva velké PNG náhledy (`tablet-line-2-1200x630.png` 1,8 MB a `annotate-ui-2-1200x630.png` 1,1 MB) jsou obsah. Je potřeba nahrát obrázky znovu jako JPEG v administraci. Změna velikosti `og` v kolekci Media na JPEG by u průhledných PNG (loga členství) dala černé pozadí. To jsem ověřil se `sharp`.

## Nález 13: nadpisy, 404, kontrast

Hotovo:

1. Nadpisy bez přeskočené úrovně na `/cs`, `/en`, blogu, případových studiích, kontaktu a ceníku v obou jazycích. Vzhled zůstává, třídy drží původní velikost.
   - Výpis blogu: karty článků `h2` (dříve `h4`). `PostCard` má volbu `headingLevel`, jinde zůstává `h4`.
   - Výpis studií: karty `h2` (dříve `h3`). `CaseStudyCard` má volbu `headingLevel`.
   - Kontaktní formulář: nadpis `h2` (dříve `h3`).
   - Ceník: názvy tarifů `h2`, když blok nemá vlastní nadpis, jinak `h3`.
   - FeatureGrid a ProcessSteps: názvy položek `h3` (dříve `h5`). FeatureGrid bez nadpisu sekce dává `h2`.
2. Kontrast: `--color-text-38` (38 % černé, 2,7:1) je teď `--color-text-55` (55 % černé, 4,7:1 na bílé, nad WCAG AA 4,5:1). Všech 14 použití má nový název.

Nehotovo:

1. Prázdné HTML na 404. Next.js 16 pošle při `notFound()` na stránce s ISR dokument `<html id="__next_error__">` a stránku 404 vykreslí až skript v prohlížeči. Text hlášky je v datech RSC, ale ne v HTML. Kód 404 a `noindex` jsou správné. Oprava v aplikaci by znamenala `force-dynamic` pro všechny stránky obsahu, tedy ztrátu mezipaměti. To je horší než nález s nízkým dopadem. Je to chování frameworku.
2. Popis článku `automated-product-tagging` (168 znaků) je obsah v administraci.

## Doplněk: klíč v Payloadu

Větev `fix/40-indexnow-payload`. Do Coolify nemáme přístup, proto je klíč v nastavení webu.

1. Pole `verification.indexNowKey` v globálu `site-settings`. Text bez lokalizace. Validace: prázdné, nebo 8 až 128 znaků a-z, A-Z, 0-9, pomlčka.
2. Jedna funkce `indexNowKey(stored, env)` vybere klíč z pole, při prázdném poli z `INDEXNOW_KEY`. `readIndexNowKey(payload)` ho čte z databáze.
3. `/indexnow-key.txt` má `force-dynamic` a čte globál při každém požadavku. Změna klíče v administraci platí hned, bez nového nasazení. Odpověď má `Cache-Control: no-store`.
4. Hook čte klíč (`loadIndexNowConfig`) jen v produkci na veřejné adrese. Jinde databázi nečte. Chyba čtení nastavení uložení nezastaví.
5. Migrace `20261112_194530_indexnow_key` přidá sloupec `site_settings.verification_index_now_key`. Produkce ji spustí při nasazení: `Dockerfile` volá `pnpm payload migrate` před `pnpm build`.
6. Testy: `pnpm test:int` 36 souborů, 343 testů prošlo (`seoAudit40.int.spec.ts` čte a mění pole v místní databázi). `tsc`, `pnpm lint` (0 chyb) a `pnpm build` prošly. Na místní instanci: prázdné pole 404, vyplněné pole vrací klíč, změna přes REST API platí hned, neplatný klíč vrací 400.

## Co musí udělat člověk

1. Coolify, přesměrování 301: kroky v kapitole „Nález 7“.
2. Klíč IndexNow v administraci (krok v Coolify pro `INDEXNOW_KEY` odpadá):
   1. Vytvořit klíč: `openssl rand -hex 16`.
   2. Vložit ho do Site settings → Verification → IndexNow key a uložit.
   3. Ověřit: `curl -s https://robopipe.io/indexnow-key.txt` vrátí klíč.
3. Bing Webmaster Tools: jednorázově odeslat 14 nových adres (`SubmitUrlBatch`), nebo je v administraci jednou znovu zveřejnit. Hook pak odešle i do Seznamu.
4. Administrace (mimo tuto úlohu): dva PNG náhledy jako JPEG do 200 KB, popis článku `automated-product-tagging` pod 160 znaků, lokalizované názvy členství.

## Jak ověřit

Po nasazení:

```
curl -sI https://robopipe.io/cs/blog | grep -i cache-control         # s-maxage=600, ne no-store
curl -sI "https://robopipe.io/cs/blog?page=2" | grep -iE "^HTTP|location"  # 301 na /cs/blog/page/2 (při méně než 25 článcích pak 404)
curl -s https://robopipe.io/cs/blog | grep -c od-snimku-k-inferenci  # 1 a víc: 11. článek je na první stránce
curl -sI https://robopipe.io/apple-touch-icon.png | head -1           # 200
curl -s https://robopipe.io/llms.txt | sed -n '/O firmě/,/^$/p'
```

JSON-LD: Rich Results Test pro `/cs`, `/cs/cenik`, `/cs/kamerova-kontrola-kvality` a jednu případovou studii. Typy `Product`, `Service`, `Article`, logo `logo.png`.

## Testy

| Sada | Výsledek |
|---|---|
| `tsc --noEmit` | bez chyb |
| `pnpm lint` | 0 chyb, 2 varování (už na `master`: `postcss.config.mjs`, `admin.e2e.spec.ts`) |
| `pnpm build` | prošlo |
| `pnpm test:int` | 36 souborů, 333 testů prošlo (na `master` 306). Nové: `tests/int/seoAudit40.int.spec.ts` (27 testů) |
| `pnpm test:e2e` proti `next start` | 189 prošlo, 4 selhaly kvůli místním datům (níže) |

Nové e2e testy: `tests/e2e/seoAudit40.e2e.spec.ts` (hlavičky blogu, 24 článků na první stránce a zbytek na `/blog/page/2` s vlastní kanonickou adresou, 301 ze `?page=2`, JSON-LD, ikony, úrovně nadpisů na 10 stránkách).

Upravené testy:

- `blogFeaturedCard.e2e.spec.ts`: výpis je teď v mezipaměti. Test mění článek přes REST API běžícího serveru (`tests/helpers/serverRevalidate.ts`), aby hook serveru obnovil stránky. Změna přes Local API z procesu testu mezipaměť serveru neobnoví.
- `seo-stage2.e2e.spec.ts` AC 7: názvy tarifů jsou `h2` na ceníku a `h3` pod nadpisem sekce.
- `jsonLd.int.spec.ts` a `llmsTxt.int.spec.ts`: `availability` v nabídce a odkazy na výpisy.

Čtyři selhání e2e nezpůsobila tato změna:

1. Tři testy plakátu v `mobileSpeed.e2e.spec.ts`: blok Hero na úvodní stránce v místní databázi nemá obrázek (`image_id` je prázdné).
2. `seo-stage2` „every internal link“: stránka `/cs/kamerova-kontrola-kvality` odkazuje na článek `co-je-vizualni-system-…`, který místní kopie databáze nemá.

Místní prostředí: databáze `robopipe_40` (kopie `robopipe_37b`), port 3940. Pro test stránkování jsem do `robopipe_40` přidal 22 českých kopií článku (`test-40-clanek-*`). Soubory médií jsem zkopíroval z jiných místních kopií do `media/` (je v `.gitignore`).
