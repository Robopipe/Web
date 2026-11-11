# Architektura: místní verze webu s komentáři (issue #8)

Vstup: `product.md` (schválil Filip 11. 11. 2026). Tento dokument rozhoduje všechny otevřené body. Vývojář podle něj staví bez dalších rozhodnutí.

## 1. Zjištění (11. 11. 2026)

- Mac mini má 8 GB paměti. Postgres 17 z Homebrew běží trvale (`sh.brew.postgresql@17`, `127.0.0.1:5432`). Docker běží v Colima a hostí cizí projekty. Port 3000 je obsazený.
- `next build` zvedá haldu na 8 GB (`package.json`) a trvá minuty. Sestavená verze proto lhůtu 60 sekund nesplní a na tomto stroji hrozí nedostatek paměti.
- Produkční databáze ani Coolify nejsou z Mac mini dostupné. Jediná cesta k produkčnímu obsahu je REST API Payload.
- Veřejné čtení bez přihlášení vrátí vše, co web zobrazuje: `pages`, `posts`, `case-studies` (jen publikované), `media`, `faqs`, `testimonials`, `categories`, `authors`, `redirects`, globály `header`, `footer`, `site-settings`. Ověřeno: 49 médií, 12 stránek, 11 článků, 4 studie, 45 FAQ, 2 reference, 3 kategorie, 2 autoři, 1 přesměrování.
- Média leží ve veřejném bucketu GCS (`https://storage.googleapis.com/robopipe-payload-media/…`, velikosti `thumbnail`, `card`, `hero`, `og`).
- `src/seed/remoteClient.ts` už umí REST klienta s režimem jen pro čtení (`readOnly`) a nahrání souboru přes `FormData`. `assertLocalDatabase` (`src/lib/dbGuard.ts`) brání zápisu do vzdálené databáze.
- Payload 3.86 podporuje `allowIDOnCreate` v `postgresAdapter`. Kopie tak zachová ID dokumentů.
- `layout` stránek není lokalizovaný. Lokalizovaná jsou pole uvnitř bloků. Bloky a řádky polí mají stabilní `id`.
- Repo nemá `.github/workflows`. `.dockerignore` vynechává `seed-assets`, `tests`, `.claude`.

### Měření buzení agenta (11. 11. 2026, naprázdno, bez změny configu)

| Cesta | Čas |
|---|---|
| `claude -p` (Claude Code, Sonnet 5.5), odpověď „OK“ | 3,0 s a 2,8 s |
| `claude -p` (výchozí model), odpověď „OK“ | 2,5 s |
| `claude -p` ve worktree webu: najdi zdroj nadpisu hero na české úvodní stránce (jen čtení) | 9,8 s, správná odpověď |
| `openclaw agent` s vlastním klíčem session, odpověď „OK“ | 10,2 s celkem, z toho 5,7 s tah |
| hlavní session (`main_wake.py`) | neomezeně: tah čeká, dokud neskončí běžící tah hlavní session |

Testovací session `agent:main:rc8-latency-test` je smazaná.

## 2. Hlavní rozhodnutí

1. **Vrstva komentářů je samostatný program `robopipe-comments`** v `~/Projects/robopipe-comments` (vlastní git repo, soukromé GitHub repo `ahmmmh/robopipe-comments`). Je to reverzní proxy před vývojovým serverem webu. Do každé HTML stránky vloží jeden skript. Repo webu o ní neví.
2. **Arthura budí pracovník uvnitř vrstvy: `claude -p` spuštěný ve worktree místního webu**, ne hlavní session. Hlavní session je jedna a příchozí zprávy čekají na její tah, takže 60 sekund nezaručí. `openclaw agent` s vlastní session stojí 10 s navíc a nese všechny nástroje hlavního agenta. `claude -p` startuje za 3 s a dovolí přesný seznam povolených příkazů. Odhad malé úpravy: start 3 s, práce agenta 10 až 25 s, zápis obsahu 3 s, načtení stránky 3 s. Celkem 20 až 40 s.
3. **Režim webu: vývojový server** (`next dev`, Turbopack) na `127.0.0.1:3810`. Úprava kódu je vidět za 1 až 3 s. Sestavení by trvalo minuty a potřebuje víc paměti, než stroj má.
4. **Kopie obsahu: nový skript webu `pnpm pull:prod`** čte produkci anonymně přes REST (jen čtení) a zapíše data do prázdné místní databáze se stejnými ID. Média stáhne z veřejného bucketu a uloží lokálně. Místní web nemá žádný produkční přístupový údaj.
5. **Změny obsahu dělá Arthur jen souborem změn** v `seed-assets/content-changes/`. Stejný skript `pnpm content:apply` zapíše soubor nejdřív do místního webu, po pokynu „nasaď“ do produkce. Každá změna nese starou hodnotu. Skript zapíše jen tam, kde produkce má pořád starou hodnotu. Jinak hlásí konflikt a nic nepřepíše. To je stejné pravidlo, jaké už používá `existing-pages.json` ve skriptu SEO a GEO.
6. **Místní administrace je pro zápis zavřená.** Proxy odmítne každý zápis do `/api/*` a `/admin*` z místní sítě. Jediný zdroj změn obsahu jsou soubory změn.
7. **Kontrolu kritéria 9 dělá skript v repu webu a GitHub Action** na každém PR do `master`.

