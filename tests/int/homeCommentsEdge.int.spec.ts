import fs from 'node:fs'
import path from 'node:path'

import { getPayload, type Payload } from 'payload'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'

import config from '@/payload.config'
import type { FeatureGridBlock, Page } from '@/payload-types'
import { getPageBySlug } from '@/lib/queries'
import { applySeoGeo } from '@/seed/seoGeo'

/**
 * Edge cases of the home page content script (#9) that homeComments.int.spec.ts does
 * not cover (docs/specs/9-home-comments/test-report.md). Each test starts from the
 * target state and changes one thing. afterEach puts the saved layouts back.
 * Needs a seeded local database (pnpm seed).
 */

const COPY = path.resolve(process.cwd(), 'seed-assets/copy/seo-geo')
const home = JSON.parse(fs.readFileSync(path.join(COPY, 'home.json'), 'utf8')) as {
  memberships: { blockName: string; heading: { cs: string; en: string } }
  solutions: { blockName: string }
  removeBlocks: string[]
  featureLinks: { block: string; feature: string; cs: string; en: string }[]
}
const [AA] = home.removeBlocks
const MEMBERSHIPS = home.memberships.blockName
const [LINK] = home.featureLinks

type Locale = 'cs' | 'en'
type Block = NonNullable<Page['layout']>[number]
const LOCALES: Locale[] = ['cs', 'en']

let payload: Payload
let homeId: number
const saved: Partial<Record<Locale, Block[]>> = {}
const run = () => applySeoGeo(payload, { status: 'published' })

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
const latest = (locale: Locale) =>
  payload.findByID({
    collection: 'pages',
    id: homeId,
    locale,
    draft: true,
    depth: 0,
    fallbackLocale: false,
  })
const save = (locale: Locale, layout: Block[]) =>
  payload.update({
    collection: 'pages',
    id: homeId,
    locale,
    data: { layout, _status: 'published' },
  })
const idOf = (value: unknown): number | undefined =>
  typeof value === 'number' ? value : (value as { id?: number } | null)?.id
const names = (layout: Page['layout']) => (layout ?? []).map((b) => b.blockName ?? b.id)
const cardOf = (layout: Page['layout']) =>
  (layout?.find((b) => b.id === LINK.block) as FeatureGridBlock).features.find(
    (f) => f.id === LINK.feature,
  )!
const withCardLink = (layout: Block[], link: { label: string | null; page: number | null }) =>
  layout.map((b) =>
    b.id === LINK.block && b.blockType === 'featureGrid'
      ? {
          ...b,
          features: b.features.map((f) =>
            f.id === LINK.feature
              ? { ...f, link: { ...f.link, type: 'internal' as const, ...link } }
              : f,
          ),
        }
      : b,
  )

describe('home page comments (#9), edge cases', () => {
  beforeAll(async () => {
    payload = await getPayload({ config: await config })
    await run()
    homeId = await pageId('home')
    for (const locale of LOCALES) saved[locale] = (await latest(locale)).layout ?? []
  }, 180_000)

  afterEach(async () => {
    for (const locale of LOCALES) await save(locale, saved[locale]!)
  }, 60_000)

  afterAll(async () => {
    await run()
  }, 120_000)

  it('keeps the target page of a link Filip set in one locale only', async () => {
    // Filip links the Czech card to the pricing page. The English label stays empty.
    const pricing = await pageId('cenik')
    await save('cs', withCardLink(saved.cs!, { label: 'Ceník od Filipa', page: pricing }))
    await save('en', withCardLink(saved.en!, { label: null, page: pricing }))

    await run()
    const cs = cardOf((await latest('cs')).layout).link!
    expect(cs.label).toBe('Ceník od Filipa')
    expect(idOf(cs.page)).toBe(pricing)
  }, 120_000)

  it('keeps the English card link empty when only the Czech label is set (C2)', async () => {
    const pricing = await pageId('cenik')
    await save('cs', withCardLink(saved.cs!, { label: 'Ceník od Filipa', page: pricing }))
    await save('en', withCardLink(saved.en!, { label: null, page: pricing }))

    const cs = await getPageBySlug('home', 'cs')
    const en = await getPageBySlug('home', 'en')
    expect(cardOf(cs!.layout).link?.label).toBe('Ceník od Filipa')
    expect(cardOf(en!.layout).link?.label ?? null).toBeNull()
    // The other English texts still fall back as before.
    expect(cardOf(en!.layout).title).toBeTruthy()
  }, 60_000)

  it('adds a missing memberships block right after the solutions, in both locales', async () => {
    for (const locale of LOCALES) {
      await save(
        locale,
        saved[locale]!.filter((b) => b.blockName !== MEMBERSHIPS),
      )
    }
    const report = await run()
    expect(report.skipped).not.toContain('home page')
    for (const locale of LOCALES) {
      const layout = (await latest(locale)).layout ?? []
      const at = layout.findIndex((b) => b.blockName === home.solutions.blockName)
      expect(names(layout)[at + 1]).toBe(MEMBERSHIPS)
      expect((layout[at + 1] as { heading?: string }).heading).toBe(
        home.memberships.heading[locale],
      )
    }
  }, 120_000)

  it('adds a missing memberships block after the testimonial when the order was changed by hand', async () => {
    for (const locale of LOCALES) {
      const layout = saved[locale]!.filter((b) => b.blockName !== MEMBERSHIPS)
      await save(locale, [...layout.slice(-1), ...layout.slice(0, -1)])
    }
    const report = await run()
    expect(report.skipped).toContain('home page (order changed by hand)')
    for (const locale of LOCALES) {
      const layout = (await latest(locale)).layout ?? []
      expect(layout[0]!.blockType).toBe('ctaBanner')
      const at = layout.findIndex((b) => b.blockType === 'testimonialBar')
      expect(names(layout)[at + 1]).toBe(MEMBERSHIPS)
    }
  }, 120_000)

  it('removes every copy of the auto annotation section', async () => {
    for (const locale of LOCALES) {
      const layout = [...saved[locale]!]
      const copy = (id: string): Block => ({
        id,
        blockType: 'processSteps',
        blockName: AA,
        heading: 'Automatická anotace',
        steps: ['Popište', 'Schvalte'].map((title, i) => ({ id: `${id}-step-${i}`, title })),
      })
      layout.splice(3, 0, copy(`${AA}-a`))
      layout.splice(layout.length - 1, 0, copy(`${AA}-b`))
      await save(locale, layout)
    }
    await run()
    for (const locale of LOCALES) {
      expect(names((await latest(locale)).layout)).not.toContain(AA)
    }
  }, 120_000)

  it('reports a missing card block and changes nothing else', async () => {
    for (const locale of LOCALES) {
      await save(
        locale,
        saved[locale]!.filter((b) => b.id !== LINK.block),
      )
    }
    const report = await run()
    expect(report.skipped).toContain(`home feature link ${LINK.feature} (not found)`)
    expect(report.updated).not.toContain('home page')
  }, 120_000)
})
