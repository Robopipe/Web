import { expect, test } from '@playwright/test'

/**
 * Issue #19, finding 5 (docs/specs/19-seo-code). The hero video loads with
 * preload="none" and starts after the page's load event. It must still play
 * on its own: in Chromium (desktop) and WebKit (iPhone 14 project).
 * Needs a seeded database whose home hero has a video.
 */

test('hero video does not preload and plays on its own', async ({ page }) => {
  await page.goto('/cs')
  const video = page.locator('section video').first()
  await expect(video).toHaveAttribute('preload', 'none')
  await expect(video).not.toHaveAttribute('autoplay', /.*/)

  const time = () => video.evaluate((el: HTMLVideoElement) => el.currentTime)
  await expect.poll(time, { timeout: 15_000 }).toBeGreaterThan(0)
  const first = await time()
  await expect.poll(time, { timeout: 5_000 }).toBeGreaterThan(first)
  expect(await video.evaluate((el: HTMLVideoElement) => el.paused)).toBe(false)
})
