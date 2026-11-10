import { getPayload, Payload } from 'payload'
import config from '@/payload.config'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { markdownToLexical } from '@/jobs/markdown'
import { getIndexableDocs, toIndexableDoc } from '@/lib/indexable'

describe('toIndexableDoc', () => {
  it('skips locales without a slug and takes seo.description, then excerpt', () => {
    const doc = toIndexableDoc('case-studies', {
      slug: { cs: 'studie', en: null },
      title: { cs: 'Studie', en: 'Study' },
      excerpt: { cs: 'Perex' },
      seo: { description: { cs: null } },
      updatedAt: '2026-11-10T00:00:00.000Z',
    })
    expect(doc?.locales).toEqual({
      cs: { path: '/cs/case-studies/studie', title: 'Studie', description: 'Perex' },
    })
  })

  it('maps the home slug to the locale root and drops noIndex documents', () => {
    expect(
      toIndexableDoc('pages', { slug: { cs: 'home' }, title: { cs: 'Úvod' }, updatedAt: '' })
        ?.locales.cs?.path,
    ).toBe('/cs')
    expect(
      toIndexableDoc('pages', {
        slug: { cs: 'x' },
        title: { cs: 'X' },
        seo: { noIndex: true },
        updatedAt: '',
      }),
    ).toBeNull()
  })
})

let payload: Payload
const created: number[] = []
const SLUGS = {
  published: 'int-indexable-published',
  draft: 'int-indexable-draft',
  noIndex: 'int-indexable-noindex',
}

describe('getIndexableDocs', () => {
  beforeAll(async () => {
    payload = await getPayload({ config: await config })
    const content = await markdownToLexical(payload.config, 'Fixture page.')
    const make = async (slug: string, extra: Record<string, unknown>, draft = false) => {
      const doc = await payload.create({
        collection: 'pages',
        locale: 'cs',
        draft,
        data: { title: slug, slug, layout: [{ blockType: 'content', content }], ...extra },
      })
      created.push(doc.id)
    }
    await make(SLUGS.published, { _status: 'published' })
    await make(SLUGS.draft, { _status: 'draft' }, true)
    await make(SLUGS.noIndex, { _status: 'published', seo: { noIndex: true } })
  })

  afterAll(async () => {
    for (const id of created) await payload.delete({ collection: 'pages', id })
  })

  it('lists published pages and leaves out drafts and noIndex pages', async () => {
    const paths = (await getIndexableDocs()).flatMap((doc) =>
      Object.values(doc.locales).map((l) => l?.path),
    )
    expect(paths).toContain(`/cs/${SLUGS.published}`)
    expect(paths).not.toContain(`/cs/${SLUGS.draft}`)
    expect(paths).not.toContain(`/cs/${SLUGS.noIndex}`)
  })
})
