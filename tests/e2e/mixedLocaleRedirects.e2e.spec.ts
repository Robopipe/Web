import { expect, test } from '@playwright/test'

/**
 * Issue #53: the 17 URLs from Seznam Webmaster have a locale prefix with the slug
 * of the other locale. Each one answers a permanent redirect to the slug of the
 * prefix locale, and that page answers 200. Needs the production content (the
 * pages and blog posts named below).
 */
const MIXED: [from: string, to: string][] = [
  ['/cs/blog/automated-product-tagging', '/cs/blog/automaticke-tagovani-produktu'],
  ['/cs/blog/capture-to-inference', '/cs/blog/od-snimku-k-inferenci'],
  ['/cs/blog/cut-reject-rates', '/cs/blog/snizte-zmetkovitost'],
  ['/cs/contact', '/cs/kontakt'],
  ['/cs/industries', '/cs/obory'],
  ['/cs/pricing', '/cs/cenik'],
  ['/cs/privacy-policy', '/cs/ochrana-osobnich-udaju'],
  ['/en/blog/automaticke-tagovani-produktu', '/en/blog/automated-product-tagging'],
  [
    '/en/blog/co-je-vizualni-system-srozumitelny-pruvodce-strojovym-videnim-ve-vyrobe',
    '/en/blog/what-is-a-vision-system-a-plain-english-guide-to-machine-vision-in-manufacturing',
  ],
  ['/en/blog/od-snimku-k-inferenci', '/en/blog/capture-to-inference'],
  ['/en/blog/snizte-zmetkovitost', '/en/blog/cut-reject-rates'],
  [
    '/en/blog/trendy-v-kontrole-kvality-2026-co-se-na-vyrobnich-linkach-skutecne-meni',
    '/en/blog/quality-control-trends-in-2026-what-s-actually-changing-on-the-factory-floor',
  ],
  ['/en/blog/zive-skore-kvality', '/en/blog/live-quality-score'],
  ['/en/cenik', '/en/pricing'],
  ['/en/kontakt', '/en/contact'],
  ['/en/obory', '/en/industries'],
  ['/en/ochrana-osobnich-udaju', '/en/privacy-policy'],
]

test.describe('Issue #53: a slug of the other locale redirects to the localized page', () => {
  for (const [from, to] of MIXED) {
    test(`${from} → ${to}`, async ({ request }) => {
      const response = await request.get(from, { maxRedirects: 0 })
      expect([301, 308]).toContain(response.status())
      // On a cache miss Next.js 16 sends the same Location header twice
      // (vercel/next.js#82117), so check every value, not the joined string.
      const locations = (await response.headersArray())
        .filter(({ name }) => name.toLowerCase() === 'location')
        .map(({ value }) => new URL(value, 'http://localhost').pathname)
      expect(locations.length).toBeGreaterThan(0)
      expect(new Set(locations)).toEqual(new Set([to]))

      const target = await request.get(to, { maxRedirects: 0 })
      expect(target.status()).toBe(200)
    })
  }

  for (const path of ['/cs/neexistujici-stranka-53', '/en/blog/no-such-post-53']) {
    test(`${path} stays 404`, async ({ request }) => {
      const response = await request.get(path, { maxRedirects: 0 })
      expect(response.status()).toBe(404)
    })
  }
})
