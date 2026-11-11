import { expect, test } from '@playwright/test'

/**
 * Tester edge case for round 3 of docs/specs/9-home-comments (7.4, test-report.md
 * D3). A card with three results and a long Czech word in a label. The test adds
 * the results to the page DOM only, the database stays as it is.
 * Needs a seeded local database and a server at E2E_BASE_URL.
 */

for (const width of [1440, 1024, 768]) {
  test(`keeps a long word of a result label inside the card with three results at ${width} px (D3)`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/cs/case-studies')
    // The last card has one result on the listing. Give it three, as Filip could.
    const card = page.locator('main article').last()
    const overflow = await card.evaluate((article) => {
      const dl = article.querySelector('dl')!
      const first = dl.querySelector(':scope > div')!
      for (const [value, label] of [
        ['24/7', 'nepřetržitý provoz'],
        ['100 %', 'elektroinstalačních kontrol'],
      ]) {
        const row = first.cloneNode(true) as HTMLElement
        row.querySelector('dd')!.textContent = value
        row.querySelector('dt')!.textContent = label
        dl.appendChild(row)
      }
      const right = article.getBoundingClientRect().right
      return Math.max(
        ...[...dl.querySelectorAll('dd, dt')].map((el) => {
          const range = document.createRange()
          range.selectNodeContents(el)
          return Math.round(range.getBoundingClientRect().right - right)
        }),
      )
    })
    // A positive value is text cut off at the card edge.
    expect(overflow).toBeLessThanOrEqual(0)
  })
}