## 3. Rozpory s product.md a návrh

### 3.1 Kritérium 4 proti kritériu 13

Komentáře se zpracují po jednom a v pořadí (kritérium 13). Když Arthur pracuje na větší úpravě, nový komentář čeká ve frontě a lhůtu 10 s nesplní. Rozhodnutí: pořadí má přednost. Komentář má hned stav „čeká“ a pořadí ve frontě. Kritéria 4 a 5 se měří při prázdné frontě. Paralelní zpracování by dvě úpravy pustilo do jednoho worktree a do jedné větve. To nejde bezpečně.

### 3.2 „Texty a obrázky z administrace“ (rozhodnutí 3 a kritérium 8)

Arthur obsah mění souborem změn přes REST API místního webu, ne klikáním v administraci. Výsledek je stejný: zapisuje se jen místní databáze. Ruční změna v místní administraci by na produkci nedošla, protože ji žádný seznam nezná. Proto proxy zápis z administrace blokuje (rozhodnutí 6). Filip může administraci jen číst.

### 3.3 „Arthur“ ve vrstvě komentářů

Komentáře zpracuje samostatný proces Claude Code s pravidly Arthura (šablona promptu ve vrstvě). Hlavní session o komentářích ví přes příkaz `comments summary`. Tím ji vyvolá Arthur při pokynu „nasaď“. Hlavní session se kvůli komentářům nebudí.

## 4. Ověření hotových nástrojů

| Nástroj | Proč nevyhovuje |
|---|---|
| Agentation (`benjitaylor/agentation`) | React komponenta v kódu aplikace (kritérium 9). Jen počítač, mobil nepodporuje (kritérium 14). Licence PolyForm Shield. |
| React Grab | Komponenta v aplikaci, výsledek jde jen do schránky. Žádné stavy ani vlákno. |
| Stagewise | Samostatné IDE s vlastním náhledem. Filip ho nemá na mobilu a neběží v prohlížeči přes VPN. |
| AgentEcho | Rozšíření Chrome. Mobil ho nespustí. Jen export do Markdownu, žádné stavy. |
| Vercel Toolbar, Liveblocks, Marker.io, BugHerd | Placená nebo cizí služba, data odchází mimo stroj, žádné napojení na agenta na Mac mini. |

Žádný nástroj nesplní zároveň kritéria 6, 9, 12 a 14. Vrstvu proto stavíme vlastní a malou. Z hotových částí použije `http-proxy-3` (proxy včetně WebSocketu pro HMR), `@medv/finder` (selektor prvku, MIT) a vestavěný `node:sqlite` (Node 26, bez závislosti).

## 5. Rozložení na stroji

| Část | Umístění | Adresa | Služba |
|---|---|---|---|
| Vrstva komentářů (proxy, API, fronta, pracovník) | `~/Projects/robopipe-comments` | `0.0.0.0:3800`, jen soukromé adresy | LaunchAgent `io.robopipe.comments` |
| Místní web (`next dev`) | worktree `~/Projects/robopipe-web-local`, větev `local/comments` | `127.0.0.1:3810` | LaunchAgent `io.robopipe.local-web` |
| Databáze webu | Postgres z Homebrew, databáze `robopipe_local`, role `robopipe_local` | `127.0.0.1:5432` | existující `sh.brew.postgresql@17` |
| Média webu | `~/Projects/robopipe-web-local/media` (v `.gitignore`) | | |
| Data vrstvy | `~/.local/robopipe-comments/comments.db`, `logs/`, `runs/` | | |

Filip otevírá `http://192.168.1.62:3800`. Web na `3810` poslouchá jen na `127.0.0.1`, takže jediný vstup z místní sítě je proxy.

`.env` místního webu:

```
DATABASE_URL=postgres://robopipe_local:<místní heslo>@127.0.0.1:5432/robopipe_local
PAYLOAD_SECRET=<náhodný, jen místní>
NEXT_PUBLIC_SERVER_URL=http://192.168.1.62:3800
PREVIEW_SECRET=<náhodný, jen místní>
```

Bez `GCS_BUCKET`, `GCS_CREDENTIALS`, `RESEND_API_KEY`, `ANTHROPIC_API_KEY`, `PEXELS_API_KEY`, `CRON_SECRET`. Payload pak ukládá média do `./media` a e-maily jen zapisuje do logu.

## 6. Změny v repu webu (jdou do `master`)

Nic z toho není vrstva komentářů. Jsou to obecné nástroje pro obsah.

