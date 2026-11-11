import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import config from '@/payload.config'
import type { CaseStudy } from '@/payload-types'
import { applySeoGeo } from '@/seed/seoGeo'

/**
 * Tester edge cases for round 3 of docs/specs/9-home-comments (7.7, test-report.md
 * D1 and D2). Needs a seeded local database after the content script ran once.
 * Each test restores the target state.
 */

const FEATURED = 'crocodille-line-quality'
const MG = 'mg-servis-packaging-checks'

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
const save = (slug: string, locale: Locale, data: Partial<CaseStudy>) =>
  payload.update({
    collection: 'case-studies',
    id: ids[slug]!,
    locale,
    data: { ...data, _status: 'published' },
  })
const hidden = async (slug: string) =>
  ((await payload.findByID({ collection: 'case-studies', id: ids[slug]!, locale: 'en', depth: 0 }))
    .metrics ?? [])
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
  await run()
})

afterAll(async () => {
  await run()
})

describe('case studies listing edge cases (tester, round 3)', () => {
  // D1: Filip unticks "Show this result only on the detail page" after the first
  // run, so the card shows 95% again. The next run must keep his choice (7.7).
  it('keeps a result Filip put back on the listing by hand', async () => {
    const rows = (await latest(MG, 'en')).metrics ?? []
    await save(MG, 'en', { metrics: rows.map((row) => ({ ...row, hideInListing: false })) })
    expect(await hidden(MG)).toEqual([])

    const report = await run()
    expect(report.updated).not.toContain(`case study ${MG} (listing results)`)
    expect(await hidden(MG)).toEqual([])

    // Restore the target state for the other tests.
    const now = (await latest(MG, 'en')).metrics ?? []
    await save(MG, 'en', {
      metrics: now.map((row) => ({ ...row, hideInListing: row.value === '95%' })),
    })
  })

  it('keeps the other rows when Filip deleted the 95% row', async () => {
    const rows = (await latest(MG, 'en')).metrics ?? []
    const rowsCs = (await latest(MG, 'cs')).metrics ?? []
    const kept = rows.filter((row) => row.value !== '95%')
    await save(MG, 'en', { metrics: kept })
    const report = await run()
    expect(report.skipped).toContain(`case study ${MG} (listing results) changed by hand`)
    expect(((await latest(MG, 'en')).metrics ?? []).map((row) => row.value)).toEqual(
      kept.map((row) => row.value),
    )
    // Restore the deleted row in both locales.
    await save(MG, 'en', { metrics: rows })
    await save(MG, 'cs', { metrics: rowsCs })
  })

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
