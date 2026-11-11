import { expect, test } from '@playwright/test'

/**
 * Issue #9, checks beyond the home page (docs/specs/9-home-comments/test-report.md).
 * The footer is shared, so criterion 4.1 holds on every page type, also on a 404.
 * Needs a seeded local database and a server at E2E_BASE_URL.
 */

const PAGES = [
  { path: '/cs/kontrola-etiket', memberships: 'Jsme součástí', status: 200 },
  { path: '/en/auto-annotation', memberships: 'Part of', status: 200 },
  { path: '/cs/blog', memberships: 'Jsme součástí', status: 200 },
  { path: '/cs/cenik', memberships: 'Jsme součástí', status: 200 },
  { path: '/cs/stranka-ktera-neexistuje', memberships: 'Jsme součástí', status: 404 },
]

for (const { path, memberships, status } of PAGES) {
  test(`keeps at least 48 px above the footer memberships on ${path} (4.1)`, async ({ page }) => {
    const response = await page.goto(path)
    expect(response?.status()).toBe(status)
    for (const width of [320, 1440]) {
      await page.setViewportSize({ width, height: 900 })
      const gap = await page
        .locator('footer')
        .getByText(memberships, { exact: true })
        .evaluate((label) => {
          const previous = label.parentElement!.previousElementSibling!
          return label.getBoundingClientRect().top - previous.getBoundingClientRect().bottom
        })
      expect(gap, `width ${width}`).toBeGreaterThanOrEqual(48)
    }
  })
}

for (const locale of ['cs', 'en'] as const) {
  test(`the card link stays inside its card and the page has no horizontal scroll at 320 px (${locale})`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 800 })
    await page.goto(`/${locale}`)
    const link = page.locator('main p > a').filter({
      hasText: locale === 'cs' ? 'automatická anotace' : 'Auto annotation',
    })
    await expect(link).toHaveCount(1)
    await expect(link.locator('xpath=ancestor::a')).toHaveCount(0)
    const { right, cardRight, overflow } = await link.evaluate((a) => {
      const card = a.closest('p')!.parentElement!
      return {
        right: a.getBoundingClientRect().right,
        cardRight: card.getBoundingClientRect().right,
        overflow: document.documentElement.scrollWidth - window.innerWidth,
      }
    })
    expect(right).toBeLessThanOrEqual(cardRight + 1)
    expect(overflow).toBe(0)
  })
}

test('wraps a long unbroken word in the card link inside its card at 320 px (C3)', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 800 })
  await page.goto('/cs')
  const link = page.locator('main p > a').filter({ hasText: 'automatická anotace' })
  // The test does not change data: it puts the long word into the rendered link.
  const { right, cardRight, overflow } = await link.evaluate((a) => {
    a.textContent = 'A'.repeat(100)
    const card = a.closest('p')!.parentElement!
    return {
      right: a.getBoundingClientRect().right,
      cardRight: card.getBoundingClientRect().right,
      overflow: document.documentElement.scrollWidth - window.innerWidth,
    }
  })
  expect(right).toBeLessThanOrEqual(cardRight + 1)
  expect(overflow).toBe(0)
})
