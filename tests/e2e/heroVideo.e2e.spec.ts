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

/**
 * Issue #30 (docs/specs/30-mobile-speed). A screen up to 767 px plays the mobile copy of
 * the video when the home hero has one. Runs in Chromium (desktop) and on the iPhone.
 */
test('hero video plays the file that fits the screen', async ({ page, request, viewport }) => {
  const response = await request.get('/api/pages', {
    params: { 'where[slug][equals]': 'home', locale: 'cs', depth: 1 },
  })
  const { docs } = await response.json()
  const hero = docs[0].layout.find((block: { blockType: string }) => block.blockType === 'hero')
  const narrow = (viewport?.width ?? 0) <= 767
  const expected: string = narrow && hero.mobileVideo?.url ? hero.mobileVideo.url : hero.video.url

  await page.goto('/cs')
  const video = page.locator('section video').first()
  const time = () => video.evaluate((el: HTMLVideoElement) => el.currentTime)
  await expect.poll(time, { timeout: 15_000 }).toBeGreaterThan(0)
  const src = await video.evaluate((el: HTMLVideoElement) => el.currentSrc)
  expect(new URL(src).pathname).toBe(new URL(expected, src).pathname)
})
