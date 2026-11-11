import { expect, test } from '@playwright/test'

/**
 * Case studies page, round 3 of docs/specs/9-home-comments (7.1 to 7.6).
 * Needs a seeded local database (pnpm seed, then pnpm seed:seo-geo --status=published)
 * and a server at E2E_BASE_URL.
 */

const PAGE = {
  cs: {
    path: '/cs/case-studies',
    alt: 'Kamera Robopipe nad linkou s plněnými bagetami',
    precision: 'přesnost detekce',
    listed: 'na zalistovanou položku',
    byTask: 'Řešení podle úlohy',
    cta: 'Třeba je na řadě právě váš provoz.',
    detail: '/cs/case-studies/mg-servis-kontrola-baleni',
  },
  en: {
    path: '/en/case-studies',
    alt: 'Robopipe camera above a line of filled baguettes',
    precision: 'detection precision',
    listed: 'per item listed',
    byTask: 'Solutions by task',
    cta: 'Your operation could be next.',
    detail: '/en/case-studies/mg-servis-packaging-checks',
  },
} as const

for (const [locale, p] of Object.entries(PAGE)) {
  test.describe(`case studies listing (${locale})`, () => {
    test('7.1 to 7.3, 7.5 and 7.6 at 1440 px', async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 })
      await page.goto(p.path)

      // 7.1: the featured case study shows the real camera frame.
      const hero = page.getByRole('img', { name: p.alt })
      await expect(hero).toBeVisible()
      await expect(hero).toHaveAttribute('src', /crocodille-camera-line/)

      // 7.2 and 7.3: no 95% result on any listing card.
      await expect(page.locator('main dl', { hasText: p.precision })).toHaveCount(0)

      // 7.5: the quote sits above the solutions by task.
      const quote = page.locator('main figure blockquote')
      const byTask = page.getByRole('heading', { name: p.byTask })
      const [quoteBox, byTaskBox] = [await quote.boundingBox(), await byTask.boundingBox()]
      expect(quoteBox!.y).toBeLessThan(byTaskBox!.y)

      // 7.6
      await expect(page.getByRole('heading', { name: p.cta })).toBeVisible()
    })

    test('7.4: the results of a card share one row at 1440 px', async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 })
      await page.goto(p.path)
      const values = page.locator('main dl', { hasText: p.listed }).locator('dd')
      await expect(values).toHaveCount(2)
      const [first, second] = [await values.nth(0).boundingBox(), await values.nth(1).boundingBox()]
      expect(first!.y).toBe(second!.y)
    })

    test('7.7: the detail page still shows the 95% result', async ({ page }) => {
      const response = await page.goto(p.detail)
      expect(response?.status()).toBe(200)
      await expect(page.locator('main dl', { hasText: p.precision })).toHaveCount(1)
    })
  })
}
