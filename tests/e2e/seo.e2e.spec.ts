import {
  expect,
  request as playwrightRequest,
  test,
  type APIRequestContext,
} from '@playwright/test'
import { getPayload } from 'payload'

import config from '../../src/payload.config.js'

/**
 * Acceptance criteria of issue #2 (docs/specs/2-seo-geo). Needs a seeded
 * local database (pnpm seed) and a server at E2E_BASE_URL.
 *
 * The URL list is written out here on purpose, not read from the sitemap,
 * so a page missing from the sitemap fails the sitemap test.
 */

const baseURL = process.env.E2E_BASE_URL || `http://localhost:${process.env.PORT || '3000'}`
// Absolute URLs in canonical, hreflang, sitemap and llms.txt use the server URL.
const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL || baseURL

/** Pairs of [cs, en] paths from architecture.md, chapter 3. */
const LANDING_PAGES: [string, string][] = [
  ['/cs/kamerova-kontrola-kvality', '/en/camera-quality-inspection'],
  ['/cs/ai-kontrola-kvality', '/en/ai-quality-inspection'],
  ['/cs/pocitacove-videni', '/en/computer-vision'],
  ['/cs/strojove-videni', '/en/machine-vision'],
  ['/cs/automaticka-anotace', '/en/auto-annotation'],
]
const CASE_STUDIES: [string, string][] = [
  ['/cs/case-studies/crocodille-kvalita-na-lince', '/en/case-studies/crocodille-line-quality'],
  ['/cs/case-studies/wolfberry-pocitani-kapsli', '/en/case-studies/wolfberry-capsule-counting'],
  ['/cs/case-studies/ai-tagovani-produktu', '/en/case-studies/ai-product-tagging'],
  ['/cs/case-studies/mg-servis-kontrola-baleni', '/en/case-studies/mg-servis-packaging-checks'],
]
const NEW_PAIRS = [...LANDING_PAGES, ...CASE_STUDIES]
const NEW_URLS = NEW_PAIRS.flat()
const LISTINGS: [string, string] = ['/cs/case-studies', '/en/case-studies']
const BLOG_POST: [string, string] = ['/cs/blog/zive-skore-kvality', '/en/blog/live-quality-score']

/** Expected schema.org types per page kind (architecture.md, table 5.5). */
const SITE_TYPES = ['Organization', 'WebSite']
const EXPECTED_TYPES: [string[], string[]][] = [
  [
    ['/cs', '/en'],
    [...SITE_TYPES, 'Product', 'FAQPage'],
  ],
  [LANDING_PAGES.flat(), [...SITE_TYPES, 'BreadcrumbList', 'FAQPage']],
  [CASE_STUDIES.flat(), [...SITE_TYPES, 'BreadcrumbList', 'FAQPage']],
  [LISTINGS, [...SITE_TYPES, 'BreadcrumbList']],
  [BLOG_POST, [...SITE_TYPES, 'BreadcrumbList', 'BlogPosting']],
]

const abs = (path: string) => `${SERVER_URL}${path}`
const partnerOf = (path: string) => {
  const pair = [...NEW_PAIRS, LISTINGS, BLOG_POST, ['/cs', '/en']].find((p) => p.includes(path))!
  return { cs: pair[0], en: pair[1] }
}

/** A request context with no default Accept-Language, so each test sets its own. */
let api: APIRequestContext
test.beforeAll(async () => {
  api = await playwrightRequest.newContext({ baseURL })
})
test.afterAll(async () => {
  await api.dispose()
})

