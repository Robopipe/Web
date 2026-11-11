import fs from 'node:fs'
import path from 'node:path'

import {
  expect,
  request as playwrightRequest,
  test,
  type APIRequestContext,
  type Page,
} from '@playwright/test'

import { cleanupTestUser, seedTestUser, testUser } from '../helpers/seedUser'

/**
 * Acceptance criteria of issue #6 (docs/specs/6-seo-geo-stage2/product.md).
 * Needs a seeded local database (pnpm seed) and a server at E2E_BASE_URL.
 *
 * The URL list is written out here on purpose (architecture 15.1), not read
 * from the sitemap, so a page missing from the sitemap fails.
 */

const baseURL = process.env.E2E_BASE_URL || `http://localhost:${process.env.PORT || '3000'}`
const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL || baseURL
const abs = (p: string) => `${SERVER_URL}${p}`
const local = (url: string) => url.replace(SERVER_URL, baseURL)

type Stage2Page = { cs: string; en: string; keyword: { cs: string; en: string }; task: boolean }

const STAGE2_PAGES: Stage2Page[] = [
  {
    cs: '/cs/kamerova-kontrola-kvality',
    en: '/en/camera-quality-inspection',
    keyword: { cs: 'kamerová kontrola kvality', en: 'camera quality inspection' },
    task: false,
  },
  {
    cs: '/cs/detekce-vad-na-vyrobni-lince',
    en: '/en/defect-detection',
    keyword: { cs: 'detekce vad na výrobní lince', en: 'defect detection' },
    task: true,
  },
  {
    cs: '/cs/pocitani-kusu-kamerou',
    en: '/en/camera-part-counting',
    keyword: { cs: 'počítání kusů kamerou', en: 'part counting with a camera' },
    task: true,
  },
  {
    cs: '/cs/kontrola-etiket',
    en: '/en/label-inspection',
    keyword: { cs: 'kontrola etiket', en: 'label inspection' },
    task: true,
  },
  {
    cs: '/cs/kontrola-kompletnosti-baleni',
    en: '/en/packaging-completeness-inspection',
    keyword: { cs: 'kontrola kompletnosti balení', en: 'packaging completeness inspection' },
    task: true,
  },
]
const STAGE2_URLS = STAGE2_PAGES.flatMap((p) => [p.cs, p.en])
const ABOUT = { cs: '/cs/o-nas', en: '/en/about' }
const MARKERS = ['[doplnit Filip]', '[ověřit]']
const ORGANIZATION_ID = `${SERVER_URL}/#organization`
/** The about page is published only when its copy has no [doplnit Filip] (script rule 1). */
const ABOUT_HAS_MARKERS = ['landing-about.cs.md', 'landing-about.md'].some((file) =>
  fs
    .readFileSync(path.resolve(process.cwd(), 'seed-assets/copy/seo-geo', file), 'utf8')
    .includes('[doplnit Filip]'),
)

let api: APIRequestContext
test.beforeAll(async () => {
  api = await playwrightRequest.newContext({ baseURL })
})
test.afterAll(async () => {
  await api.dispose()
})

const jsonLdOf = async (page: Page) =>
  (await page.locator('script[type="application/ld+json"]').allTextContents()).map(
    (json) => JSON.parse(json) as Record<string, unknown>,
  )

