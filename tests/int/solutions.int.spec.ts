import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import config from '@/payload.config'
import { getPricing, getSolutionPages, solutionPagesFrom } from '@/lib/queries'
import { applySeoGeo } from '@/seed/seoGeo'
import type { Media, Page } from '@/payload-types'

/**
 * site-settings.solutions feeds the footer column, the card blocks and the use
 * cases listing (docs/specs/6-seo-geo-stage2/architecture.md, 6.1 and 6.2).
 * The Payload tests need a seeded local database (pnpm seed).
 */

const media = (id: number) => ({ id, url: `/m/${id}.jpg` }) as Media
const doc = (id: number, slug: string | null, extra: Partial<Page> = {}) =>
  ({ id, title: `Page ${id}`, slug, seo: {}, layout: [], ...extra }) as Page

describe('solutionPagesFrom', () => {
  it('keeps the order of site-settings and leaves out pages without a slug', () => {
    const docs = [doc(1, 'a'), doc(2, null), doc(3, 'c')]
    const pages = solutionPagesFrom([3, 2, 1, 4], docs, 'cs')
    expect(pages.map((p) => p.path)).toEqual(['/cs/c', '/cs/a'])
  })

  it('uses seo.image first, then the hero image, and seo.description', () => {
    const hero = { blockType: 'hero', heading: 'H', image: media(7) } as NonNullable<
      Page['layout']
    >[number]
    const [withHero] = solutionPagesFrom(
      [1],
      [doc(1, 'a', { layout: [hero], seo: { description: 'Popis' } })],
      'en',
    )
    expect(withHero).toMatchObject({ path: '/en/a', description: 'Popis', image: { id: 7 } })
    const [withSeo] = solutionPagesFrom(
      [1],
      [doc(1, 'a', { layout: [hero], seo: { image: media(9) } })],
      'en',
    )
    expect(withSeo.image?.id).toBe(9)
    expect(withSeo.description).toBeNull()
  })
})

describe('getSolutionPages and getPricing with Payload', () => {
  let payload: Payload
  let saved: number[] = []

  const pageId = async (slug: string) => {
    const found = await payload.find({
      collection: 'pages',
      where: { slug: { equals: slug } },
      locale: 'cs',
      draft: true,
      depth: 0,
      limit: 1,
    })
    return found.docs[0].id
  }

  beforeAll(async () => {
    payload = await getPayload({ config: await config })
    await applySeoGeo(payload, { status: 'published' })
    const settings = await payload.findGlobal({ slug: 'site-settings', depth: 0 })
    saved = (settings.solutions ?? []) as number[]
  }, 120_000)

  afterAll(async () => {
    await payload.updateGlobal({ slug: 'site-settings', data: { solutions: saved } })
  })

  it('lists published pages in the settings order and leaves out drafts', async () => {
    const draft = await payload.create({
      collection: 'pages',
      locale: 'cs',
      draft: true,
      data: { title: 'Koncept', slug: 'test-koncept-reseni', layout: [], _status: 'draft' },
    })
    const labels = await pageId('kontrola-etiket')
    const camera = await pageId('kamerova-kontrola-kvality')
    await payload.updateGlobal({
      slug: 'site-settings',
      data: { solutions: [labels, draft.id, camera] },
    })
    const cs = await getSolutionPages('cs').finally(() =>
      payload.delete({ collection: 'pages', id: draft.id }),
    )
    expect(cs.map((p) => p.path)).toEqual(['/cs/kontrola-etiket', '/cs/kamerova-kontrola-kvality'])
    expect(cs[0].description).toBeTruthy()
    expect(cs[0].image).toBeTruthy()
    const en = await getSolutionPages('en')
    expect(en.map((p) => p.path)).toEqual(['/en/label-inspection', '/en/camera-quality-inspection'])
  }, 60_000)

  it('is empty without solutions', async () => {
    await payload.updateGlobal({ slug: 'site-settings', data: { solutions: [] } })
    expect(await getSolutionPages('cs')).toEqual([])
  })

  it('getPricing skips the pricing block that only shows the pricing page tiers', async () => {
    const camera = await payload.findByID({
      collection: 'pages',
      id: await pageId('kamerova-kontrola-kvality'),
      depth: 0,
    })
    const block = camera.layout?.find((b) => b.blockType === 'pricingTable')
    expect(block).toMatchObject({ source: 'pricingPage' })
    for (const locale of ['cs', 'en'] as const) {
      const pricing = await getPricing(locale)
      expect(pricing?.path).toBe(locale === 'cs' ? '/cs/cenik' : '/en/pricing')
      expect(pricing?.tiers?.length).toBeGreaterThan(0)
    }
  })
})
