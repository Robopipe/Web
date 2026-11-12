import { test, expect } from '@playwright/test'
import { getPayload, Payload } from 'payload'
import sharp from 'sharp'

import config from '../../src/payload.config.js'
import { markdownToLexical } from '../../src/jobs/markdown'
import { deleteOnServer, updateOnServer } from '../helpers/serverRevalidate'

/**
 * Regression guard: the featured (newest) card on /blog used to take the height
 * of its hero photo, so a portrait photo made the card several screens tall.
 * The photo must sit in a 16:9 box whatever its own dimensions are.
 */

const TITLE = 'E2E featured card with a portrait photo'
const SLUG = 'e2e-featured-card-portrait-photo'

let payload: Payload
let mediaId: number
let postId: number

test.describe('Blog featured card', () => {
  test.beforeAll(async () => {
    payload = await getPayload({ config })

    // 800×2000 portrait photo, the case that broke the layout.
    const data = await sharp({
      create: { width: 800, height: 2000, channels: 3, background: '#1d4ed8' },
    })
      .jpeg()
      .toBuffer()
    const media = await payload.create({
      collection: 'media',
      data: { alt: 'Portrait test photo' },
      file: { data, mimetype: 'image/jpeg', name: `${SLUG}.jpg`, size: data.length },
    })
    mediaId = media.id

    // Dated in the future so it is the newest post and gets the featured card.
    const post = await payload.create({
      collection: 'posts',
      locale: 'en',
      data: {
        title: TITLE,
        slug: SLUG,
        excerpt: 'Short excerpt for the featured card test.',
        content: await markdownToLexical(payload.config, 'Body text for the fixture post.'),
        heroImage: mediaId,
        publishedAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        _status: 'published',
      },
    })
    postId = post.id
    // The listing is cached (issue #40): let the server under test revalidate it.
    await updateOnServer('posts', postId, 'en')
  })

  test.afterAll(async () => {
    if (postId) await deleteOnServer('posts', postId)
    if (mediaId) await payload.delete({ collection: 'media', id: mediaId })
  })

  for (const viewport of [
    { name: 'desktop', width: 1440, height: 900 },
    { name: 'mobile', width: 390, height: 844 },
  ]) {
    test(`keeps the photo in a 16:9 box on ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height })
      await page.goto('/en/blog')

      const card = page.locator('article').first()
      await expect(card.locator('h2')).toHaveText(TITLE)

      const cardBox = await card.boundingBox()
      const photo = await card.locator('img').first().boundingBox()
      const text = await card.locator('h2').locator('..').boundingBox()
      if (!cardBox || !photo || !text) throw new Error('featured card is not rendered')

      const sixteenByNine = (photo.width * 9) / 16
      if (viewport.name === 'mobile') {
        // Stacked layout: full card width, exactly 16:9.
        expect(Math.abs(photo.width - cardBox.width)).toBeLessThan(3)
        expect(Math.abs(photo.height - sixteenByNine)).toBeLessThan(2)
      } else {
        // Two columns: the photo stays in its column and is 16:9, or as tall as
        // the text column when the text is taller. Never as tall as the photo.
        expect(photo.width).toBeLessThan(cardBox.width * 0.6)
        expect(Math.abs(photo.height - Math.max(sixteenByNine, text.height))).toBeLessThan(2)
      }
      expect(photo.height).toBeLessThan(photo.width)
    })
  }

  // Tester (#3): one long unbroken word in the title widens the stacked grid
  // column below lg, so the photo box grows past the card (979 px on a 358 px card).
  for (const width of [390, 320]) {
    test(`keeps the photo and title inside the card at ${width} px with a long unbroken title`, async ({
      page,
    }) => {
      const longTitle = 'E2E Superkalifragilistikexpialidociozniautomatizacevyrobnichlinek'
      await updateOnServer('posts', postId, 'en', { title: longTitle })
      try {
        await page.setViewportSize({ width, height: 844 })
        await page.goto('/en/blog')

        const card = page.locator('article').first()
        const title = card.locator('h2')
        await expect(title).toHaveText(longTitle)
        const cardBox = await card.boundingBox()
        const photo = await card.locator('img').first().boundingBox()
        if (!cardBox || !photo) throw new Error('featured card is not rendered')

        expect(cardBox.width).toBeLessThanOrEqual(width)
        expect(photo.width).toBeLessThanOrEqual(cardBox.width + 1)
        expect(Math.abs(photo.height - (photo.width * 9) / 16)).toBeLessThan(2)
        // The long word wraps inside the title instead of running past the card.
        const titleOverflow = await title.evaluate((el) => el.scrollWidth - el.clientWidth)
        expect(titleOverflow).toBeLessThanOrEqual(0)
      } finally {
        await updateOnServer('posts', postId, 'en', { title: TITLE })
      }
    })
  }
})