/** Required properties per type, the same structural check as stage 1. */
const expectValidLd = (ld: Record<string, unknown>, where: string) => {
  expect(ld['@context'], where).toBe('https://schema.org')
  if (ld['@type'] === 'BreadcrumbList') {
    const items = ld.itemListElement as Record<string, unknown>[]
    expect(items.length, where).toBeGreaterThan(1)
    items.forEach((item, i) => {
      expect(item, where).toMatchObject({ '@type': 'ListItem', position: i + 1 })
      expect(typeof item.name, where).toBe('string')
      expect(String(item.item), where).toMatch(/^https?:\/\//)
    })
  }
  if (ld['@type'] === 'FAQPage') {
    const questions = ld.mainEntity as Record<string, unknown>[]
    expect(questions.length, where).toBeGreaterThan(0)
    for (const q of questions) {
      expect(q['@type'], where).toBe('Question')
      expect(String(q.name).length, where).toBeGreaterThan(5)
      expect(String((q.acceptedAnswer as { text: string }).text).length, where).toBeGreaterThan(5)
    }
  }
  if (ld['@type'] === 'Organization') {
    expect(ld, where).toMatchObject({ '@id': ORGANIZATION_ID, name: 'Robopipe' })
    expect(String(ld.url), where).toMatch(/^https?:\/\//)
  }
}

test.describe('AC 1: stage 2 pages answer 200 and are in the sitemap and llms.txt', () => {
  test('every page answers 200 in cs and en', async () => {
    for (const url of STAGE2_URLS) expect((await api.get(url)).status(), url).toBe(200)
  })

  test('sitemap.xml lists every page with hreflang cs, en and x-default', async () => {
    const xml = await (await api.get('/sitemap.xml')).text()
    const entries = [...xml.matchAll(/<url>([\s\S]*?)<\/url>/g)].map((m) => m[1])
    for (const { cs, en } of STAGE2_PAGES) {
      for (const url of [cs, en]) {
        const entry = entries.find((e) => e.includes(`<loc>${abs(url)}</loc>`))
        expect(entry, url).toBeDefined()
        expect(entry).toContain(`hreflang="cs" href="${abs(cs)}"`)
        expect(entry).toContain(`hreflang="en" href="${abs(en)}"`)
        expect(entry).toContain(`hreflang="x-default" href="${abs(en)}"`)
      }
    }
  })

  test('/llms.txt links every page and has the company line', async () => {
    const text = await (await api.get('/llms.txt')).text()
    for (const url of STAGE2_URLS) expect(text, url).toContain(`(${abs(url)})`)
    expect(text).toMatch(/## Kontakt \/ Contact\n- .+, IČO \d{8}\n/)
  })
})

test.describe('AC 2 and 3: metadata, structured data and the main keyword', () => {
  for (const { cs, en, keyword } of STAGE2_PAGES) {
    for (const [locale, url] of [
      ['cs', cs],
      ['en', en],
    ] as const) {
      test(`${url}`, async ({ page }) => {
        expect((await page.goto(url))?.status()).toBe(200)

        const title = await page.title()
        expect(title.length, 'title').toBeLessThanOrEqual(60)
        const description = await page.locator('meta[name="description"]').getAttribute('content')
        expect(description?.length, 'description').toBeGreaterThan(30)
        expect(description!.length, 'description').toBeLessThanOrEqual(160)

        const canonicals = page.locator('link[rel="canonical"]')
        await expect(canonicals).toHaveCount(1)
        expect(await canonicals.getAttribute('href')).toBe(abs(url))

        const ogImage = await page
          .locator('meta[property="og:image"]')
          .first()
          .getAttribute('content')
        expect(ogImage).toMatch(/^https?:\/\//)
        expect((await api.get(local(ogImage!))).status(), ogImage!).toBe(200)

        const blocks = await jsonLdOf(page)
        expect(blocks.map((b) => b['@type'])).toContain('BreadcrumbList')
        expect(blocks.map((b) => b['@type'])).toContain('FAQPage')
        for (const ld of blocks) expectValidLd(ld, `${url} ${ld['@type']}`)

        const word = keyword[locale].toLowerCase()
        expect(title.toLowerCase(), 'title').toContain(word)
        expect((await page.locator('h1').first().innerText()).toLowerCase(), 'h1').toContain(word)
        const firstParagraph = await page.locator('main p').first().innerText()
        expect(firstParagraph.toLowerCase(), 'first paragraph').toContain(word)
      })
    }
  }
})

test('AC 4: every task page links a reference or an article, or says it has none', async ({
  page,
}) => {
  for (const url of STAGE2_PAGES.filter((p) => p.task).flatMap((p) => [p.cs, p.en])) {
    await page.goto(url)
    const main = page.locator('main')
    const links = await main.locator('a[href*="/case-studies/"], a[href*="/blog/"]').count()
    const text = (await main.innerText()).toLowerCase()
    expect(links > 0 || /referenc/.test(text), url).toBe(true)
  }
  for (const url of ['/cs/kontrola-etiket', '/en/label-inspection']) {
    await page.goto(url)
    const text = await page.locator('main').innerText()
    expect(text, url).toMatch(
      /Veřejnou referenci na kontrolu etiket zatím nemáme|do not have a public reference/,
    )
    await expect(page.locator('main a[href*="/case-studies/"]'), url).toHaveCount(0)
  }
})

test.describe('AC 5: about page and Organization', () => {
  test(`the about page answers ${ABOUT_HAS_MARKERS ? '404 (copy has [doplnit Filip])' : '200'}`, async () => {
    for (const url of [ABOUT.cs, ABOUT.en]) {
      expect((await api.get(url)).status(), url).toBe(ABOUT_HAS_MARKERS ? 404 : 200)
    }
  })

  test('every page has exactly one Organization with @id and name', async ({ page }) => {
    for (const url of [...STAGE2_URLS, '/cs', '/en', '/cs/cenik', '/en/pricing']) {
      await page.goto(url)
      const organizations = (await jsonLdOf(page)).filter((ld) => ld['@id'] === ORGANIZATION_ID)
      expect(organizations.filter((ld) => ld.name).length, url).toBe(1)
      expect(organizations[0], url).toMatchObject({
        '@type': 'Organization',
        legalName: expect.any(String),
        identifier: { '@type': 'PropertyValue', propertyID: 'IČO', value: expect.any(String) },
      })
      expectValidLd(organizations[0], url)
    }
  })
})

test.describe('AC 6: Bing and Seznam verification tags', () => {
  const tags = async (url: string) => {
    const html = await (await api.get(url)).text()
    return {
      bing: html.match(/<meta name="msvalidate.01" content="([^"]*)"/)?.[1],
      seznam: html.match(/<meta name="seznam-wmt" content="([^"]*)"/)?.[1],
    }
  }
  /** The server revalidates after the global changes. The first request may still be stale. */
  const waitForTags = async (url: string, expected: { bing?: string; seznam?: string }) => {
    await expect
      .poll(() => tags(url), { timeout: 30_000, intervals: [500, 1000, 2000] })
      .toEqual(expected)
  }

  test('without tokens no page has the tags', async () => {
    for (const url of ['/cs', '/en', STAGE2_PAGES[0].cs]) {
      expect(await tags(url), url).toEqual({ bing: undefined, seznam: undefined })
    }
  })

  test('with tokens set through the API every page has both tags, and they go away again', async () => {
    await seedTestUser()
    const session = await playwrightRequest.newContext({ baseURL })
    const login = await session.post('/api/users/login', {
      data: { email: testUser.email, password: testUser.password },
    })
    expect(login.status()).toBe(200)
    const { token } = (await login.json()) as { token: string }
    const patch = (verification: Record<string, string>) =>
      session.post('/api/globals/site-settings', {
        headers: { Authorization: `JWT ${token}` },
        data: { verification },
      })
    try {
      expect((await patch({ bing: 'e2e-bing', seznam: 'e2e-seznam' })).status()).toBe(200)
      await waitForTags('/cs', { bing: 'e2e-bing', seznam: 'e2e-seznam' })
      await waitForTags(STAGE2_PAGES[1].en, { bing: 'e2e-bing', seznam: 'e2e-seznam' })

      expect((await patch({ bing: 'e2e-bing', seznam: '' })).status()).toBe(200)
      await waitForTags('/cs', { bing: 'e2e-bing', seznam: undefined })
    } finally {
      await patch({ bing: '', seznam: '' })
      await waitForTags('/cs', { bing: undefined, seznam: undefined })
      await session.dispose()
      await cleanupTestUser()
    }
  })
})

test('AC 7: the pricing block shows the tiers and prices of the pricing page', async ({ page }) => {
  for (const [home, solution, pricingPath] of [
    ['/cs', '/cs/kamerova-kontrola-kvality', '/cs/cenik'],
    ['/en', '/en/camera-quality-inspection', '/en/pricing'],
  ] as const) {
    await page.goto(home)
    const product = (await jsonLdOf(page)).find((ld) => ld['@type'] === 'Product')!
    const offers = product.offers as { name: string; price: string }[]
    expect(offers.length, home).toBeGreaterThan(0)

    /** Tier names (h3) of the section that holds all offers. */
    const tierSection = async (url: string) => {
      await page.goto(url)
      for (const section of await page.locator('main section').all()) {
        const names = await section.locator('h3').allInnerTexts()
        if (offers.every((offer) => names.includes(offer.name))) {
          return { names, text: (await section.innerText()).replace(/\s/g, '') }
        }
      }
      return null
    }
    const onPricing = await tierSection(pricingPath)
    const onSolution = await tierSection(solution)
    expect(onPricing, pricingPath).not.toBeNull()
    expect(onSolution, solution).not.toBeNull()
    expect(onSolution!.names, solution).toEqual(onPricing!.names)
    for (const offer of offers) expect(onSolution!.text, offer.name).toContain(offer.price)
  }
})

test('AC 8: no page in the sitemap shows a copy marker', async () => {
  const xml = await (await api.get('/sitemap.xml')).text()
  const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname)
  expect(urls.length).toBeGreaterThan(20)
  expect(urls.includes(ABOUT.cs), ABOUT.cs).toBe(!ABOUT_HAS_MARKERS)
  for (const url of urls) {
    const html = await (await api.get(url)).text()
    for (const marker of MARKERS) expect(html.includes(marker), `${url} ${marker}`).toBe(false)
  }
})

test.describe('AC 9: no sideways scrolling on mobile', () => {
  for (const width of [320, 390]) {
    test(`${width} px`, async ({ browser }) => {
      const context = await browser.newContext({ viewport: { width, height: 800 } })
      const page = await context.newPage()
      for (const url of [...STAGE2_URLS, '/cs/case-studies', '/cs']) {
        await page.goto(url)
        const { scrollWidth, innerWidth } = await page.evaluate(() => ({
          scrollWidth: document.documentElement.scrollWidth,
          innerWidth: window.innerWidth,
        }))
        expect(scrollWidth, url).toBeLessThanOrEqual(innerWidth)
      }
      await context.close()
    })
  }
})

test('home, use cases listing and footer link every stage 2 page', async ({ page }) => {
  for (const locale of ['cs', 'en'] as const) {
    const targets = STAGE2_PAGES.map((p) => p[locale])
    for (const [url, scope] of [
      [`/${locale}`, 'main'],
      [`/${locale}/case-studies`, 'main'],
      [`/${locale}`, 'footer'],
    ] as const) {
      await page.goto(url)
      for (const target of targets) {
        await expect(
          page.locator(`${scope} a[href="${target}"]`).first(),
          `${url} ${scope} ${target}`,
        ).toBeVisible()
      }
    }
  }
})

test('every internal link in main of the stage 2 pages answers 200', async ({ page }) => {
  const checked = new Map<string, number>()
  for (const url of STAGE2_URLS) {
    await page.goto(url)
    const hrefs = await page
      .locator('main a[href^="/"]')
      .evaluateAll((links) => links.map((a) => a.getAttribute('href')!.split('#')[0]))
    for (const href of new Set(hrefs)) {
      if (!checked.has(href)) checked.set(href, (await api.get(href)).status())
      expect(checked.get(href), `${url} → ${href}`).toBe(200)
    }
  }
  expect(checked.size).toBeGreaterThan(10)
})