test.describe('root redirect: stored choice, then Accept-Language', () => {
  const rootTarget = async (headers: Record<string, string>, path = '/') => {
    const response = await api.get(path, { headers, maxRedirects: 0 })
    expect(response.status()).toBe(307)
    const location = new URL(response.headers().location, baseURL)
    return location.pathname + location.search
  }

  test('without a cookie: cs and sk go to /cs, de and no header go to /en', async () => {
    expect(await rootTarget({ 'Accept-Language': 'cs' })).toBe('/cs')
    expect(await rootTarget({ 'Accept-Language': 'sk' })).toBe('/cs')
    expect(await rootTarget({ 'Accept-Language': 'de' })).toBe('/en')
    expect(await rootTarget({ 'Accept-Language': '' })).toBe('/en')
  })

  test('a stored choice wins over Accept-Language, an invalid one is ignored', async () => {
    expect(await rootTarget({ 'Accept-Language': 'cs', Cookie: 'NEXT_LOCALE=en' })).toBe('/en')
    expect(await rootTarget({ 'Accept-Language': 'en', Cookie: 'NEXT_LOCALE=cs' })).toBe('/cs')
    expect(await rootTarget({ 'Accept-Language': 'cs', Cookie: 'NEXT_LOCALE=de' })).toBe('/cs')
  })

  test('the query string is kept', async () => {
    expect(await rootTarget({ 'Accept-Language': 'cs' }, '/?utm_source=x')).toBe('/cs?utm_source=x')
    expect(await rootTarget({ Cookie: 'NEXT_LOCALE=cs' }, '/?utm_source=x')).toBe(
      '/cs?utm_source=x',
    )
  })

  test('visiting /en does not store a choice', async () => {
    const response = await api.get('/en', { headers: { 'Accept-Language': 'cs' } })
    expect(response.status()).toBe(200)
    const cookies = response.headersArray().filter((h) => h.name.toLowerCase() === 'set-cookie')
    expect(cookies.map((c) => c.value).join('\n')).not.toContain('NEXT_LOCALE')
  })

  test('switching the language in the footer stores the choice for the root', async ({
    browser,
  }) => {
    const context = await browser.newContext({ locale: 'cs-CZ' })
    const page = await context.newPage()
    await page.goto('/')
    await expect(page).toHaveURL(/\/cs$/)
    await page.locator('footer nav a', { hasText: 'EN' }).click()
    await expect(page).toHaveURL(/\/en$/)
    await page.goto('/')
    await expect(page).toHaveURL(/\/en$/)
    await context.close()
  })
})

