# robopipe.io — website

Sales-oriented marketing site for [Robopipe](https://robopipe.io) (industrial machine vision by KOALA42).

**Stack:** Next.js 16 (App Router) + Payload CMS 3 embedded in one app · PostgreSQL (Neon) · Tailwind v4 · next-intl (cs/en) · Resend · Vercel Blob media · Plausible. Deployed to Vercel.

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

Optional env: `RESEND_API_KEY` (lead notification emails; logged to console when unset), `BLOB_READ_WRITE_TOKEN` (media storage; local `./media` when unset), `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` (analytics; disabled when unset).

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

Editors queue article ideas in **Blog → Blog topics** (short description + optional per-article instructions). A nightly Vercel Cron (03:00 UTC, `vercel.json`) hits Payload's jobs endpoint (`/api/payload-jobs/run`, authorized via `CRON_SECRET`), which runs the `generate-blog-post` workflow (`src/jobs/`):

1. Claude (`claude-fable-5`, web search enabled, server-side refusal fallback to Opus 4.8) writes the English article as structured JSON, picking a category.
2. A second call adapts it into Czech (not a literal translation).
3. A hero photo is fetched from Pexels and uploaded to Media with localized alt text.
4. A bilingual **draft** post is assembled (markdown → Lexical via `convertMarkdownToLexical`); the topic's target date prefills `publishedAt`; a "draft ready" email goes out via Resend.

Publishing is always manual — review the draft and hit Publish. Regenerate by setting the topic's status back to *Queued* (content is overwritten; old text stays in version history), or skip the nightly wait entirely with the **Generate now** button in the topic sidebar (`POST /api/blog-topics/:id/generate` — responds immediately and runs the job via `after()`; the button polls until the draft is ready). The base writing prompt lives in the **Blog AI** global, editable without a deploy. Steps are resumable inline tasks, so a failed/timed-out run resumes where it stopped on the next cron hit.

Required env vars: `ANTHROPIC_API_KEY` (the Anthropic org must allow ≥30-day data retention — Fable requirement), `PEXELS_API_KEY`, `CRON_SECRET`. To run the queue locally: create a topic, then `curl -H "Authorization: Bearer $CRON_SECRET" "http://localhost:3000/api/payload-jobs/run?limit=10"`.

## Deployment (Vercel)

The Vercel project deploys `master` to production; every other branch/PR gets a preview deployment. The build command (`vercel.json`) is `pnpm payload migrate && pnpm build`, so each deployment migrates its own database before `next build` prerenders against it.

- **Database** — Neon via the Vercel Marketplace integration, which injects `DATABASE_URL` (pooled; `DATABASE_URL_UNPOOLED` also available as a fallback for migrations). Preview branching is enabled: each preview deployment gets its own Neon branch forked from production, so PR migrations never touch prod data.
- **Media** — a single Vercel Blob store with **public** access connected to all environments (injects `BLOB_READ_WRITE_TOKEN`; the Payload adapter doesn't support private stores). One shared store is required because Neon preview branches reference blob keys uploaded in production. `addRandomSuffix` must stay off (it breaks imageSizes URLs), so treat preview admin as read-mostly — uploads there share the namespace with prod.
- **Manual env vars** — `PAYLOAD_SECRET` and `PREVIEW_SECRET` (distinct values per environment), `RESEND_API_KEY` (production only), `NEXT_PUBLIC_SERVER_URL=https://robopipe.io` and `NEXT_PUBLIC_PLAUSIBLE_DOMAIN=robopipe.io` (production only — previews fall back to their Vercel branch URL).
- **Geo** — the locale-suggestion feature reads Vercel's `x-vercel-ip-country` header in `src/proxy.ts`; it is dormant in local dev where the header is absent.
- **Seeding prod** (one-time): pull production env vars locally (`vercel env pull`), then run `pnpm seed` with them exported, and redeploy so prerendered pages pick up the content.