| Soubor | Změna |
|---|---|
| `src/payload.config.ts` | `postgresAdapter({ allowIDOnCreate: process.env.PAYLOAD_ALLOW_ID_ON_CREATE === '1', … })`. Produkce proměnnou nemá, chování se nemění. |
| `src/seed/remoteClient.ts` | `email` a `password` volitelné. Bez nich se klient nepřihlásí a povolí jen `readOnly: true`. Jinak chyba. |
| `src/seed/pullProduction.ts` (nový) | Kopie produkce do prázdné místní databáze (kapitola 8). |
| `src/seed/contentChanges.ts` (nový) | Čtení souboru změn, hledání cíle, pravidla zápisu. Čisté funkce plus volání přes `SeoGeoClient`. |
| `src/seed/applyContentChanges.ts` (nový) | CLI, vzor `applySeoGeo.ts`. Argumenty `--remote=<URL>` (povinný), `--dry-run`, `--file=<cesta>`. Parser podle `seoGeoArgs.ts` (neznámý argument zastaví běh). Přihlášení z `SEED_REMOTE_EMAIL` a `SEED_REMOTE_PASSWORD`. |
| `seed-assets/content-changes/README.md` (nový) | Formát souboru změn (kapitola 9). |
| `package.json` | Skripty `pull:prod` a `content:apply` (tsx, vzor `seed:seo-geo`). Žádná nová závislost. |
| `scripts/check-no-comment-layer.sh` (nový) | Kontrola kritéria 9 (kapitola 12). |
| `.github/workflows/no-comment-layer.yml` (nový) | Spustí kontrolu na každém PR do `master`. |
| `tests/int/contentChanges.int.spec.ts` (nový) | Testy pravidel zápisu a hledání cesty. |
| `README.md` | Sekce „Local copy and content changes“. |

## 7. Vrstva komentářů (`~/Projects/robopipe-comments`)

```
package.json            závislosti: http-proxy-3, @medv/finder. Node 26, ESM, bez sestavení.
src/server.mjs          HTTP server: proxy, vložení skriptu, API, SSE
src/db.mjs              SQLite schéma a dotazy (node:sqlite)
src/queue.mjs           fronta běhů, vždy jeden běh
src/worker.mjs          spuštění claude -p, časový limit, kontrola commitů
src/proxyRules.mjs      blokace zápisu, přepis hlaviček, vložení skriptu
public/overlay.js       překryvná vrstva v prohlížeči (vanilla JS, Shadow DOM)
public/list.html        seznam všech komentářů
prompts/worker.md       pravidla pro pracovníka
bin/comments.mjs        CLI pro pracovníka a hlavní session
bin/refresh-local.sh    obnova místní kopie po nasazení
deploy/*.plist.template LaunchAgenty, deploy/install.sh (vzor st.duck)
test/                   node:test
```

### 7.1 Proxy