test.describe('metadata and structured data', () => {
  for (const path of [...NEW_URLS, ...LISTINGS, ...BLOG_POST, '/cs', '/en']) {
    test(`${path}: 200, title, description, canonical, hreflang, Open Graph, JSON-LD`, async ({
      page,
    }) => {
      const response = await page.goto(path)
      expect(response?.status()).toBe(200)
      await expect(page.locator('h1').first()).toBeVisible()

      expect((await page.title()).length).toBeGreaterThan(10)
      const description = await page.locator('meta[name="description"]').getAttribute('content')
      expect(description?.length).toBeGreaterThan(30)

      const canonicals = page.locator('link[rel="canonical"]')
      await expect(canonicals).toHaveCount(1)
      expect(await canonicals.getAttribute('href')).toBe(abs(path))

      const { cs, en } = partnerOf(path)
      const hreflang = async (lang: string) =>
        page.locator(`link[rel="alternate"][hreflang="${lang}"]`).getAttribute('href')
      expect(await hreflang('cs')).toBe(abs(cs))
      expect(await hreflang('en')).toBe(abs(en))
      expect(await hreflang('x-default')).toBe(abs(en))

      const ogImage = await page
        .locator('meta[property="og:image"]')
        .first()
        .getAttribute('content')
      expect(ogImage).toMatch(/^https?:\/\//)
      expect(ogImage).not.toMatch(/^https?:\/\/.*https?:\/?\//)
      expect(await page.locator('meta[property="og:url"]').getAttribute('content')).toBe(abs(path))

      const blocks = await page.locator('script[type="application/ld+json"]').allTextContents()
      const types = blocks.map((json) => (JSON.parse(json) as { '@type': string })['@type'])
      const expected = EXPECTED_TYPES.find(([paths]) => paths.includes(path))?.[1] ?? []
      for (const type of expected) expect(types).toContain(type)
    })
  }
})

test.describe('use cases', () => {
  test('the old listing URLs answer 200 and link to every detail page', async ({ page }) => {
    for (const [index, locale] of [
      [0, 'cs'],
      [1, 'en'],
    ] as const) {
      const response = await page.goto(LISTINGS[index])
      expect(response?.status(), locale).toBe(200)
      for (const pair of CASE_STUDIES) {
        await expect(page.locator(`main a[href="${pair[index]}"]`).first()).toBeVisible()
      }
    }
  })

  test('an unknown case study slug answers 404', async () => {
    const response = await api.get('/cs/case-studies/neexistuje', { maxRedirects: 0 })
    expect(response.status()).toBe(404)
  })

  test('a redirects entry sends an old case study URL to the new one', async () => {
    const payload = await getPayload({ config })
    const redirect = await payload.create({
      collection: 'redirects',
      data: { from: '/cs/case-studies/stara-studie', to: CASE_STUDIES[0][0], permanent: true },
    })
    try {
      const response = await api.get('/cs/case-studies/stara-studie', { maxRedirects: 0 })
      expect(response.status()).toBe(308)
      // Next.js sends the Location header twice on the first on-demand render
      // (the existing [slug] route does the same). Both copies are the same URL.
      const location = response.headers().location.split(',')[0].trim()
      expect(new URL(location, baseURL).pathname).toBe(CASE_STUDIES[0][0])
    } finally {
      await payload.delete({ collection: 'redirects', id: redirect.id })
    }
  })

  test('the old shop product URL goes to the tagging use case', async () => {
    const response = await api.get('/products/machine-vision-controller', {
      headers: { Host: 'shop.robopipe.io' },
      maxRedirects: 0,
    })
    expect(response.status()).toBe(308)
    expect(response.headers().location).toBe(
      'https://robopipe.io/en/case-studies/ai-product-tagging',
    )
  })
})

test('sitemap.xml lists every new URL with hreflang cs, en and x-default', async () => {
  const response = await api.get('/sitemap.xml')
  expect(response.status()).toBe(200)
  const xml = await response.text()
  const entries = [...xml.matchAll(/<url>([\s\S]*?)<\/url>/g)].map((m) => m[1])
  for (const [cs, en] of NEW_PAIRS) {
    for (const path of [cs, en]) {
      const entry = entries.find((e) => e.includes(`<loc>${abs(path)}</loc>`))
      expect(entry, path).toBeDefined()
      expect(entry).toContain(`hreflang="cs" href="${abs(cs)}"`)
      expect(entry).toContain(`hreflang="en" href="${abs(en)}"`)
      expect(entry).toContain(`hreflang="x-default" href="${abs(en)}"`)
    }
  }
  expect(xml).not.toContain(`<loc>${SERVER_URL}/</loc>`)
})

test('/llms.txt answers 200 as text and links the landing pages and use cases', async () => {
  const response = await api.get('/llms.txt')
  expect(response.status()).toBe(200)
  expect(response.headers()['content-type']).toContain('text/plain')
  const text = await response.text()
  expect(text.startsWith('# Robopipe')).toBe(true)
  for (const path of NEW_URLS) expect(text, path).toContain(`(${abs(path)})`)
})

test('the membership logo links to innovationczechia.cz on the home page and in the footer', async ({
  page,
}) => {
  for (const path of ['/cs', '/en']) {
    await page.goto(path)
    await expect(page.locator('main a[href="https://innovationczechia.cz"]'), path).toHaveCount(1)
    await expect(page.locator('footer a[href="https://innovationczechia.cz"]'), path).toHaveCount(1)
  }
})

test.describe('mobile layout', () => {
  test.use({ viewport: { width: 375, height: 812 } })

  test('no page from chapter 3 scrolls sideways at 375 px', async ({ page }) => {
    for (const path of ['/cs', '/en', ...NEW_URLS, ...LISTINGS]) {
      await page.goto(path)
      const { scrollWidth, innerWidth } = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        innerWidth: window.innerWidth,
      }))
      expect(scrollWidth, path).toBeLessThanOrEqual(innerWidth)
    }
  })
})

test('a path with a dot outside every route answers 404, /llms.txt still 200', async () => {
  expect((await api.get('/foo.txt')).status()).toBe(404)
  expect((await api.get('/ads.txt')).status()).toBe(404)
  expect((await api.get('/llms.txt')).status()).toBe(200)
  expect((await api.get('/cs/neexistuje')).status()).toBe(404)
})

test('Product offers on the home page come from the pricing table', async ({ page }) => {
  for (const [path, currency] of [
    ['/cs', 'CZK'],
    ['/en', 'EUR'],
  ] as const) {
    await page.goto(path)
    const blocks = await page.locator('script[type="application/ld+json"]').allTextContents()
    const product = blocks.map((json) => JSON.parse(json)).find((ld) => ld['@type'] === 'Product')
    expect(product.offers.length, path).toBeGreaterThan(0)
    for (const offer of product.offers) {
      expect(offer).toMatchObject({ '@type': 'Offer', priceCurrency: currency })
      expect(Number(offer.price)).toBeGreaterThan(0)
    }
  }
})
