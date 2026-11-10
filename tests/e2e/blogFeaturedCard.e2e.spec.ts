import { test, expect } from '@playwright/test'
import { getPayload, Payload } from 'payload'
import sharp from 'sharp'

import config from '../../src/payload.config.js'
import { markdownToLexical } from '../../src/jobs/markdown'

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
  })

  test.afterAll(async () => {
    if (postId) await payload.delete({ collection: 'posts', id: postId })
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
})
