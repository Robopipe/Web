import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import config from '@/payload.config'
import { applySeoGeo } from '@/seed/seoGeo'

/**
 * Tester edge case for round 3 of docs/specs/9-home-comments (test-report.md D2).
 * Needs a seeded local database after the content script ran once. The test
 * restores the target state.
 */

const FEATURED = 'crocodille-line-quality'

type Locale = 'cs' | 'en'

let payload: Payload
const ids: Record<string, number> = {}
const run = () => applySeoGeo(payload, { status: 'published', dryRun: false })

const latest = (slug: string, locale: Locale) =>
  payload.findByID({
    collection: 'case-studies',
    id: ids[slug]!,
    locale,
    draft: true,
    depth: 0,
    fallbackLocale: false,
  })

beforeAll(async () => {
  payload = await getPayload({ config: await config })
  const found = await payload.find({
    collection: 'case-studies',
    where: { slug: { equals: FEATURED } },
    locale: 'en',
    draft: true,
    depth: 0,
    limit: 1,
  })
  ids[FEATURED] = found.docs[0]!.id
  await run()
})

afterAll(async () => {
  await run()
})

describe('case studies listing edge cases (tester, round 3)', () => {
  // D2: the second run must say the new hero image is in place, not that someone
  // changed it by hand. Payload renames an upload when the file name is taken
  // (crocodille-camera-line-1.jpg), as with tablet-line-2.png in production.
  it('reports the new hero image as in place when Payload renamed the file', async () => {
    const featured = await latest(FEATURED, 'cs')
    const heroId =
      typeof featured.heroImage === 'number' ? featured.heroImage : featured.heroImage?.id
    const image = await payload.findByID({ collection: 'media', id: heroId!, depth: 0 })
    expect(image.filename).toMatch(/^crocodille-camera-line(-\d+)?\.jpg$/)
    const original = image.filename!
    await payload.db.updateOne({
      collection: 'media',
      id: heroId!,
      data: { filename: 'crocodille-camera-line-1.jpg' },
    })
    try {
      const report = await run()
      expect(report.skipped).toContain(`case study ${FEATURED} (hero image)`)
      expect(report.skipped).not.toContain(`case study ${FEATURED} (hero image) changed by hand`)
    } finally {
      await payload.db.updateOne({ collection: 'media', id: heroId!, data: { filename: original } })
    }
  })
})
