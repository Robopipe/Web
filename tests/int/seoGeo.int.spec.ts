import { getPayload, Payload } from 'payload'
import config from '@/payload.config'

import { beforeAll, describe, expect, it } from 'vitest'

import { markdownToLexical } from '@/jobs/markdown'
import { applySeoGeo } from '@/seed/seoGeo'

/**
 * The SEO and GEO content script must be safe to run on production: twice in
 * a row it changes nothing, it keeps manual edits and draft mode leaves the
 * published version alone. Needs a seeded local database (pnpm seed).
 */

let payload: Payload
const STUDY_EN_SLUG = 'crocodille-line-quality'

const findStudy = async () => {
  const result = await payload.find({
    collection: 'case-studies',
    where: { slug: { equals: STUDY_EN_SLUG } },
    locale: 'en',
    limit: 1,
    depth: 0,
  })
  return result.docs[0]
}

const plain = (value: unknown) => JSON.stringify(value)

describe('applySeoGeo', () => {
  beforeAll(async () => {
    payload = await getPayload({ config: await config })
    // Bring the database to the full content state first.
    await applySeoGeo(payload, { status: 'published' })
  }, 120_000)

  it('creates nothing on a second run', async () => {
    const report = await applySeoGeo(payload, { status: 'published' })
    expect(report.created).toEqual([])
    expect(report.updated).toEqual([])
    const pages = await payload.find({
      collection: 'pages',
      where: { slug: { equals: 'kamerova-kontrola-kvality' } },
      locale: 'cs',
      draft: true,
      depth: 0,
    })
    expect(pages.totalDocs).toBe(1)
  }, 60_000)

  it('does not overwrite a field that has a value', async () => {
    const study = await findStudy()
    expect(study).toBeDefined()
    const manual = await markdownToLexical(payload.config, 'Ruční text editora.')
    await payload.update({
      collection: 'case-studies',
      id: study.id,
      locale: 'cs',
      data: { problem: manual, _status: 'published' },
    })

    await applySeoGeo(payload, { status: 'published' })

    const after = await payload.findByID({
      collection: 'case-studies',
      id: study.id,
      locale: 'cs',
      depth: 0,
    })
    expect(plain(after.problem)).toContain('Ruční text editora.')
    expect(plain(after.problem)).not.toContain('Crocodille')
  }, 60_000)

  it('in draft mode writes a draft and keeps the published version', async () => {
    const study = await findStudy()
    await payload.update({
      collection: 'case-studies',
      id: study.id,
      locale: 'cs',
      data: { problem: null, _status: 'published' },
    })

    const report = await applySeoGeo(payload, { status: 'draft' })
    expect(report.updated).toContain(`case study ${STUDY_EN_SLUG}`)

    const published = await payload.findByID({
      collection: 'case-studies',
      id: study.id,
      locale: 'cs',
      depth: 0,
    })
    expect(published.problem ?? null).toBeNull()
    const latest = await payload.findByID({
      collection: 'case-studies',
      id: study.id,
      locale: 'cs',
      draft: true,
      depth: 0,
    })
    expect(latest._status).toBe('draft')
    expect(plain(latest.problem)).toContain('Crocodille')

    // Publishing afterwards puts the draft live and restores the full state.
    await applySeoGeo(payload, { status: 'published' })
    const restored = await payload.findByID({
      collection: 'case-studies',
      id: study.id,
      locale: 'cs',
      depth: 0,
    })
    expect(plain(restored.problem)).toContain('Crocodille')
    expect(restored._status).toBe('published')
  }, 120_000)

  it('dry run plans without writing', async () => {
    const before = await payload.count({ collection: 'faqs' })
    const report = await applySeoGeo(payload, { status: 'published', dryRun: true })
    expect(report.created).toEqual([])
    expect((await payload.count({ collection: 'faqs' })).totalDocs).toBe(before.totalDocs)
  }, 60_000)
})
