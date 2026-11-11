import fs from 'node:fs'
import path from 'node:path'

import { expect, test, type Page, type Request } from '@playwright/test'

/**
 * Issue #22 (docs/specs/22-service-video). The explainer video on the service
 * pages loads only after a click: before it, no request goes to YouTube or
 * Google and no third-party cookie exists. The click loads the
 * youtube-nocookie.com player. Needs a seeded database (pnpm seed).
 */

type Copy = {
  url: string
  cs: { title: string; playLabel: string }
  en: { title: string; playLabel: string }
}
const copy: Copy = JSON.parse(
  fs.readFileSync(path.resolve('seed-assets/copy/service-video.json'), 'utf8'),
)
const VIDEO_ID = new URL(copy.url).searchParams.get('v')!

const SERVICE_PAGES = {
  cs: [
    '/cs/kamerova-kontrola-kvality',
    '/cs/detekce-vad-na-vyrobni-lince',
    '/cs/pocitani-kusu-kamerou',
    '/cs/kontrola-etiket',
    '/cs/kontrola-kompletnosti-baleni',
  ],
  en: [
    '/en/camera-quality-inspection',
    '/en/defect-detection',
    '/en/camera-part-counting',
    '/en/label-inspection',
    '/en/packaging-completeness-inspection',
  ],
} as const

/** Hosts that must not get a request before the click. */
const THIRD_PARTY =
  /(^|\.)(youtube\.com|youtube-nocookie\.com|youtu\.be|ytimg\.com|ggpht\.com|googlevideo\.com|google\.com|googleapis\.com|gstatic\.com|doubleclick\.net|googletagmanager\.com|google-analytics\.com)$/

const thirdParty = (request: Request) => THIRD_PARTY.test(new URL(request.url()).hostname)

/** Records every request of the page from now on. */
const recordRequests = (page: Page) => {
  const requests: Request[] = []
  page.on('request', (request) => requests.push(request))
  return requests
}

/** The VideoObject entries of the page's JSON-LD. */
const videoObjects = (page: Page) =>
  page.locator('script[type="application/ld+json"]').evaluateAll((scripts) =>
    scripts
      .map((s) => JSON.parse(s.textContent ?? 'null'))
      .flat()
      .filter((d) => d?.['@type'] === 'VideoObject'),
  )

for (const locale of ['cs', 'en'] as const) {
  const texts = copy[locale]

  test.describe(`service video (${locale})`, () => {
    for (const pagePath of SERVICE_PAGES[locale]) {
      test(`${pagePath}: preview only, VideoObject, nothing from YouTube or Google`, async ({
        page,
        context,
      }) => {
        const requests = recordRequests(page)
        await page.goto(pagePath)
        const button = page.getByRole('button', { name: texts.playLabel })
        await button.scrollIntoViewIfNeeded()
        await expect(button).toBeVisible()
        await expect(button.locator('img')).toHaveAttribute(
          'src',
          /^\/_next\/image\?url=%2Fapi%2Fmedia/,
        )
        await page.waitForLoadState('networkidle')

        expect(requests.filter(thirdParty).map((r) => r.url())).toEqual([])
        expect(await page.locator('iframe').count()).toBe(0)
        const cookies = await context.cookies()
        expect(cookies.filter((c) => !/^\.?localhost$/.test(c.domain))).toEqual([])

        // The video sits right above the first question.
        const order = await page.evaluate((label) => {
          const video = document.querySelector(`button[aria-label="${label}"]`)!
          const faq = document.querySelector('details summary')!
          return video.compareDocumentPosition(faq) & Node.DOCUMENT_POSITION_FOLLOWING
        }, texts.playLabel)
        expect(order).toBeTruthy()

        const [video, ...others] = await videoObjects(page)
        expect(others).toEqual([])
        expect(video).toMatchObject({
          name: texts.title,
          duration: 'PT50S',
          uploadDate: '2026-11-11',
          embedUrl: `https://www.youtube.com/embed/${VIDEO_ID}`,
          url: copy.url,
        })
        expect(video.thumbnailUrl).toMatch(
          /^https?:\/\/[^/]+\/api\/media\/file\/service-video-thumbnail/,
        )
      })
    }

    test('the play button works with the keyboard and focuses the player', async ({ page }) => {
      // The player itself is not under test: answer YouTube with an empty page.
      await page.route(/youtube-nocookie\.com/, (route) =>
        route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>player</title>' }),
      )
      const requests = recordRequests(page)
      await page.goto(SERVICE_PAGES[locale][0])
      const button = page.getByRole('button', { name: texts.playLabel })
      await button.focus()
      await page.keyboard.press(locale === 'cs' ? 'Enter' : 'Space')

      const iframe = page.locator(`iframe[title="${texts.title}"]`)
      await expect(iframe).toBeVisible()
      await expect(button).toHaveCount(0)
      const src = new URL((await iframe.getAttribute('src'))!)
      expect(src.origin).toBe('https://www.youtube-nocookie.com')
      expect(src.pathname).toBe(`/embed/${VIDEO_ID}`)
      expect(src.searchParams.get('autoplay')).toBe('1')
      expect(src.searchParams.get('hl')).toBe(locale)
      expect(src.searchParams.get('cc_lang_pref')).toBe(locale)
      expect(src.searchParams.get('cc_load_policy')).toBe(locale === 'en' ? '1' : null)
      await expect.poll(() => page.evaluate(() => document.activeElement?.tagName)).toBe('IFRAME')

      // After the click only youtube-nocookie.com, never youtube.com itself.
      const hosts = new Set(requests.filter(thirdParty).map((r) => new URL(r.url()).hostname))
      expect([...hosts]).toEqual(['www.youtube-nocookie.com'])
    })

    test('a mouse click also loads the player', async ({ page }) => {
      await page.route(/youtube-nocookie\.com/, (route) =>
        route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>player</title>' }),
      )
      await page.goto(SERVICE_PAGES[locale][3])
      await page.getByRole('button', { name: texts.playLabel }).click()
      await expect(
        page.locator('iframe[src^="https://www.youtube-nocookie.com/embed/"]'),
      ).toBeVisible()
    })

    test('390 px: no horizontal scrollbar, the preview fits the screen', async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 })
      for (const pagePath of SERVICE_PAGES[locale]) {
        await page.goto(pagePath)
        const button = page.getByRole('button', { name: texts.playLabel })
        await button.scrollIntoViewIfNeeded()
        const box = (await button.boundingBox())!
        expect(box.x, pagePath).toBeGreaterThanOrEqual(0)
        expect(box.x + box.width, pagePath).toBeLessThanOrEqual(390)
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - window.innerWidth,
        )
        expect(overflow, pagePath).toBeLessThanOrEqual(0)
      }
    })
  })
}

test('no video on the home and contact pages', async ({ page }) => {
  for (const pagePath of ['/cs', '/en', '/cs/kontakt', '/en/contact']) {
    await page.goto(pagePath)
    await expect(page.getByRole('button', { name: /^(Přehrát|Play) video/ })).toHaveCount(0)
    expect(await videoObjects(page), pagePath).toEqual([])
  }
})
