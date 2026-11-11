import fs from 'node:fs'
import path from 'node:path'

import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import config from '@/payload.config'
import type { FeatureGridBlock, Page } from '@/payload-types'
import { applySeoGeo } from '@/seed/seoGeo'

/**
 * Home page comments of 11. 11. 2026 (docs/specs/9-home-comments). Each test starts
 * from the production state after #6: memberships right after the customer logos,
 * the auto annotation section before the testimonial, no card link, no card image.
 * Round 2 tests also start from the state after round 1 and from the target state.
 * Needs a seeded local database (pnpm seed). The last run leaves the target state.
 */

const COPY = path.resolve(process.cwd(), 'seed-assets/copy/seo-geo')
const home = JSON.parse(fs.readFileSync(path.join(COPY, 'home.json'), 'utf8')) as {
  memberships: { blockName: string }
  solutions: { blockName: string }
  removeBlocks: string[]
  featureLinks: { block: string; feature: string; cs: string; en: string }[]
}
const [AA] = home.removeBlocks
const MEMBERSHIPS = home.memberships.blockName
const SOLUTIONS = home.solutions.blockName
const [LINK] = home.featureLinks
const CARD_IMAGE = 'label-inspection-card.jpg'

type Locale = 'cs' | 'en'
type Block = NonNullable<Page['layout']>[number]

let payload: Payload
let homeId: number
let labelId: number
const run = (dryRun = false) => applySeoGeo(payload, { status: 'published', dryRun })

const pageId = async (slug: string) =>
  (
    await payload.find({
      collection: 'pages',
      where: { slug: { equals: slug } },
      locale: 'cs',
      draft: true,
      depth: 0,
      limit: 1,
    })
  ).docs[0]!.id
const latest = (id: number, locale: Locale) =>
  payload.findByID({ collection: 'pages', id, locale, draft: true, depth: 0 })
const versions = async (id: number) =>
  (await payload.findVersions({ collection: 'pages', where: { parent: { equals: id } }, limit: 1 }))
    .totalDocs
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
const names = (layout: Page['layout']) => (layout ?? []).map((b) => b.blockName ?? b.id)
/** A block by its blockName (blocks the script adds), else by its blockType. */
const keys = (layout: Page['layout']) => (layout ?? []).map((b) => b.blockName ?? b.blockType)

/** Production after #6 (architecture 1), without the auto annotation section. */
const AFTER_STAGE2 = [
  'hero',
  'logoCloud',
  MEMBERSHIPS,
  'featureGrid',
  'industryCards',
  SOLUTIONS,
  'processSteps',
  'testimonialBar',
  'splitSection',
  'ctaBanner',
]
/** After #9 round 1: memberships after the testimonial. */
const AFTER_ROUND1 = [
  'hero',
  'logoCloud',
  'featureGrid',
  'industryCards',
  SOLUTIONS,
  'processSteps',
  'testimonialBar',
  MEMBERSHIPS,
  'splitSection',
  'ctaBanner',
]
/** Round 2 (product 6.1): no two card grids follow each other. */
const TARGET = [
  'hero',
  'logoCloud',
  'featureGrid',
  'processSteps',
  'industryCards',
  'testimonialBar',
  SOLUTIONS,
  MEMBERSHIPS,
  'splitSection',
  'ctaBanner',
]
const inOrder = (layout: Block[], order: string[]) =>
  order.map((key) => layout.find((b) => (b.blockName ?? b.blockType) === key)!)

/** Saves the home page in this block order, in both locales, published. */
const saveOrder = async (order: string[]) => {
  for (const locale of ['cs', 'en'] as const) {
    const layout = (await latest(homeId, locale)).layout ?? []
    await payload.update({
      collection: 'pages',
      id: homeId,
      locale,
      data: { layout: inOrder(layout, order), _status: 'published' },
    })
  }
}
const cardOf = (layout: Page['layout']) =>
  (layout?.find((b) => b.id === LINK.block) as FeatureGridBlock).features.find(
    (f) => f.id === LINK.feature,
  )!
const withCardLink = (layout: Block[], label: string | null): Block[] =>
  layout.map((b) =>
    b.id === LINK.block && b.blockType === 'featureGrid'
      ? {
          ...b,
          features: b.features.map((f) =>
            f.id === LINK.feature ? { ...f, link: { ...f.link, label, page: null } } : f,
          ),
        }
      : b,
  )

/** Production state after #6 (architecture 1), saved and published in both locales. */
const stateAfterStage2 = async () => {
  for (const locale of ['cs', 'en'] as const) {
    const layout = (await latest(homeId, locale)).layout ?? []
    const rest = inOrder(layout, AFTER_STAGE2)
    rest.splice(
      rest.findIndex((b) => b.blockType === 'testimonialBar'),
      0,
      {
        id: AA,
        blockType: 'processSteps',
        blockName: AA,
        heading: locale === 'cs' ? 'Automatická anotace: rámečky navrhne AI' : 'Auto annotation',
        steps: (locale === 'cs' ? ['Popište', 'Schvalte'] : ['Describe', 'Approve']).map(
          (title, i) => ({ id: `home-${AA}-step-${i}`, title }),
        ),
      },
    )
    await payload.update({
      collection: 'pages',
      id: homeId,
      locale,
      data: { layout: withCardLink(rest, null), _status: 'published' },
    })
  }
  await setCardImage(null)
}
const setCardImage = async (image: number | null) => {
  const seo = (await latest(labelId, 'cs')).seo
  await payload.update({
    collection: 'pages',
    id: labelId,
    locale: 'cs',
    data: { seo: { ...seo, image }, _status: 'published' },
  })
}

