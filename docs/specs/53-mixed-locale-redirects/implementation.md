# #53 Mixed-locale URLs: implementation

## Solution

A URL with a locale prefix and the slug of the other locale (`/en/cenik`, `/cs/blog/cut-reject-rates`) now answers 308 to the slug of the prefix locale. The rule is general. It covers pages, blog posts and case studies, also future ones. No list of URLs is in the code.

- `getTranslatedSlug(collection, slug, locale)` in `src/lib/queries.ts` finds the published document with `slug` in the other locale. It gives its slug in `locale`, or null.
- `redirectTranslatedSlug()` in `src/lib/redirects.ts` calls `permanentRedirect()` (308) when there is a slug. Otherwise it returns.
- The three detail routes (`[slug]`, `blog/[slug]`, `case-studies/[slug]`) call it only when no document matches. The `redirects` collection and the 404 then follow as before.

Rules: drafts are not found (`overrideAccess: false`). A document without a slug in the prefix locale stays 404. A correct URL does not run the extra query.

## Tests

- `tests/int/translatedSlug.int.spec.ts`: both directions, unknown slug, collections apart, draft, no slug in the prefix locale (5 tests).
- `tests/e2e/mixedLocaleRedirects.e2e.spec.ts`: the 17 URLs (308, `location`, target 200) and two unknown slugs (404). It needs the production content.

## Local check

Build on port 3953, DB `robopipe_53` (copy of `robopipe_local`, migrated). Command: `curl -s -o /dev/null -w "%{http_code} %{redirect_url}"`. The last column is the code of the target.

| URL | Code | Target | Target code |
|---|---|---|---|
| /cs/blog/automated-product-tagging | 308 | /cs/blog/automaticke-tagovani-produktu | 200 |
| /cs/blog/capture-to-inference | 308 | /cs/blog/od-snimku-k-inferenci | 200 |
| /cs/blog/cut-reject-rates | 308 | /cs/blog/snizte-zmetkovitost | 200 |
| /cs/contact | 308 | /cs/kontakt | 200 |
| /cs/industries | 308 | /cs/obory | 200 |
| /cs/pricing | 308 | /cs/cenik | 200 |
| /cs/privacy-policy | 308 | /cs/ochrana-osobnich-udaju | 200 |
| /en/blog/automaticke-tagovani-produktu | 308 | /en/blog/automated-product-tagging | 200 |
| /en/blog/co-je-vizualni-system-srozumitelny-pruvodce-strojovym-videnim-ve-vyrobe | 308 | /en/blog/what-is-a-vision-system-a-plain-english-guide-to-machine-vision-in-manufacturing | 200 |
| /en/blog/od-snimku-k-inferenci | 308 | /en/blog/capture-to-inference | 200 |
| /en/blog/snizte-zmetkovitost | 308 | /en/blog/cut-reject-rates | 200 |
| /en/blog/trendy-v-kontrole-kvality-2026-co-se-na-vyrobnich-linkach-skutecne-meni | 308 | /en/blog/quality-control-trends-in-2026-what-s-actually-changing-on-the-factory-floor | 200 |
| /en/blog/zive-skore-kvality | 308 | /en/blog/live-quality-score | 200 |
| /en/cenik | 308 | /en/pricing | 200 |
| /en/kontakt | 308 | /en/contact | 200 |
| /en/obory | 308 | /en/industries | 200 |
| /en/ochrana-osobnich-udaju | 308 | /en/privacy-policy | 200 |

Controls: `/cs/neexistujici-stranka-53` 404, `/en/blog/no-such-post-53` 404, `/en/pricing`, `/cs/kontakt` and `/cs/blog/snizte-zmetkovitost` 200.

## Limits

- The redirect drops the query string (for example `utm_*`). The `redirects` collection does the same.
- The pages use ISR (`revalidate = 600`). A cached redirect stays up to 10 minutes after a slug changes.
- On a cache miss, Next.js 16.2.6 sends the same `Location` header twice (vercel/next.js#82117). The existing redirects (`/en/home`, `redirects` collection) do the same. Browsers and curl follow it.
- Test runs on `robopipe_53`: 4 int tests (8 files) and 38 other e2e tests fail. They need seed media and content that this DB copy does not have. The int failures are the same on master code.
