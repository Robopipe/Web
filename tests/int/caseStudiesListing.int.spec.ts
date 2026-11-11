import fs from 'node:fs'
import path from 'node:path'

import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import config from '@/payload.config'
import type { CaseStudy } from '@/payload-types'
import { applySeoGeo } from '@/seed/seoGeo'

/**
 * Case studies page, round 3 of docs/specs/9-home-comments (7.1 to 7.3). Each test
 * starts from the production state before round 3: the AI hero image on the
 * featured case study and no result hidden on the listing. Needs a seeded local
 * database (pnpm seed). The last run leaves the target state.
 */

const COPY = path.resolve(process.cwd(), 'seed-assets/copy/seo-geo')
const listing = JSON.parse(fs.readFileSync(path.join(COPY, 'case-study-listing.json'), 'utf8')) as {
  heroImages: Record<string, { image: string }>
  hideInListing: Record<string, { value: string; label: string }[]>
}
const FEATURED = 'crocodille-line-quality'
const MG = 'mg-servis-packaging-checks'
const OLD_IMAGE = 'tablet-line.png'
const NEW_IMAGE = listing.heroImages[FEATURED]!.image

type Locale = 'cs' | 'en'

let payload: Payload
const ids: Record<string, number> = {}
const run = (dryRun = false) => applySeoGeo(payload, { status: 'published', dryRun })

const mediaId = async (filename: string) =>
  (
    await payload.find({
      collection: 'media',
      where: { filename: { equals: filename } },
      depth: 0,
      limit: 1,
    })
  ).docs[0]?.id
const idOf = (value: unknown): number | undefined =>
  typeof value === 'number' ? value : (value as { id?: number } | null)?.id
const latest = (slug: string, locale: Locale) =>
  payload.findByID({
    collection: 'case-studies',
    id: ids[slug]!,
    locale,
    draft: true,
    depth: 0,
    fallbackLocale: false,
  })
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

/** Production before round 3: the AI hero image, every result on the listing. */
const resetToProduction = async () => {
  const oldImage = await mediaId(OLD_IMAGE)
  expect(oldImage, `${OLD_IMAGE} must exist (pnpm seed)`).toBeDefined()
  await save(FEATURED, 'cs', { heroImage: oldImage })
  for (const slug of [FEATURED, MG]) {
    const rows = (await latest(slug, 'en')).metrics ?? []
    await save(slug, 'en', { metrics: rows.map((row) => ({ ...row, hideInListing: false })) })
  }
}

const hidden = async (slug: string, locale: Locale) =>
  ((await published(slug, locale)).metrics ?? [])
    .filter((row) => row.hideInListing)
    .map((row) => `${row.value} ${row.label}`)

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
  it('replaces the AI hero image and hides the 95% results from production state', async () => {
    await resetToProduction()
    const report = await run()
    expect(report.updated).toEqual(
      expect.arrayContaining([
        `case study ${FEATURED} (hero image)`,
        `case study ${FEATURED} (listing results)`,
        `case study ${MG} (listing results)`,
      ]),
    )

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

    // 7.2 and 7.3: only the 95% row is hidden, in both locales. The text stays.
    expect(await hidden(FEATURED, 'en')).toEqual(['95% detection precision'])
    expect(await hidden(FEATURED, 'cs')).toEqual(['95 % přesnost detekce'])
    expect(await hidden(MG, 'en')).toEqual(['95% detection precision'])
    expect(await hidden(MG, 'cs')).toEqual(['95 % přesnost detekce'])
    expect((await published(FEATURED, 'cs')).metrics).toHaveLength(3)
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

  it('keeps a result edited by hand', async () => {
    await resetToProduction()
    const rows = (await latest(MG, 'en')).metrics ?? []
    await save(MG, 'en', {
      metrics: rows.map((row) => (row.value === '95%' ? { ...row, value: '97%' } : row)),
    })
    const report = await run()
    expect(report.skipped).toContain(`case study ${MG} (listing results) changed by hand`)
    expect(await hidden(MG, 'en')).toEqual([])
    // Restore the known text for the next tests and the target state.
    const edited = (await latest(MG, 'en')).metrics ?? []
    await save(MG, 'en', {
      metrics: edited.map((row) => (row.value === '97%' ? { ...row, value: '95%' } : row)),
    })
  })
})
