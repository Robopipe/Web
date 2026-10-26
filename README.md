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

- Site: http://localhost:3000 (redirects to `/cs` or `/en` by browser language)
- Admin: http://localhost:3000/admin — seeded login `admin@robopipe.io` / `admin`

Optional env: `RESEND_API_KEY` (lead notification emails; logged to console when unset), `GCS_BUCKET` + `GCS_CREDENTIALS` (media storage; local `./media` when unset).

## Architecture notes

- **Localization** — content is field-localized in Payload (`cs` default, `en`), URLs are prefixed (`/cs/*`, `/en/*`), and **slugs are localized** (`/cs/cenik` ↔ `/en/pricing`). Section segments (`/blog`, `/case-studies`) are constant. hreflang alternates are emitted per document; the language switcher reads them from the head to land on the translated slug.
- **Blog visibility** — posts/case studies appear only in locales where they have a slug (queries run with `fallbackLocale: false`); marketing pages are expected to be fully translated.
- **Pages** are block-based (`src/blocks/*`): hero, feature grid, content, media, stats, logo cloud, testimonials, use-case cards, pricing table, FAQ accordion, case-study grid, blog teaser, CTA banner, contact form.
- **Leads** — the contact form posts a server action (`src/actions/submitLead.ts`): zod validation, honeypot + per-IP rate limit, stored in the `leads` collection (public REST create is closed), notification via Resend to `site-settings.leadNotificationEmail`.
- **Revalidation** — any published change triggers coarse site-wide ISR revalidation (`src/hooks/revalidate.ts`); pages also refresh every 10 min.
- **SEO** — localized sitemap with hreflang, robots, per-locale RSS (`/{locale}/blog/rss.xml`), Article JSON-LD, 301 map from the old Webflow URLs in `next.config.ts` plus an editor-managed `redirects` collection.
- **Draft preview** — Payload live-preview + `/next/preview?secret=…` (draft mode), exit via `/next/exit-preview`.

## Schema changes

Dev uses migrations too — after changing collections run:

```bash
pnpm payload migrate:create <name>
pnpm payload migrate
pnpm generate:types
```

Commit the generated migration and `src/payload-types.ts`.

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
- **Analytics** — `<Analytics />` / `<SpeedInsights />` in the frontend layout are Vercel-only and collect nothing on Coolify; replace them (e.g. self-hosted Plausible/Umami) or remove them.
- **Geo** — the locale-suggestion feature reads Vercel's `x-vercel-ip-country` header in `src/proxy.ts`, so it stays dormant on Coolify unless that header is provided (e.g. mapped from Cloudflare's `cf-ipcountry`).
- **Seeding prod** (one-time): run `pnpm seed` locally with the production `DATABASE_URL` (expose the Postgres resource publicly for the duration) and the GCS variables exported, then redeploy so prerendered pages pick up the content.
