import { expect, test } from '@playwright/test'

test.describe('Frontend', () => {
  test('Czech home page answers 200 and has a heading', async ({ page }) => {
    const response = await page.goto('/cs')
    expect(response?.status()).toBe(200)
    await expect(page.locator('h1').first()).toBeVisible()
  })
})
