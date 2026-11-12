import { expect, test, type Page } from '@playwright/test'

/**
 * Issue #40, SEO audit of 12. 11. 2026: blog listing cache and pages (finding 9),
 * JSON-LD (finding 8), heading levels and icons (findings 12 and 13).
 * Runs against a production build (`next build` + `next start`), because only
 * there the listing cache headers are the real ones.
 */

const PER_PAGE = 24

const jsonLdOf = async (page: Page) =>
  (
    await page
      .locator('script[type="application/ld+json"]')
      .evaluateAll((nodes) => nodes.map((node) => node.textContent ?? ''))
  ).flatMap((text) => {
    const data = JSON.parse(text) as Record<string, unknown> | Record<string, unknown>[]
    return Array.isArray(data) ? data : [data]
  })

const typesOf = async (page: Page) => (await jsonLdOf(page)).map((ld) => ld['@type'])

test.describe('Finding 9: the blog listing is cached and shows the 11th post', () => {
  for (const locale of ['cs', 'en'] as const) {
    test(`/${locale}/blog sends a shared cache header, not no-store`, async ({ request }) => {
      const response = await request.get(`/${locale}/blog`)
      expect(response.status()).toBe(200)
      const cacheControl = response.headers()['cache-control'] ?? ''
      expect(cacheControl).not.toContain('no-store')
      expect(cacheControl).toContain('s-maxage=')
    })
  }

  test('the first page lists up to 24 posts, later ones are on /blog/page/2', async ({
    page,
    request,
  }) => {
    const api = await request.get('/api/posts?locale=cs&where[slug][exists]=true&limit=0&depth=0')
    const { totalDocs } = (await api.json()) as { totalDocs: number }
    test.skip(totalDocs < 11, 'needs at least 11 published Czech posts')

    await page.goto('/cs/blog')
    const cards = page.locator('main a[href^="/cs/blog/"]:has(h2)')
    await expect(cards).toHaveCount(Math.min(totalDocs, PER_PAGE))

    const second = await request.get('/cs/blog/page/2', { maxRedirects: 0 })
    if (totalDocs <= PER_PAGE) {
      expect(second.status()).toBe(404)
      return
    }
    expect(second.status()).toBe(200)
    await page.goto('/cs/blog/page/2')
    await expect(cards).toHaveCount(Math.min(totalDocs - PER_PAGE, PER_PAGE))
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      /\/cs\/blog\/page\/2$/,
    )
  })

  test('the old ?page=2 answers 301 to /blog/page/2', async ({ request }) => {
    const response = await request.get('/cs/blog?page=2', { maxRedirects: 0 })
    expect(response.status()).toBe(301)
    expect(response.headers()['location']).toMatch(/\/cs\/blog\/page\/2$/)
  })
})

test.describe('Finding 8: structured data', () => {
  test('home and pricing have a Product named Robopipe with an image and offers', async ({
    page,
  }) => {
    for (const path of ['/cs', '/cs/cenik', '/en/pricing']) {
      await page.goto(path)
      const product = (await jsonLdOf(page)).find((ld) => ld['@type'] === 'Product')
      expect(product, path).toBeDefined()
      expect(product!.name, path).toBe('Robopipe')
      expect(product!.image, path).toBeTruthy()
      const offers = product!.offers as { availability: string }[]
      expect(offers.length, path).toBeGreaterThan(0)
      for (const offer of offers) expect(offer.availability).toBe('https://schema.org/InStock')
    }
  })

  test('solution pages have a Service, case studies an Article, the logo is a PNG', async ({
    page,
  }) => {
    await page.goto('/cs/kamerova-kontrola-kvality')
    expect(await typesOf(page)).toContain('Service')
    await page.goto('/en/auto-annotation')
    expect(await typesOf(page)).toContain('Service')

    await page.goto('/cs/case-studies')
    const href = await page
      .locator('main a[href^="/cs/case-studies/"]')
      .first()
      .getAttribute('href')
    await page.goto(href!)
    const article = (await jsonLdOf(page)).find((ld) => ld['@type'] === 'Article')
    expect(article?.datePublished).toBeTruthy()
    expect((article?.author as { name?: string })?.name).toBeTruthy()

    const organization = (await jsonLdOf(page)).find((ld) => ld['@type'] === 'Organization')
    expect(organization?.logo).toMatch(/\/logo\.png$/)
    const logo = await page.request.get(new URL(organization!.logo as string).pathname)
    expect(logo.headers()['content-type']).toBe('image/png')
  })
})

test.describe('Findings 12 and 13: icons and heading levels', () => {
  test('/apple-touch-icon.png is a PNG and icons are cached', async ({ request }) => {
    const icon = await request.get('/apple-touch-icon.png')
    expect(icon.status()).toBe(200)
    expect(icon.headers()['content-type']).toBe('image/png')
    for (const path of ['/apple-touch-icon.png', '/logo.svg', '/favicon.ico']) {
      const response = await request.get(path)
      expect(response.headers()['cache-control'], path).toContain('max-age=86400')
    }
  })

  const PAGES = [
    '/cs',
    '/en',
    '/cs/blog',
    '/en/blog',
    '/cs/case-studies',
    '/en/case-studies',
    '/cs/kontakt',
    '/en/contact',
    '/cs/cenik',
    '/en/pricing',
  ]
  for (const path of PAGES) {
    test(`${path} has one h1 and no skipped heading level`, async ({ page }) => {
      await page.goto(path)
      const levels = await page
        .locator('h1, h2, h3, h4, h5, h6')
        .evaluateAll((nodes) => nodes.map((node) => Number(node.tagName[1])))
      expect(levels.filter((level) => level === 1)).toHaveLength(1)
      levels.forEach((level, i) => {
        const previous = i ? levels[i - 1] : 0
        expect(level - previous, `${path}: h${previous} -> h${level}`).toBeLessThanOrEqual(1)
      })
    })
  }
})
