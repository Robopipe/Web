import { expect, test, type Page } from '@playwright/test'

/**
 * Acceptance criteria of issue #9 (docs/specs/9-home-comments/product.md).
 * Needs a seeded local database (pnpm seed, then pnpm seed:seo-geo --status=published)
 * and a server at E2E_BASE_URL.
 */

const HOME = {
  cs: {
    path: '/cs',
    memberships: 'Jsme součástí',
    story: 'Příběh zákazníka',
    blog: 'Z blogu',
    autoAnnotation: 'Automatická anotace: rámečky navrhne AI',
    link: 'Snímky vám pomůže označit automatická anotace.',
    linkPath: '/cs/automaticka-anotace',
    labelCard: 'Kontrola etiket',
  },
  en: {
    path: '/en',
    memberships: 'Part of',
    story: 'Customer story',
    blog: 'From the blog',
    autoAnnotation: 'Auto annotation: AI proposes',
    link: 'Auto annotation helps you label the images.',
    linkPath: '/en/auto-annotation',
    labelCard: 'Label inspection',
  },
} as const

/** Top edge of the first element with this exact text inside main, in page coordinates. */
const topOf = async (page: Page, text: string) => {
  const box = await page.locator('main').getByText(text, { exact: true }).first().boundingBox()
  expect(box, text).not.toBeNull()
  return box!.y
}

for (const [locale, copy] of Object.entries(HOME)) {
  test.describe(`home page ${locale}`, () => {
    test.beforeEach(async ({ page }) => {
      const response = await page.goto(copy.path)
      expect(response?.status()).toBe(200)
    })

    test('shows the memberships after the customer story and before the blog (1.1, 1.2)', async ({
      page,
    }) => {
      const memberships = await topOf(page, copy.memberships)
      expect(memberships).toBeGreaterThan(await topOf(page, copy.story))
      expect(memberships).toBeLessThan(await topOf(page, copy.blog))
    })

    test('has no auto annotation section (3.1)', async ({ page }) => {
      await expect(page.locator('main').getByText(copy.autoAnnotation)).toHaveCount(0)
    })

    test('links one card sentence to the auto annotation page (3.2, 3.3)', async ({
      page,
      request,
    }) => {
      const link = page.locator('main').getByRole('link', { name: copy.link, exact: true })
      await expect(link).toHaveCount(1)
      await expect(link).toHaveAttribute('href', copy.linkPath)
      expect((await request.get(copy.linkPath)).status()).toBe(200)
    })

    test('shows the label inspection card with the frame from the line (2.1, 2.4, 2.5)', async ({
      page,
    }) => {
      const card = page
        .locator('main a')
        .filter({ has: page.getByRole('heading', { name: copy.labelCard, exact: true }) })
      const image = card.locator('img').first()
      await expect(image).toHaveAttribute('src', /label-inspection-card/)
      await expect(image).toHaveAttribute('alt', copy.labelCard)
      // The image loads lazily.
      await image.scrollIntoViewIfNeeded()
      await expect
        .poll(() => image.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth))
        .toBeGreaterThan(0)
      const ratio = await image.evaluate(
        (img: HTMLImageElement) => img.naturalWidth / img.naturalHeight,
      )
      expect(ratio).toBeCloseTo(4 / 3, 2)
    })

    test('keeps at least 48 px above the footer memberships (4.1)', async ({ page }) => {
      for (const width of [375, 1440]) {
        await page.setViewportSize({ width, height: 900 })
        const gap = await page
          .locator('footer')
          .getByText(copy.memberships, { exact: true })
          .evaluate((label) => {
            const block = label.parentElement!
            const previous = block.previousElementSibling!
            return label.getBoundingClientRect().top - previous.getBoundingClientRect().bottom
          })
        expect(gap, `width ${width}`).toBeGreaterThanOrEqual(48)
      }
    })
  })
}