1. Přijme spojení jen ze soukromých adres (`127.0.0.0/8`, `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `::1`, `fc00::/7`). Jinak vrátí 403.
2. Cesty `/__comments/*` obslouží sama. Vše ostatní předá na `127.0.0.1:3810` včetně upgrade na WebSocket (`/_next/webpack-hmr`).
3. Zápis (`POST`, `PUT`, `PATCH`, `DELETE`) na `/api/*` a `/admin*` z jiné adresy než loopback vrátí 403 s textem „Místní administrace je jen pro čtení“. Server actions na stránkách (kontaktní formulář) projdou.
4. U požadavků na `/_next/*` a u upgrade přepíše `Origin` na `http://localhost:3810` a `Sec-Fetch-Site` na `same-origin`. Next 16 jinak blokuje vývojové zdroje z cizího původu. Když log `next dev` přesto hlásí „Blocked cross-origin request“, přidej do `next.config.ts` řádek `allowedDevOrigins: process.env.DEV_ALLOWED_ORIGINS?.split(',') ?? []` a do `.env` místního webu `DEV_ALLOWED_ORIGINS=192.168.1.62`. Na produkci je seznam prázdný.
5. U HTML odpovědí (`content-type: text/html`, metoda `GET`, cesta mimo `/admin`, `/api`, `/_next`, `/next`) pošle na web `Accept-Encoding: identity`, odpověď načte celou, vloží `<script src="/__comments/overlay.js" defer></script>` před první `</head>` a odstraní `content-length`. Vložení do `<head>` neruší hydrataci Reactu 19.
6. Když web neodpovídá (spouští se), vrátí 503 s malou stránkou „Web se spouští“, která se za 5 s načte znovu.

### 7.2 Datový model (SQLite, `comments.db`)

```sql
CREATE TABLE comments (
  id            INTEGER PRIMARY KEY,
  created_at    TEXT NOT NULL,          -- ISO 8601 UTC
  updated_at    TEXT NOT NULL,
  path          TEXT NOT NULL,          -- /cs/cenik, bez query a hash
  locale        TEXT NOT NULL,          -- cs | en (první segment cesty)
  selector      TEXT NOT NULL,          -- @medv/finder, max 1000 znaků
  element_tag   TEXT NOT NULL,          -- h1, img, a ...
  element_text  TEXT NOT NULL,          -- innerText nebo alt/src, max 500
  context_text  TEXT NOT NULL,          -- text nejbližší sekce, max 2000
  heading       TEXT,                   -- nejbližší nadpis nad prvkem
  viewport_w    INTEGER NOT NULL,
  status        TEXT NOT NULL,          -- queued | working | long | done | failed
  status_note   TEXT,                   -- důvod u failed, popis u long
  deployed_at   TEXT                    -- vyplní „nasaď“
);
CREATE TABLE messages (
  id          INTEGER PRIMARY KEY,
  comment_id  INTEGER NOT NULL REFERENCES comments(id),
  author      TEXT NOT NULL,            -- filip | arthur
  body        TEXT NOT NULL,            -- max 4000
  created_at  TEXT NOT NULL
);
CREATE TABLE runs (
  id              INTEGER PRIMARY KEY,
  comment_id      INTEGER NOT NULL REFERENCES comments(id),
  message_id      INTEGER NOT NULL REFERENCES messages(id),  -- zpráva, která běh spustila
  status          TEXT NOT NULL,        -- queued | working | long | done | failed
  note            TEXT,
  queued_at       TEXT NOT NULL,
  started_at      TEXT,
  finished_at     TEXT,
  agent_session   TEXT,                 -- session_id z claude --output-format json
  commits         TEXT NOT NULL DEFAULT '[]',   -- JSON pole SHA
  content_files   TEXT NOT NULL DEFAULT '[]',   -- JSON pole cest
  exit_code       INTEGER,
  log_path        TEXT
);
CREATE INDEX runs_queue ON runs(status, id);
```

Stav komentáře je vždy stav jeho posledního běhu. Zapisuje ho jen `queue.mjs` v jedné transakci s během. Stavy pro Filipa: `queued` = čeká, `working` = pracuji, `long` = pracuji (delší úprava), `done` = hotovo, `failed` = nejde.

### 7.3 API

Veřejné (místní síť):

| Metoda a cesta | Vstup | Výstup |
|---|---|---|
| `GET /__comments/overlay.js` | | skript vrstvy |
| `GET /__comments/` | | seznam všech komentářů (kritérium 12) |
| `GET /__comments/api/comments?path=` | `path` volitelný | `200 [{comment, messages[], queuePosition, startedAt}]` |
| `POST /__comments/api/comments` | `{path, selector, elementTag, elementText, contextText, heading, viewportW, body}` | `201 {comment}`. Uloží komentář, první zprávu a běh. |
| `POST /__comments/api/comments/:id/messages` | `{body}` | `201 {message}`. Uloží odpověď a nový běh. |
| `GET /__comments/api/events` | | SSE. Událost `comment` s celým komentářem po každé změně. `ping` každých 20 s. |

Chyby: `400 {error}` při chybějícím nebo dlouhém poli, `404` u neznámého komentáře. `locale` server odvodí z `path`.

Interní (jen loopback, pro `bin/comments.mjs`):

| Metoda a cesta | Účel |
|---|---|
| `POST /__comments/internal/runs/:runId/reply {body}` | Arthur odpoví u komentáře |
| `POST /__comments/internal/runs/:runId/long {note}` | stav „pracuji (delší úprava)“ |
| `POST /__comments/internal/runs/:runId/finish {status: done\|failed, note}` | konec běhu |
| `GET /__comments/internal/summary?undeployed=1` | hotové a nenasazené komentáře, commity, soubory změn |
| `POST /__comments/internal/deployed {ids}` | zapíše `deployed_at` |
| `POST /__comments/internal/pause`, `/resume` | zastaví a pustí frontu (obnova kopie) |
| `GET /__comments/internal/stats?last=5` | doby od odeslání do konce běhu (měření kritéria 5) |

CLI `bin/comments.mjs`: `reply`, `long`, `finish`, `apply-content <soubor>`, `content-find <text>`, `summary`, `deployed`, `pause`, `resume`, `stats`. `runId` bere z proměnné `COMMENTS_RUN_ID`, kterou nastaví pracovník.

- `apply-content <soubor>` spustí v worktree místního webu `node_modules/.bin/tsx src/seed/applyContentChanges.ts --remote=http://127.0.0.1:3810 --file=<soubor>` s místním účtem `admin@robopipe.io` z `~/.config/robopipe-comments/local.env`. Adresa je pevná. Produkci tímto příkazem zapsat nejde.
- `content-find <text>` hledá text v `pg_dump --data-only robopipe_local` a vypíše tabulku a řádek. Agent tak najde dokument a blok.

### 7.4 Překryvná vrstva (`public/overlay.js`)

1. Vloží jeden prvek `<div id="rp-comments-root">` do `document.documentElement` (mimo React strom) se Shadow DOM. Styly webu ji neovlivní.
2. Tlačítko „Komentáře“ vpravo dole zapne režim komentářů. V režimu: obrys pod kurzorem, první klik nebo ťuknutí vybere prvek a zruší výchozí akci (odkaz nenaviguje).
3. Formulář: na počítači u prvku, na šířce do 600 bodů jako spodní panel. Odeslání pošle zachycená data z kapitoly 7.3.
4. Připnutí: špendlík s číslem a barvou stavu u prvku. Prvek najde podle `selector`. Když selektor nic nenajde, hledá prvek se stejným `element_text`. Když ani to, ukáže komentář v seznamu „Bez prvku na stránce“.
5. Vlákno: klik na špendlík ukáže zprávy, stav, důvod a pole pro odpověď.
6. U stavu `working` starší než 60 s ukáže „pracuji déle než minutu“ (kritérium 5).
7. SSE: aktualizuje špendlíky. Když komentář aktuální cesty přejde do `done`, uloží `scrollY` do `sessionStorage` a načte stránku znovu. Po načtení pozici obnoví.
8. Odkaz „Všechny komentáře“ otevře `/__comments/`.

### 7.5 Fronta a pracovník

1. Nový běh dostane stav `queued`. Když nic neběží, `queue.mjs` ho hned spustí. Vždy běží nejvýš jeden běh, v pořadí podle `runs.id`.
2. Před startem pracovník ověří čistý worktree (`git status --porcelain` prázdný) a větev `local/comments`. Jinak běh skončí `failed` s důvodem „Místní kopie má neuložené změny“.
3. Spustí ve worktree místního webu:

   ```
   claude -p <prompt> --output-format json --model claude-sonnet-5-5
     --permission-mode acceptEdits
     --allowedTools Read Edit Write Grep Glob
       "Bash(git status:*)" "Bash(git diff:*)" "Bash(git log:*)" "Bash(git add:*)"
       "Bash(git commit:*)" "Bash(git revert:*)" "Bash(git restore:*)"
       "Bash(node_modules/.bin/vitest:*)" "Bash(node_modules/.bin/tsc:*)"
       "Bash(node_modules/.bin/eslint:*)" "Bash(node_modules/.bin/payload:*)"
       "Bash(/Users/m1/Projects/robopipe-comments/bin/comments.mjs:*)"
     [--resume <agent_session posledního běhu komentáře>]
   ```

   Prostředí: `COMMENTS_RUN_ID`, `PATH` s `/opt/homebrew/bin`. Bez `git push`, bez `security`, bez síťových příkazů.
4. Prompt sestaví z `prompts/worker.md` a dat komentáře: text zprávy, celé vlákno, `path`, `locale`, `selector`, `element_tag`, `element_text`, `context_text`, `heading`, `viewport_w` (kritérium 3).
5. Pravidla v `prompts/worker.md`:
   - Malá úprava: proveď, commitni, `comments finish --status done`.
   - Větší úprava (nová sekce, nový blok, změna schématu): nejdřív `comments reply` s odhadem a `comments long`. Pak úprava s testem.
   - Obsah z Payload (texty, obrázky, FAQ, navigace): jen soubor změn v `seed-assets/content-changes/`, pak `comments apply-content`. Nikdy přímý zápis do databáze.
   - Kód: úprava souborů, při změně schématu `payload migrate:create` a `payload migrate`.
   - Každý commit má zprávu `<typ>: <shrnutí> (comment #<id>)` a trailer `Comment: #<id>` (kritérium 7). Soubor změn je ve stejném commitu.
   - Nesouhlas Filipa ve vlákně: uprav nebo `git revert` dřívějšího commitu. U obsahu nový soubor změn, který vrací hodnotu.
   - Nejde to: `comments finish --status failed --note "<důvod pro Filipa>"`.
   - Odpovědi Filipovi česky, krátce, bez zkratek.
6. Po skončení procesu pracovník:
   - uloží `session_id` z JSON výstupu do `runs.agent_session`,
   - zapíše nové commity (`git rev-list <HEAD před>..HEAD`) a soubory změn,
   - ověří trailer `Comment: #<id>` u každého nového commitu. Když chybí, připíše poznámku do `runs.note`,
   - když agent nezavolal `finish`, nastaví `failed` s důvodem „Arthur skončil bez výsledku“,
   - když zůstal neuložený stav, nastaví `failed` a worktree nechá beze změny pro hlavní session.
7. Časové limity: běh se stavem `working` 5 minut, se stavem `long` 30 minut. Po limitu pracovník ukončí proces (SIGTERM, po 10 s SIGKILL, jen podle PID) a nastaví `failed` „Překročen čas“.
8. Při startu vrstvy každý běh ve stavu `working` nebo `long` přejde na `failed` „Přerušeno restartem, odpověz u komentáře a zkusím to znovu“. Automatické opakování by mohlo udělat úpravu dvakrát.

## 8. Kopie produkčního obsahu (`pnpm pull:prod`)

Příkaz: `PAYLOAD_ALLOW_ID_ON_CREATE=1 pnpm pull:prod --from=https://robopipe.io`.

1. `assertLocalDatabase(DATABASE_URL)` bez možnosti `--production`.
2. Zastaví se, když místní `pages` nebo `media` nejsou prázdné. Prázdnou databázi připraví `bin/refresh-local.sh`.
3. REST klient bez přihlášení, `readOnly: true`.
4. Pořadí: `media`, `categories`, `authors`, `faqs`, `testimonials`, `case-studies`, `posts`, `pages`, `redirects`, pak globály `header`, `footer`, `site-settings`.
5. Každý dokument načte dvakrát: `?locale=cs&fallback-locale=none&depth=0` a totéž pro `en`. `limit=100` se stránkováním.
6. Vytvoření: `payload.create` s daty `cs`, se stejným `id`, `locale: 'cs'`, `context: { skipRevalidate: true }`, `draft: false`. Potom `payload.update` s daty `en` a `locale: 'en'`.
7. Média: stáhne `url` (originál) do dočasného adresáře a vytvoří dokument s `filePath`. Velikosti vytvoří `sharp` lokálně.
8. Stránky odkazují na stránky (`linkField`). První průchod u `pages` nahradí každý objekt `{type: 'internal', page}` za `{type: 'external', url: '#pull-pending'}`. Druhý průchod po vytvoření všech stránek zapíše původní data obou jazyků.
9. Na konci nastaví sekvence ID na `max(id)` ve všech tabulkách kolekcí (`SELECT setval(pg_get_serial_sequence(...), max(id))`).
10. Uživatele, leady, odběratele, `blog-topics` a `blog-ai` nekopíruje. Místního správce `admin@robopipe.io` vytvoří `bin/refresh-local.sh`.

Koncepty z produkce se nekopírují, protože anonymní čtení je nevidí. Místní web ukazuje stav jako produkce pro návštěvníka (scénář 1).

## 9. Soubor změn obsahu

Umístění: `seed-assets/content-changes/NNNN-c<commentId>.json`, `NNNN` je pořadí (0001, 0002 …). Obrázky v `seed-assets/content-changes/media/`.

```json
{
  "comment": 12,
  "changes": [
    { "op": "set", "collection": "pages", "slug": "home", "locale": "cs",
      "path": "layout.<blockId>.heading", "from": "Starý nadpis", "to": "Nový nadpis" },
    { "op": "set", "global": "header", "locale": "en",
      "path": "navItems.<rowId>.link.label", "from": "Pricing", "to": "Prices" },
    { "op": "upload", "ref": "hero-linka", "file": "media/hero-linka.jpg",
      "alt": { "cs": "Kamera nad linkou", "en": "Camera above the line" } },
    { "op": "set", "collection": "pages", "slug": "home", "locale": "cs",
      "path": "layout.<blockId>.image", "from": 45, "to": { "$media": "hero-linka" } },
    { "op": "insert", "collection": "pages", "slug": "cenik", "locale": "cs",
      "path": "layout", "after": "<blockId>", "value": { "id": "<nové id>", "blockType": "cta", "...": "..." } },
    { "op": "remove", "collection": "pages", "slug": "cenik", "locale": "cs",
      "path": "layout.<blockId>", "from": { "...": "celý blok" } }
  ]
}
```

Pravidla v `src/seed/contentChanges.ts`:

1. Dokument najde podle `slug` v daném `locale` (`where[slug][equals]`). Globál podle `global`.
2. `path`: segmenty oddělené tečkou. Segment v poli nebo blocích je `id` řádku, ne index.
3. Načte dokument `?locale=<l>&depth=0&draft=false` a hodnotu porovná hloubkově:
   - aktuální = `from`: zapíše `to`,
   - aktuální = `to`: přeskočí (už zapsáno),
   - jinak: konflikt, nezapíše nic z celého souboru a vypíše cestu, `from`, aktuální hodnotu a `to`.
4. `insert`: přeskočí, když řádek se stejným `id` existuje. `remove`: smaže, jen když aktuální řádek = `from`.
5. `upload`: najde médium se stejným `filename`. Když není, nahraje ho přes `create` s `FormData`. `{ "$media": ref }` nahradí výsledným ID.
6. Zápis: `PATCH` celého pole nejvyšší úrovně (například `layout`) s `?locale=<l>` a `_status: 'published'`. Změny téhož dokumentu v jednom souboru spojí do jednoho zápisu.
7. Konflikt konceptu: když `?draft=true` vrátí novější `updatedAt` než publikovaná verze, skript dokument nezapíše a hlásí „rozpracovaný koncept v produkci“. Jinak by publikoval cizí rozpracovanou práci.
8. Bez `--file` zpracuje všechny soubory podle názvu. Je to idempotentní, opakovaný běh nic nezmění.
9. Výstup jako `seed:seo-geo`: seznamy `applied`, `skipped`, `conflict` po souborech.

## 10. Tok dat od kliknutí po načtení stránky

1. Filip zapne režim, klikne na nadpis, napíše „zkrať“, odešle.
2. `overlay.js` pošle `POST /__comments/api/comments`.
3. Server uloží komentář, zprávu a běh (`queued`) a pošle SSE `comment`. Špendlík ukáže „čeká“.
4. Fronta spustí pracovníka, stav `working`, SSE. Čas od odeslání: pod 1 s, při prázdné frontě.
5. `claude -p` startuje (3 s) a čte prompt s textem, adresou, prvkem a okolím.
6. Agent zjistí zdroj textu (`content-find` nebo kód). Pro obsah zapíše soubor změn a spustí `comments apply-content`. Skript zapíše přes REST do místního webu na `127.0.0.1:3810`. Payload spustí háček revalidace.
7. Agent commitne s `Comment: #12` a zavolá `comments finish --status done`.
8. Server zapíše stav, SSE `comment` se stavem `done`.
9. `overlay.js` uloží pozici a načte stránku. Proxy vloží skript znovu. Špendlík je u nadpisu se stavem „hotovo“.

## 11. Nasazení na pokyn „nasaď“ (hlavní session)

Postup patří do `~/Projects/robopipe-comments/README.md` a odkaz na něj do `playbooks/robopipe-comments.md` ve workspace.

1. Spusť `comments summary --undeployed`. Pošli Filipovi seznam úprav: komentář, výsledek, commity, soubory změn.
2. Po souhlasu spusť `comments pause`.
3. Pushni `local/comments` a otevři PR do `master`. Počkej na zelenou kontrolu `no-comment-layer`.
4. Sluč PR. Počkej, až Coolify nasadí (změna kódu je vidět na robopipe.io).
5. Z čisté kopie `master` spusť `pnpm content:apply --remote=https://robopipe.io --dry-run`. Účet `arthur@robopipe.io`, heslo z Keychainu `robopipe-payload-password`, jen v prostředí tohoto příkazu.
6. Když výstup hlásí konflikt, pošli ho Filipovi a počkej na rozhodnutí. Konflikt nikdy nepřepisuj.
7. Spusť stejný příkaz bez `--dry-run`.
8. Spusť `comments deployed` s ID nasazených komentářů.
9. Spusť `bin/refresh-local.sh`. Skript zastaví místní web, nastaví `local/comments` na `origin/master`, smaže a vytvoří `robopipe_local`, spustí migrace, `pull:prod`, vytvoří místního správce, spustí web a zavolá `comments resume`.

Pořadí kód před obsahem platí vždy. Nový blok nebo pole musí v produkci existovat dřív, než do nich skript zapíše.

## 12. Kontrola kritéria 9

`scripts/check-no-comment-layer.sh` v repu webu skončí chybou, když:

1. `git grep -nE "__comments|robopipe-comments|rp-comments"` najde shodu mimo `docs/specs/8-local-comments/`, tento skript a jeho workflow,
2. `package.json` obsahuje `http-proxy-3` nebo `@medv/finder`.

`.github/workflows/no-comment-layer.yml` ho spustí na `pull_request` do `master` (Ubuntu, jen checkout a skript, pod 20 s). Krok 3 v kapitole 11 skript spustí i lokálně, když Actions nejsou dostupné.

Každý soubor vrstvy má v hlavičce `robopipe-comments`. Obraz Dockerfile staví jen z repa webu, takže kontrola repa pokrývá i obraz.

## 13. Bezpečnost a kritéria 2, 10, 11

- Mac mini je za NAT routeru bez přesměrování portů. Proxy přijme jen soukromé adresy. `next dev` poslouchá jen na `127.0.0.1`.
- `.env` místního webu nemá žádný produkční údaj. `pull:prod` čte anonymně.
- Pracovník nemá `git push`, `security`, `curl` ani přímé `tsx`. Obsah zapíše jen přes `comments apply-content` s pevnou místní adresou.
- Produkční zápis dělá jen hlavní session v kapitole 11 po pokynu „nasaď“.

## 14. Okrajové případy

| Případ | Chování |
|---|---|
| Dva komentáře rychle po sobě | Dva běhy ve frontě, druhý ukáže „čeká, pořadí 2“. |
| Odpověď u komentáře během běhu | Nový běh za aktuálním, s `--resume` session komentáře. |
| Prvek po úpravě zmizel nebo změnil text | Selektor obvykle platí. Jinak hledání podle textu, jinak „Bez prvku na stránce“. |
| Komentář na stránce, kterou úprava přejmenovala (slug) | Komentář zůstane u staré cesty a je v seznamu `/__comments/`. |
| Web se restartuje nebo kompiluje | Proxy vrátí stránku „Web se spouští“ a zkusí to za 5 s. SSE se po výpadku připojí znovu. |
| Konflikt v souboru změn lokálně | `apply-content` skončí chybou s popisem. Agent opraví `from` nebo komentář ukončí jako `failed`. |
| Agent změní nesouvisející soubor | Commit je ve vlákně a v `summary`. Filip ho vidí před „nasaď“. |
| Mobil (390 bodů) | Ťuknutí vybere prvek, formulář jako spodní panel, špendlíky 28 bodů. |
| Hlavní session potřebuje worktree | Nejdřív `comments pause`, po práci commit a `comments resume`. |
| Velká úprava blokuje frontu | Limit 30 minut. Filip vidí pořadí ve frontě. |
| Odkaz na `/admin` | Bez vložené vrstvy. Zápis blokuje proxy. |

## 15. Rizika

| Riziko | Opatření |
|---|---|
| Paměť: `next dev` s Payload zabere 1,5 až 2,5 GB a za dny roste | `NODE_OPTIONS=--max-old-space-size=2048`. LaunchAgent `KeepAlive` spustí server znovu. |
| První načtení trasy v `next dev` trvá 5 až 20 s | Po startu vrstva jednou načte `/cs`, `/en` a trasy ze sitemap (zahřátí). |
| Next blokuje vývojové zdroje z jiného původu | Přepis hlaviček v proxy, záloha `allowedDevOrigins` (7.1 bod 4). |
| Chování vývojového serveru se liší od produkce (cache, ISR) | Tester ověří výsledek na produkci po „nasaď“. |
| `pull:prod` selže na háčku kolekce (slug, validace) | Test na prázdné databázi v kroku 3 plánu. Háček, který mění data, vypni přes `context` stejně jako `skipRevalidate`. |
| Adresa 192.168.1.62 se změní (DHCP) | Rezervace adresy v routeru (otázka pro Filipa). |
| Agent udělá chybnou úpravu | Vše je commit na vedlejší větvi a soubor změn. Filip ji vrátí odpovědí u komentáře. |
| Výdaj za model | `claude -p` jede na předplatném Claude Code tohoto stroje. Žádný nový API klíč. |

## 16. Co se nemění

- `Dockerfile`, `docker-compose.yml`, nasazení v Coolify, produkční proměnné.
- Kolekce, globály, bloky, migrace a kód stránek webu.
- `src/hooks/revalidate.ts`, `src/proxy.ts`, `next.config.ts` (kromě záložního řádku v 7.1 bod 4, jen když je potřeba).
- Skript `seed:seo-geo` a jeho chování.
- Config OpenClaw a hlavní session.

## 17. Plán pro vývojáře

Každý krok končí commitem. Kroky 1 až 5 jsou v repu webu na `feat/8-local-comments`. Kroky 6 až 12 v `~/Projects/robopipe-comments`.

1. `remoteClient.ts`: volitelné přihlášení pro `readOnly`. Test: anonymní `find` funguje, zápis vyhodí chybu.
2. `payload.config.ts`: `allowIDOnCreate` podle `PAYLOAD_ALLOW_ID_ON_CREATE`.
3. `pullProduction.ts` a skript `pull:prod`. Ověř na prázdné testovací databázi `robopipe_pulltest`: počty dokumentů jako v kapitole 1, stejná ID, obrázky se zobrazí, odkazy mezi stránkami vedou správně. Databázi pak smaž.
4. `contentChanges.ts`, `applyContentChanges.ts`, skript `content:apply`, `seed-assets/content-changes/README.md`. Testy: `set` (shoda, už zapsáno, konflikt), `insert`, `remove`, `upload` podle `filename`, konflikt konceptu, `--dry-run` nic nezapíše, konflikt v souboru nezapíše nic z něj.
5. `scripts/check-no-comment-layer.sh`, workflow, sekce README. Otevři PR do `master` jen s kroky 1 až 5 a s dokumenty. Tyto nástroje musí být v `master` před vznikem `local/comments`.
6. Repo `robopipe-comments`: `package.json`, `db.mjs` se schématem, testy `node:test`.
7. `server.mjs` a `proxyRules.mjs`: proxy, HMR přes WebSocket, filtr adres, blokace zápisu, vložení skriptu, stránka 503. Test proti malému testovacímu serveru.
8. API a SSE podle 7.3. Testy: validace, pořadí ve frontě, SSE událost po změně.
9. `queue.mjs`, `worker.mjs`, `prompts/worker.md`, `bin/comments.mjs`. Test s náhradou `claude` (skript, který volá `comments finish`).
10. `overlay.js` a `list.html`. Ověř v Chrome na šířce 1440 a 390.
11. `deploy/`: šablony LaunchAgentů `io.robopipe.local-web` a `io.robopipe.comments` (vzor `~/Projects/st.duck/be/deploy/`), `install.sh`, `bin/refresh-local.sh`. První instalace: worktree `~/Projects/robopipe-web-local` na `local/comments` z `origin/master`, `npx -y pnpm@10.24.0 install --frozen-lockfile`, databáze `robopipe_local`, `.env` z kapitoly 5, `refresh-local.sh`.
12. Ověření na stroji: restart Mac mini a web znovu běží (kritérium 1). Pět malých komentářů, `comments stats --last=5` ukáže časy pod 60 s (kritérium 5). Dva komentáře za sebou (13). `refresh-local.sh` po zkušebním „nasaď“ nanečisto (`content:apply --dry-run` proti produkci).
13. Do workspace přidej `playbooks/robopipe-comments.md` s postupem z kapitoly 11.

Testovací servery zastavuj podle PID, nikdy `pkill` podle vzoru.