describe('home page comments (#9)', () => {
  beforeAll(async () => {
    payload = await getPayload({ config: await config })
    await run()
    homeId = await pageId('home')
    labelId = await pageId('kontrola-etiket')
  }, 180_000)

  afterAll(async () => {
    await run()
  }, 120_000)

  it('reorders the page, removes the auto annotation section, adds the link and the card image', async () => {
    await stateAfterStage2()
    const report = await run()
    expect(report.updated).toEqual(
      expect.arrayContaining([
        `home page (removed block ${AA})`,
        'home page (order)',
        `home page (feature link ${LINK.feature})`,
        'page kontrola-etiket (card image)',
        'home page published',
      ]),
    )
    for (const locale of ['cs', 'en'] as const) {
      const layout = (await latest(homeId, locale)).layout
      expect(keys(layout)).toEqual(TARGET)
      const link = cardOf(layout).link!
      expect(link.label).toBe(LINK[locale])
      expect(link.type).toBe('internal')
      expect(idOf(link.page)).toBe(await pageId('automaticka-anotace'))
    }
    // The memberships heading moved with the block, in both locales.
    const csBlock = (await latest(homeId, 'cs')).layout!.find((b) => b.blockName === MEMBERSHIPS)
    const enBlock = (await latest(homeId, 'en')).layout!.find((b) => b.blockName === MEMBERSHIPS)
    expect((csBlock as { heading?: string }).heading).toBe('Jsme součástí')
    expect((enBlock as { heading?: string }).heading).toBe('Part of')
    expect(idOf((await latest(labelId, 'cs')).seo?.image)).toBe(await mediaId(CARD_IMAGE))

    const second = await run()
    expect(second.created).toEqual([])
    expect(second.updated).toEqual([])
    expect(second.skipped).toEqual(
      expect.arrayContaining([
        'home page (order)',
        `home feature link ${LINK.feature} (set)`,
      ]),
    )
  }, 120_000)

  it('keeps a hand-moved memberships block, a link label set by Filip and another card image', async () => {
    await stateAfterStage2()
    const other = (await mediaId('camera-front.png'))!
    await setCardImage(other)
    for (const locale of ['cs', 'en'] as const) {
      const layout = (await latest(homeId, locale)).layout ?? []
      const memberships = layout.find((b) => b.blockName === MEMBERSHIPS)!
      // Filip moved the block before the CTA and wrote his own Czech label.
      const moved = layout.filter((b) => b.blockName !== MEMBERSHIPS)
      moved.splice(moved.length - 1, 0, memberships)
      await payload.update({
        collection: 'pages',
        id: homeId,
        locale,
        data: {
          layout: withCardLink(moved, locale === 'cs' ? 'Anotace od Filipa' : null),
          _status: 'published',
        },
      })
    }

    const report = await run()
    expect(report.skipped).toContain('home page (order changed by hand)')
    expect(report.updated).not.toContain('page kontrola-etiket (card image)')
    const cs = (await latest(homeId, 'cs')).layout
    const en = (await latest(homeId, 'en')).layout
    // Not a known state: the whole order stays, only the auto annotation section goes.
    const handMoved = AFTER_STAGE2.filter((key) => key !== MEMBERSHIPS)
    handMoved.splice(handMoved.length - 1, 0, MEMBERSHIPS)
    expect(keys(cs)).toEqual(handMoved)
    expect(keys(en)).toEqual(handMoved)
    expect(cardOf(cs).link?.label).toBe('Anotace od Filipa')
    expect(cardOf(en).link?.label).toBe(LINK.en)
    expect(idOf((await latest(labelId, 'cs')).seo?.image)).toBe(other)
  }, 120_000)

  it('reorders the state after round 1 in one run, and the second run changes nothing', async () => {
    await saveOrder(AFTER_ROUND1)
    const report = await run()
    expect(report.updated).toEqual(expect.arrayContaining(['home page (order)', 'home page']))
    for (const locale of ['cs', 'en'] as const) {
      expect(keys((await latest(homeId, locale)).layout)).toEqual(TARGET)
    }
    const before = await versions(homeId)
    const second = await run()
    expect(second.updated).toEqual([])
    expect(second.skipped).toContain('home page (order)')
    expect(await versions(homeId)).toBe(before)
  }, 120_000)

  it('keeps an order Filip changed by hand in the target state', async () => {
    // Filip puts the customer story right after the dark section with the numbers.
    const byHand = TARGET.filter((key) => key !== 'testimonialBar')
    byHand.splice(byHand.indexOf('processSteps') + 1, 0, 'testimonialBar')
    await saveOrder(byHand)
    const report = await run()
    expect(report.skipped).toContain('home page (order changed by hand)')
    expect(report.updated).not.toContain('home page')
    for (const locale of ['cs', 'en'] as const) {
      expect(keys((await latest(homeId, locale)).layout)).toEqual(byHand)
    }
  }, 120_000)

  it('writes nothing in a dry run and plans the same changes as a real run', async () => {
    await stateAfterStage2()
    const before = { home: await versions(homeId), label: await versions(labelId) }
    const plan = await run(true)
    expect({ home: await versions(homeId), label: await versions(labelId) }).toEqual(before)
    expect(names((await latest(homeId, 'cs')).layout)).toContain(AA)
    const real = await run()
    const sorted = (lines: string[]) => [...lines].sort()
    expect(sorted(plan.updated)).toEqual(sorted(real.updated))
    expect(sorted(plan.created)).toEqual(sorted(real.created))
  }, 120_000)
})
