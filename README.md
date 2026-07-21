# robopipe.io — website

Sales-oriented marketing site for [Robopipe](https://robopipe.io) (industrial machine vision by KOALA42).

**Stack:** Next.js 16 (App Router) + Payload CMS 3 embedded in one app · PostgreSQL · Tailwind v4 · next-intl (cs/en) · Resend · GCS media · Plausible. Deployed to GCP Cloud Run via Cloud Build.

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

Optional env: `RESEND_API_KEY` (lead notification emails; logged to console when unset), `GCS_BUCKET`/`GCS_PROJECT_ID` (media storage; local `./media` when unset), `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` (analytics; disabled when unset).

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

## Deployment (GCP)

`cloudbuild.yaml` builds the image (with an ephemeral Postgres so `next build` can prerender), pushes to Artifact Registry, runs migrations against Cloud SQL through the Cloud SQL Auth Proxy, and deploys to Cloud Run.

Two Cloud Build triggers on the GitHub repo share the file with different substitutions:

| Trigger | Branch | Service | `_ENV` |
| --- | --- | --- | --- |
| staging | `dev` | `robopipe-web-staging` | `staging` |
| prod | `main` | `robopipe-web-prod` | `prod` |

One-time setup per environment: Cloud SQL instance + database, GCS media bucket, Secret Manager secrets (`robopipe-database-url-<env>` using the `/cloudsql/...` unix-socket host, `robopipe-database-url-migrate-<env>` using host `sqlproxy`, `robopipe-payload-secret-<env>`, `robopipe-preview-secret-<env>`, shared `robopipe-resend-api-key`), an Artifact Registry repo `robopipe`, and trigger substitutions for `_SERVER_URL`, `_GCS_BUCKET`, `_CLOUDSQL_INSTANCE`, `_PLAUSIBLE_DOMAIN`.
