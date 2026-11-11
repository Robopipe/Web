# robopipe.io — website

Sales-oriented marketing site for [Robopipe](https://robopipe.io) (industrial machine vision by KOALA42).

**Stack:** Next.js 16 (App Router) + Payload CMS 3 embedded in one app · PostgreSQL · Tailwind v4 · next-intl (cs/en) · Resend · Google Cloud Storage media. Deployed to Coolify as a Docker image.

## Local development

```bash
docker compose up -d        # Postgres 17 on :5432
cp .env.example .env        # defaults work out of the box
pnpm install
pnpm payload migrate        # apply DB migrations
pnpm seed                   # demo content in cs+en, admin user
pnpm dev
```

- Site: http://localhost:3000 (`/` redirects to the stored language choice, else by browser language, see below)
- Admin: http://localhost:3000/admin — seeded login `admin@robopipe.io` / `admin`

Optional env: `RESEND_API_KEY` (lead notification emails; logged to console when unset), `GCS_BUCKET` + `GCS_CREDENTIALS` (media storage; local `./media` when unset).

## Architecture notes

- **Localization** — content is field-localized in Payload (`cs` default, `en`), URLs are prefixed (`/cs/*`, `/en/*`), and **slugs are localized** (`/cs/cenik` ↔ `/en/pricing`). Section segments (`/blog`, `/case-studies`) are constant. hreflang alternates are emitted per document; the language switcher reads them from the head to land on the translated slug.
- **Blog visibility** — posts/case studies appear only in locales where they have a slug (queries run with `fallbackLocale: false`); marketing pages are expected to be fully translated.
- **Pages** are block-based (`src/blocks/*`): hero, feature grid, content, media, stats, logo cloud, testimonials, use-case cards, pricing table, FAQ accordion, case-study grid, blog teaser, CTA banner, contact form.
- **Leads** — the contact form posts a server action (`src/actions/submitLead.ts`): zod validation, honeypot + per-IP rate limit, stored in the `leads` collection (public REST create is closed), notification via Resend to `site-settings.leadNotificationEmail`.
- **Revalidation** — any published change triggers coarse site-wide ISR revalidation (`src/hooks/revalidate.ts`); pages also refresh every 10 min.
- **Root language** — `/` goes to the language stored in the `NEXT_LOCALE` cookie. Only an explicit choice writes it (footer switcher, locale suggestion). Without it, `Accept-Language` decides: `cs` and `sk` go to `/cs`, everything else to `/en` (`src/proxy.ts`). next-intl itself does not read or write the cookie (`localeCookie: false`).
- **SEO and GEO** (issue #2, `docs/specs/2-seo-geo/`) — `buildMeta()` (`src/lib/meta.ts`) gives every page a self canonical, hreflang with `x-default` (the English URL) and Open Graph. JSON-LD comes from one module (`src/lib/jsonLd.ts`): Organization and WebSite on every page, Product (offers read from the pricing table in Payload) on the home page, BlogPosting, FAQPage from the visible FAQs, BreadcrumbList. The sitemap and `/llms.txt` read one list of indexable documents (`src/lib/indexable.ts`). Plus robots, per-locale RSS (`/{locale}/blog/rss.xml`), the 301 map from the old Webflow and Shopify URLs in `next.config.ts` and an editor-managed `redirects` collection.
- **Use cases** — case studies are shown as "Případy užití" / "Use cases" at the same URLs: listing `/{locale}/case-studies`, detail `/{locale}/case-studies/{slug}` with problem, solution, result, technique and FAQ sections (fields on the collection, empty sections are skipped).
- **Memberships** — `site-settings.memberships` (e.g. Česká inovační platforma) feeds the footer, logo bands with `source: memberships` and `Organization.memberOf`.
- **Draft preview** — Payload live-preview + `/next/preview?secret=…` (draft mode), exit via `/next/exit-preview`.

## Schema changes

Dev uses migrations too — after changing collections run:

```bash
pnpm payload migrate:create <name>
pnpm payload migrate
pnpm generate:types
```

Commit the generated migration and `src/payload-types.ts`.

## Tests

```bash
pnpm test:int                                   # vitest, writes to the local DATABASE_URL
E2E_BASE_URL=http://localhost:3310 pnpm test:e2e  # playwright against a running, seeded server
```

Integration tests stop when `DATABASE_URL` is not localhost (`vitest.setup.ts`). `E2E_BASE_URL` defaults to `http://localhost:3000`. `PLAYWRIGHT_CHROMIUM_PATH` points Playwright at another Chromium binary if the downloaded one does not start.

## Cookie policy script

`pnpm seed:cookie-policy` puts the cookie paragraph (issue #21) on the published privacy page in an existing database, cs and en. It replaces the old "Analytics" paragraph and the sentence that names Vercel. The texts are in `src/seed/cookiePolicy.ts`, and `pnpm seed` uses the same texts. The script is idempotent and publishes the page. It takes `--dry-run`, `--production` and `--remote=<URL>` like `seed:seo-geo`. It exits with code 2 when it cannot find a paragraph to replace, so you edit that part in the admin.

```sh
SEED_REMOTE_EMAIL=… SEED_REMOTE_PASSWORD=… pnpm seed:cookie-policy --remote=https://robopipe.io --dry-run
```

## SEO and GEO content script

The landing, task and about pages, the case study sections, FAQs, home page blocks, navigation, memberships, solutions, company facts, pricing FAQs, the vision guide changes and the auto annotation blog draft live as files in `seed-assets/copy/seo-geo/`. `pnpm seed` applies them to a fresh local database. `pnpm seed:seo-geo` applies them to an existing one:

```bash
pnpm seed:seo-geo --dry-run             # list planned changes only
pnpm seed:seo-geo                       # drafts only, published content and globals unchanged
pnpm seed:seo-geo --status=published    # publish pages, case studies, posts and globals
```

The script is idempotent: it finds existing documents and never overwrites a field that has a value. The blog post always stays a draft. It refuses a `DATABASE_URL` outside localhost unless you pass `--production`. Production steps are in `docs/specs/2-seo-geo/implementation.md` and `docs/specs/6-seo-geo-stage2/implementation.md`.

| File | Content |
|---|---|
| `landing-pages.json`, `landing-<key>.cs.md`, `landing-<key>.md` | Solution, task and about pages. An existing page gets only the blocks it does not have yet (by block `id`). `obsolete` lists stage 1 slugs the script reports but never deletes. `cardImage` sets `seo.image` (the home page card and the share preview) only while it is empty. |
| `faqs.json` | All FAQs. Every key is used by a page, a case study or the pricing page. |
| `settings.json` | `site-settings.solutions` (page keys in display order) and `site-settings.company`. Written only while empty. |
| `existing-pages.json` | Additions to existing content: pricing FAQs, and the first H2, `seo.title` and one paragraph of the vision guide (changed only from the exact current value). |
| `home.json`, `navigation.json` | Home page blocks, header label, footer about link, the stage 1 footer column to remove. `removeBlocks` lists home blocks (by `blockName`) the script removes on every run, also after a restore from the version history. `featureLinks` adds a link at the end of a `featureGrid` card text, only in a locale where the link label is empty. When the card has a label in another locale, the script keeps its target page and writes only the label. A link label left empty in English hides the link on `/en` (no Czech fallback). The script sets the home page order (hero, customer logos, feature grid, process steps, industries, testimonial, solutions, memberships, blog and FAQ, CTA) only from a known state: production after #6, after #9 round 1, or either without the memberships strip. Any other order was changed in the admin and stays. A missing memberships strip then goes after the first `testimonialBar`. |

**Copy markers.** A document whose text still contains `[doplnit Filip]` or `[ověřit]` is never published. It stays a draft and the report says `draft (markers): <document>`.

**Through the REST API.** `--remote=<URL>` runs the same script against a running site through the Payload REST API, without database access. The account comes from `SEED_REMOTE_EMAIL` and `SEED_REMOTE_PASSWORD` (an editor role is enough). `--dry-run` is read-only: the client refuses every write before it is sent. An HTTP error stops the run with the method, path, status and error text.

```bash
SEED_REMOTE_EMAIL=… SEED_REMOTE_PASSWORD=… pnpm seed:seo-geo --remote=http://localhost:3000 --dry-run
```

## Search engine verification

The Bing (`msvalidate.01`) and Seznam (`seznam-wmt`) verification tags come from **Site settings → Verification**. An empty value renders no tag. A change through the admin or `POST /api/globals/site-settings` (Payload uses POST for globals) shows on every page without a deploy. The content script never writes these values.

## AI-generated blog posts

Editors queue article ideas in **Blog → Blog topics** (short description + optional per-article instructions). A nightly Coolify scheduled task (03:00 UTC) hits `/api/cron/run-jobs` (authorized via `CRON_SECRET`), which runs the `generate-blog-post` workflow (`src/jobs/`):

1. Claude (`claude-fable-5`, web search enabled, server-side refusal fallback to Opus 4.8) writes the English article as structured JSON, picking a category.
2. A second call adapts it into Czech (not a literal translation).
3. A hero photo is fetched from Pexels and uploaded to Media with localized alt text.
4. A bilingual **draft** post is assembled (markdown → Lexical via `convertMarkdownToLexical`); the topic's target date prefills `publishedAt`; a "draft ready" email goes out via Resend.

Publishing is always manual — review the draft and hit Publish. Regenerate by setting the topic's status back to *Queued* (content is overwritten; old text stays in version history), or skip the nightly wait entirely with the **Generate now** button in the topic sidebar (`POST /api/blog-topics/:id/generate` — responds immediately and runs the job via `after()`; the button polls until the draft is ready). The base writing prompt lives in the **Blog AI** global, editable without a deploy. Steps are resumable inline tasks, so a failed/timed-out run resumes where it stopped on the next cron hit.

Required env vars: `ANTHROPIC_API_KEY` (the Anthropic org must allow ≥30-day data retention — Fable requirement), `PEXELS_API_KEY`, `CRON_SECRET`. To run the queue locally: create a topic, then `curl -H "Authorization: Bearer $CRON_SECRET" "http://localhost:3000/api/payload-jobs/run?limit=10"`.

## Deployment (Coolify)

The app ships as a Docker image (`Dockerfile`, Next.js `standalone` output) deployed with Coolify's **Dockerfile** build pack. The build runs `pnpm payload migrate && pnpm build` against the production database, so each deployment migrates the DB before `next build` prerenders against it.

1. **Database** — a PostgreSQL resource from Coolify's template on the same server/destination as the app. Use its **internal** URL for `DATABASE_URL`: Coolify builds with `--add-host` entries for the destination network's containers, so the internal hostname also resolves during the image build.
2. **Media** — a Google Cloud Storage bucket with public read (`allUsers` → *Storage Object Viewer*) and a service account with *Storage Object Admin* on it. Media URLs point straight at `https://storage.googleapis.com/<bucket>/…`.
3. **Application** — new resource → Git repository → build pack *Dockerfile*, port `3000`, domains `https://robopipe.io` and `https://shop.robopipe.io` (the old Shopify host is redirected by `next.config.ts`). Under *Advanced → Build*, prefer **Build secrets → Docker BuildKit secrets** so build-time values don't end up in image metadata; the Dockerfile accepts both secrets and plain build args.
4. **Environment variables**

   | Variable | Build | Runtime | Notes |
   |---|---|---|---|
   | `DATABASE_URL` | ✓ | ✓ | internal URL of the Postgres resource |
   | `NEXT_PUBLIC_SERVER_URL` | ✓ | ✓ | `https://robopipe.io`, inlined into the client bundle |
   | `GCS_BUCKET` | ✓ | ✓ | media URLs are baked into prerendered pages |
   | `PAYLOAD_SECRET` | | ✓ | the build uses a placeholder when it's not available |
   | `GCS_CREDENTIALS` | | ✓ | service-account key JSON, on one line |
   | `PREVIEW_SECRET`, `CRON_SECRET`, `RESEND_API_KEY`, `ANTHROPIC_API_KEY`, `PEXELS_API_KEY` | | ✓ | |

   Changing a build-time value needs a redeploy; runtime-only values just a restart.
5. **Scheduled task** (nightly blog generation) — on the application, *Scheduled Tasks* → add: frequency `0 3 * * *`, timeout `900` s (one article takes ~3–5 min), command:

   ```sh
   wget -qO- --header="Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/run-jobs
   ```

- **Build memory** — `pnpm build` raises the Node heap to 8 GB; the Coolify server needs that much free RAM during builds (or lower `--max-old-space-size` in `package.json`).
- **Single instance** — the lead/newsletter rate limits are in-memory and ISR caches on the container filesystem; run one replica.
- **Analytics** — Google Analytics 4 and the Google Ads tag with a cookie banner (consent mode v2). The IDs are in the admin, *Site Settings → Measurement*, not in env vars. Empty fields = no Google tag, no banner. Fill them only after the privacy page describes the cookies (`pnpm seed:cookie-policy`, see below).
- **Geo** — the locale-suggestion feature reads Vercel's `x-vercel-ip-country` header in `src/proxy.ts`, so it stays dormant on Coolify unless that header is provided (e.g. mapped from Cloudflare's `cf-ipcountry`).
- **Seeding prod** (one-time): run `pnpm seed` locally with the production `DATABASE_URL` (expose the Postgres resource publicly for the duration) and the GCS variables exported, then redeploy so prerendered pages pick up the content.
