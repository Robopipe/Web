import {
  expect,
  request as playwrightRequest,
  test,
  type APIRequestContext,
  type Page,
} from '@playwright/test'

import { cleanupTestUser, seedTestUser, testUser } from '../helpers/seedUser'

/**
 * Issue #30 (docs/specs/30-mobile-speed): image `sizes`, the hero poster under the
 * video, the mobile video and data saving, and the Google tag after an idle moment.
 * Needs a seeded database whose home hero has a video, and a server at E2E_BASE_URL.
 * The mobile video test follows the data: with a mobile copy on the home hero it
 * expects that file on a phone, without one the main video.
 */

const baseURL = process.env.E2E_BASE_URL || `http://localhost:${process.env.PORT || '3000'}`
const TEST_IDS = { googleAnalyticsId: 'G-TEST000000', googleAdsId: 'AW-000000000' }

const PHONE = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 1.75 }
const DESKTOP = { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 }

type HeroData = { video: string; mobileVideo: string | null }

/** The video URLs of the published cs home hero, read through the REST API. */
const homeHero = async (session: APIRequestContext): Promise<HeroData> => {
  const response = await session.get('/api/pages', {
    params: { 'where[slug][equals]': 'home', locale: 'cs', depth: 1 },
  })
  expect(response.status()).toBe(200)
  const { docs } = (await response.json()) as {
    docs: Array<{ layout?: Array<Record<string, { url?: string } | string | null>> }>
  }
  const hero = docs[0]?.layout?.find((block) => block.blockType === 'hero')
  const url = (value: unknown) =>
    value && typeof value === 'object' && 'url' in value ? String(value.url) : null
  const video = url(hero?.video)
  expect(video, 'the cs home hero has a video').toBeTruthy()
  return { video: video as string, mobileVideo: url(hero?.mobileVideo) }
}

const pathOf = (url: string) => new URL(url, baseURL).pathname

const heroVideo = (page: Page) => page.locator('section video').first()

/** Waits for the load event plus the longest idle wait, then reads the video. */
const videoState = async (page: Page) => {
  await page.waitForLoadState('load')
  await page.waitForTimeout(2500)
  return heroVideo(page).evaluate((video: HTMLVideoElement) => ({
    src: video.currentSrc,
    paused: video.paused,
  }))
}

let session: APIRequestContext
let hero: HeroData

test.beforeAll(async () => {
  session = await playwrightRequest.newContext({ baseURL })
  hero = await homeHero(session)
})

test.afterAll(async () => {
  await session.dispose()
})

test.describe('hero poster and video', () => {
  test('the poster is a responsive image under the video, without high priority', async ({
    page,
  }) => {
    // The server HTML has no file for the video: the script sets it after load.
    const html = await (await session.get('/cs')).text()
    const videoTag = html.match(/<video[^>]*>/)?.[0] ?? ''
    expect(videoTag).toContain('preload="none"')
    expect(videoTag).not.toMatch(/\s(src|poster)=/)

    await page.goto('/cs')
    const video = heroVideo(page)

    const poster = video.locator('xpath=..').locator('img')
    await expect(poster).toHaveCount(1)
    await expect(poster).toHaveAttribute('sizes', /\d/)
    await expect(poster).toHaveAttribute('loading', 'eager')
    await expect(poster).not.toHaveAttribute('fetchpriority', 'high')
    // The poster fills the same box as the video.
    const [posterBox, videoBox] = [await poster.boundingBox(), await video.boundingBox()]
    expect(posterBox).toEqual(videoBox)
  })

  test('the video starts after load and moves nothing (CLS 0)', async ({ page }) => {
    await page.addInitScript(`
      window.__shift = 0
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) if (!entry.hadRecentInput) window.__shift += entry.value
      }).observe({ type: 'layout-shift', buffered: true })
    `)
    await page.goto('/cs')
    const box = await heroVideo(page).boundingBox()
    const time = () => heroVideo(page).evaluate((video: HTMLVideoElement) => video.currentTime)
    await expect.poll(time, { timeout: 15_000 }).toBeGreaterThan(0)
    expect(await heroVideo(page).boundingBox()).toEqual(box)
    expect(await page.evaluate(() => (window as unknown as { __shift: number }).__shift)).toBe(0)
  })

  test.describe('on a phone', () => {
    test.use(PHONE)

    test('plays the mobile copy when there is one, else the main video', async ({ page }) => {
      await page.goto('/cs')
      const time = () => heroVideo(page).evaluate((video: HTMLVideoElement) => video.currentTime)
      await expect.poll(time, { timeout: 15_000 }).toBeGreaterThan(0)
      const src = await heroVideo(page).evaluate((video: HTMLVideoElement) => video.currentSrc)
      expect(pathOf(src)).toBe(pathOf(hero.mobileVideo ?? hero.video))
    })

    test('Save-Data: no video, the poster stays', async ({ page }) => {
      await page.addInitScript(
        `Object.defineProperty(navigator, 'connection', { value: { saveData: true }, configurable: true })`,
      )
      await page.goto('/cs')
      expect(await videoState(page)).toEqual({ src: '', paused: true })
      await expect(heroVideo(page).locator('xpath=..').locator('img')).toBeVisible()
    })

    test('prefers-reduced-data: no video', async ({ page }) => {
      await page.addInitScript(`
        const original = window.matchMedia.bind(window)
        window.matchMedia = (query) =>
          query.includes('prefers-reduced-data')
            ? { ...original('all'), matches: true, media: query }
            : original(query)
      `)
      await page.goto('/cs')
      expect(await videoState(page)).toEqual({ src: '', paused: true })
    })

    test('images ask for files no wider than the phone needs', async ({ page }) => {
      await page.goto('/cs')
      // Scroll through the page so every lazy image loads.
      await page.evaluate(async () => {
        for (let y = 0; y < document.body.scrollHeight; y += 400) {
          window.scrollTo(0, y)
          await new Promise((resolve) => setTimeout(resolve, 100))
        }
      })
      const images = await page.locator('main img[srcset]').evaluateAll((list) =>
        (list as HTMLImageElement[]).map((img) => ({
          sizes: img.getAttribute('sizes'),
          src: img.currentSrc,
        })),
      )
      expect(images.length).toBeGreaterThan(3)
      for (const image of images) {
        expect(image.sizes, image.src).toBeTruthy()
        const width = Number(new URL(image.src, baseURL).searchParams.get('w'))
        // 390 CSS px at 1.75x needs 683 px. next/image rounds up to 750 or 828.
        expect(width, image.src).toBeLessThanOrEqual(828)
      }
    })
  })

  test.describe('on a desktop', () => {
    test.use(DESKTOP)

    test('plays the main video', async ({ page }) => {
      await page.goto('/cs')
      const time = () => heroVideo(page).evaluate((video: HTMLVideoElement) => video.currentTime)
      await expect.poll(time, { timeout: 15_000 }).toBeGreaterThan(0)
      const src = await heroVideo(page).evaluate((video: HTMLVideoElement) => video.currentSrc)
      expect(pathOf(src)).toBe(pathOf(hero.video))
    })

    test('the poster stays sharp: its file is at least as wide as its box', async ({ page }) => {
      await page.goto('/cs')
      const poster = heroVideo(page).locator('xpath=..').locator('img')
      await expect.poll(() => poster.evaluate((img: HTMLImageElement) => img.complete)).toBe(true)
      const { natural, rendered } = await poster.evaluate((img: HTMLImageElement) => ({
        natural: Number(new URL(img.currentSrc).searchParams.get('w')),
        rendered: img.getBoundingClientRect().width,
      }))
      expect(natural).toBeGreaterThanOrEqual(rendered)
    })
  })
})

