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
    // Section headings in the round 2 order (6.1), the story by its eyebrow.
    order: [
      'AI kontrola kvality, kterou zvládne váš vlastní tým.',
      'AI kontrola v provozu za jediný den.',
      'Postaveno pro váš obor.',
      'Příběh zákazníka',
      'Kontrola kvality ve výrobě podle úlohy',
      'Jsme součástí',
      'Z blogu',
    ],
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
    order: [
      'Deep-learning inspection your own team runs.',
      'AI inspection, live in a day.',
      'Made to redefine your industry.',
      'Customer story',
      'Quality control in production, by task',
      'Part of',
      'From the blog',
    ],
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

    test('spreads the card grids over the page (6.1, 6.2)', async ({ page }) => {
      const tops: number[] = []
      for (const text of copy.order) tops.push(await topOf(page, text))
      expect(tops).toEqual([...tops].sort((a, b) => a - b))
      // No two card grids are neighbour sections.
      const at = await page.locator('main').evaluate((main, grids) => {
        const sections = [...main.querySelectorAll('section')].filter(
          (section) => !section.parentElement?.closest('section'),
        )
        return grids.map((text) =>
          sections.findIndex((section) =>
            [...section.querySelectorAll('h1, h2, h3')].some((h) => h.textContent?.trim() === text),
          ),
        )
      }, [copy.order[0], copy.order[2], copy.order[4]])
      expect(at.every((i) => i >= 0), at.join()).toBe(true)
      expect(at[1]! - at[0]!).toBeGreaterThan(1)
      expect(at[2]! - at[1]!).toBeGreaterThan(1)
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
