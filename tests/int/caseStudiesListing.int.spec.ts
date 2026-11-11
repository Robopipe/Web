import fs from 'node:fs'
import path from 'node:path'

import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import config from '@/payload.config'
import type { CaseStudy } from '@/payload-types'
import { applySeoGeo, isUploadOf } from '@/seed/seoGeo'

/**
 * Case studies page, round 3 of docs/specs/9-home-comments (7.1) and the cleanup
 * after it. Each test starts from the production state before round 3: the AI
 * hero image on the featured case study. Needs a seeded local database (pnpm seed).
 * The last run leaves the target state.
 */

const COPY = path.resolve(process.cwd(), 'seed-assets/copy/seo-geo')
const listing = JSON.parse(fs.readFileSync(path.join(COPY, 'case-study-listing.json'), 'utf8')) as {
  heroImages: Record<string, { image: string }>
}
const FEATURED = 'crocodille-line-quality'
const MG = 'mg-servis-packaging-checks'
const OLD_IMAGE = 'tablet-line.png'
const NEW_IMAGE = listing.heroImages[FEATURED]!.image

type Locale = 'cs' | 'en'

let payload: Payload
const ids: Record<string, number> = {}
const run = (dryRun = false) => applySeoGeo(payload, { status: 'published', dryRun })

/** Payload may have renamed the upload (photo-1.jpg), depending on the media/ folder. */
const mediaId = async (filename: string) =>
  (
    await payload.find({
      collection: 'media',
      where: { filename: { like: path.parse(filename).name } },
      depth: 0,
      limit: 100,
    })
  ).docs.find((doc) => isUploadOf(filename, doc.filename))?.id
const idOf = (value: unknown): number | undefined =>
  typeof value === 'number' ? value : (value as { id?: number } | null)?.id
const published = (slug: string, locale: Locale) =>
  payload.findByID({ collection: 'case-studies', id: ids[slug]!, locale, depth: 0 })
const versions = async (slug: string) =>
  (
    await payload.findVersions({
      collection: 'case-studies',
      where: { parent: { equals: ids[slug]! } },
      limit: 1,
    })
  ).totalDocs
const save = (slug: string, locale: Locale, data: Partial<CaseStudy>) =>
  payload.update({
    collection: 'case-studies',
    id: ids[slug]!,
    locale,
    data: { ...data, _status: 'published' },
  })

/** Production before round 3: the AI hero image. */
const resetToProduction = async () => {
  const oldImage = await mediaId(OLD_IMAGE)
  expect(oldImage, `${OLD_IMAGE} must exist (pnpm seed)`).toBeDefined()
  await save(FEATURED, 'cs', { heroImage: oldImage })
}

beforeAll(async () => {
  payload = await getPayload({ config: await config })
  for (const slug of [FEATURED, MG]) {
    const found = await payload.find({
      collection: 'case-studies',
      where: { slug: { equals: slug } },
      locale: 'en',
      draft: true,
      depth: 0,
      limit: 1,
    })
    ids[slug] = found.docs[0]!.id
  }
})

afterAll(async () => {
  await resetToProduction()
  await run()
})

describe('case studies listing (round 3)', () => {
  it('replaces the AI hero image from production state', async () => {
    await resetToProduction()
    const report = await run()
    expect(report.updated).toContain(`case study ${FEATURED} (hero image)`)

    const featured = await published(FEATURED, 'cs')
    expect(idOf(featured.heroImage)).toBe(await mediaId(NEW_IMAGE))
    const image = await payload.findByID({ collection: 'media', id: idOf(featured.heroImage)! })
    expect(image.alt).toMatch(/bagetami/)
    const imageEn = await payload.findByID({
      collection: 'media',
      id: idOf(featured.heroImage)!,
      locale: 'en',
    })
    expect(imageEn.alt).toMatch(/baguettes/)
  })

  // Cleanup: Filip removed the 95% detection precision claim (11. 11.). The seed
  // and the script must not bring it back to a case study or its FAQs.
  it('has no 95% claim in the Crocodille and MG Servis case studies', async () => {
    await run()
    for (const slug of [FEATURED, MG]) {
      for (const locale of ['cs', 'en'] as const) {
        const study = await payload.findByID({
          collection: 'case-studies',
          id: ids[slug]!,
          locale,
          depth: 1,
        })
        expect(JSON.stringify(study), `${slug} (${locale})`).not.toMatch(/\b95\s?%/)
      }
    }
  })

  it('changes nothing on the second run', async () => {
    await run()
    const before = [await versions(FEATURED), await versions(MG)]
    const report = await run()
    expect(report.updated.filter((line) => line.startsWith('case study'))).toEqual([])
    expect([await versions(FEATURED), await versions(MG)]).toEqual(before)
  })

  it('keeps a hero image set by hand', async () => {
    await resetToProduction()
    const handImage = await mediaId('camera-line.jpeg')
    await save(FEATURED, 'cs', { heroImage: handImage })
    const report = await run()
    expect(report.skipped).toContain(`case study ${FEATURED} (hero image) changed by hand`)
    expect(idOf((await published(FEATURED, 'cs')).heroImage)).toBe(handImage)
  })
})