test.describe('fonts', () => {
  test('preloads only the text and heading fonts, the figures still get Inter 600', async ({
    page,
  }) => {
    await page.goto('/cs')
    // Space Grotesk (2 files) and Barlow 500, 600, 700 (6 files), latin and latin-ext.
    await expect(page.locator('link[rel="preload"][as="font"]')).toHaveCount(8)

    const figure = page.locator('.font-numbers').first()
    await figure.scrollIntoViewIfNeeded()
    await page.evaluate(() => document.fonts.ready)
    expect(await figure.evaluate((el) => getComputedStyle(el).fontWeight)).toBe('600')
    const interLoaded = await page.evaluate(() =>
      [...document.fonts].some(
        (face) =>
          face.family.includes('Inter') &&
          !face.family.includes('Fallback') &&
          face.status === 'loaded',
      ),
    )
    expect(interLoaded).toBe(true)
  })
})

test.describe('Google tag', () => {
  test.describe.configure({ mode: 'serial' })

  let token: string
  let originalIds: typeof TEST_IDS

  const setMeasurement = async (ids: typeof TEST_IDS) => {
    const response = await session.post('/api/globals/site-settings', {
      headers: { Authorization: `JWT ${token}` },
      data: { measurement: ids },
    })
    expect(response.status()).toBe(200)
    await expect
      .poll(
        async () => (await (await session.get('/cs')).text()).includes(TEST_IDS.googleAnalyticsId),
        {
          timeout: 30_000,
        },
      )
      .toBe(Boolean(ids.googleAnalyticsId))
  }

  test.beforeAll(async () => {
    await seedTestUser()
    const login = await session.post('/api/users/login', {
      data: { email: testUser.email, password: testUser.password },
    })
    expect(login.status()).toBe(200)
    token = ((await login.json()) as { token: string }).token
    const settings = await (
      await session.get('/api/globals/site-settings?depth=0', {
        headers: { Authorization: `JWT ${token}` },
      })
    ).json()
    originalIds = {
      googleAnalyticsId: settings.measurement?.googleAnalyticsId ?? '',
      googleAdsId: settings.measurement?.googleAdsId ?? '',
    }
    await setMeasurement(TEST_IDS)
  })

  test.afterAll(async () => {
    await setMeasurement(originalIds)
    await cleanupTestUser()
  })

  test('the script loads after the load event, the queue starts with the default denied', async ({
    page,
  }) => {
    await page.route(/googletagmanager\.com|google-analytics\.com|doubleclick\.net/, (route) =>
      route.abort(),
    )
    await page.addInitScript(`
      window.__loadAt = null
      window.__scriptAt = null
      window.addEventListener('load', () => { window.__loadAt = performance.now() })
      new MutationObserver(() => {
        if (window.__scriptAt === null && document.querySelector('script[src*="googletagmanager.com/gtag/js"]')) {
          window.__scriptAt = performance.now()
        }
      }).observe(document, { childList: true, subtree: true })
    `)
    await page.goto('/cs')
    await expect(page.locator('script[src*="googletagmanager.com/gtag/js"]')).toHaveCount(1)
    const { loadAt, scriptAt, first } = await page.evaluate(() => {
      const w = window as unknown as { __loadAt: number; __scriptAt: number }
      return {
        loadAt: w.__loadAt,
        scriptAt: w.__scriptAt,
        first: Array.from((window.dataLayer?.[0] ?? []) as ArrayLike<unknown>).slice(0, 2),
      }
    })
    expect(loadAt).not.toBeNull()
    expect(scriptAt).toBeGreaterThanOrEqual(loadAt)
    expect(first).toEqual(['consent', 'default'])
  })
})
