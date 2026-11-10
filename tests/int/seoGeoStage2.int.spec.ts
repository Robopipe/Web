import fs from 'node:fs'
import path from 'node:path'

import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { markdownToLexical } from '@/jobs/markdown'
import config from '@/payload.config'
import type { Footer, Page, Post } from '@/payload-types'
import { applySeoGeo, hasCopyMarkers } from '@/seed/seoGeo'

/**
 * Rules 1 to 9 of the stage 2 content script (docs/specs/6-seo-geo-stage2/
 * architecture.md, 6.6). Needs a seeded local database (pnpm seed). Every test
 * restores what it changes.
 */

const COPY = path.resolve(process.cwd(), 'seed-assets/copy/seo-geo')
const readJson = <T>(file: string): T => JSON.parse(fs.readFileSync(path.join(COPY, file), 'utf8'))
const existing = readJson<{
  pricing: { slug: string; faqs: string[] }
  guide: {
    slug: string
    heading: { replaceIf: string; value: string }
    seoTitle: { replaceIf: string; value: string }
    paragraph: string
  }
}>('existing-pages.json')
const settingsCopy = readJson<{ solutions: string[]; company: { legalName: string } }>(
  'settings.json',
)

let payload: Payload
const published = () => applySeoGeo(payload, { status: 'published' })

const findPage = async (slug: string, draft = true): Promise<Page | undefined> => {
  const found = await payload.find({
    collection: 'pages',
    where: { slug: { equals: slug } },
    locale: 'cs',
    draft,
    depth: 0,
    limit: 1,
    // Without a user, only published pages are visible: what a visitor gets.
    overrideAccess: draft,
  })
  return found.docs[0]
}
const latestPage = (id: number, locale: 'cs' | 'en' = 'cs') =>
  payload.findByID({ collection: 'pages', id, locale, draft: true, depth: 0 })
const footerIn = (locale: 'cs' | 'en') =>
  payload.findGlobal({ slug: 'footer', locale, depth: 0, fallbackLocale: false })

type LexicalNode = { type?: string; tag?: string; text?: string; children?: LexicalNode[] }
const plain = (node: LexicalNode): string => node.text ?? (node.children ?? []).map(plain).join('')
const nodesOf = (post: Post) => (post.content as unknown as { root: LexicalNode }).root.children!

describe('applySeoGeo, stage 2', () => {
  beforeAll(async () => {
    payload = await getPayload({ config: await config })
    await published()
  }, 180_000)

  it('hasCopyMarkers finds both markers anywhere in a document', () => {
    expect(hasCopyMarkers({ a: [{ text: 'x [doplnit Filip] y' }] })).toBe(true)
    expect(hasCopyMarkers({ text: '[ověřit]' })).toBe(true)
    expect(hasCopyMarkers({ text: 'doplnit Filip' })).toBe(false)
    expect(hasCopyMarkers(undefined)).toBe(false)
  })

  it('keeps a document with markers as a draft after --status=published', async () => {
    const about = (await findPage('o-nas'))!
    const before = await latestPage(about.id)
    // A marker in the copy, as before Filip answered.
    const hero = before.layout?.find((b) => b.blockType === 'hero')
    await payload.update({
      collection: 'pages',
      id: about.id,
      locale: 'cs',
      data: {
        layout: (before.layout ?? []).map((b) =>
          b.id === hero?.id ? { ...b, text: 'Text [doplnit Filip]' } : b,
        ),
        _status: 'draft',
      },
    })
    try {
      expect(await findPage('o-nas', false)).toBeUndefined()
      const report = await published()
      expect(report.skipped).toContain('draft (markers): page o-nas')
      expect((await latestPage(about.id))._status).toBe('draft')
      expect(await findPage('o-nas', false)).toBeUndefined()
    } finally {
      await payload.update({
        collection: 'pages',
        id: about.id,
        locale: 'cs',
        data: { layout: before.layout, _status: 'published' },
      })
    }
    // Without markers the script publishes it.
    expect(hasCopyMarkers(await latestPage(about.id))).toBe(false)
    expect(await findPage('o-nas', false)).toBeDefined()
  }, 60_000)

  it('creates and changes nothing on a second run', async () => {
    const report = await published()
    expect(report.created).toEqual([])
    expect(report.updated).toEqual([])
  }, 60_000)

  it('adds a missing block of an existing page at its place and keeps edited blocks', async () => {
    const page = (await findPage('kamerova-kontrola-kvality'))!
    const before = await latestPage(page.id)
    const tasksId = 'seo-geo-page-camera-quality-inspection-tasks'
    const heroId = 'seo-geo-page-camera-quality-inspection-hero'
    expect(before.layout?.some((b) => b.id === tasksId)).toBe(true)

    // As if stage 1 had run first: no tasks block, and an editor changed the hero.
    await payload.update({
      collection: 'pages',
      id: page.id,
      locale: 'cs',
      data: {
        layout: (before.layout ?? [])
          .filter((b) => b.id !== tasksId)
          .map((b) => (b.id === heroId ? { ...b, heading: 'Nadpis editora' } : b)),
        _status: 'published',
      },
    })

    const report = await published()
    expect(report.updated.some((line) => line.includes(tasksId))).toBe(true)
    const after = await latestPage(page.id)
    expect(after._status).toBe('published')
    const ids = (after.layout ?? []).map((b) => b.id)
    expect(ids.indexOf(tasksId)).toBe(
      ids.indexOf('seo-geo-page-camera-quality-inspection-content') + 1,
    )
    const hero = after.layout?.find((b) => b.id === heroId)
    expect(hero?.blockType === 'hero' && hero.heading).toBe('Nadpis editora')
    const en = await latestPage(page.id, 'en')
    expect(JSON.stringify(en.layout?.find((b) => b.id === tasksId))).toContain('by task')

    await payload.update({
      collection: 'pages',
      id: page.id,
      locale: 'cs',
      data: { layout: before.layout, _status: 'published' },
    })
  }, 120_000)

  it('removes the stage 1 Solutions column from the footer and keeps the others', async () => {
    const cs = await footerIn('cs')
    const columns = (cs.columns ?? []) as NonNullable<Footer['columns']>
    const enTitles = ((await footerIn('en')).columns ?? []).map((c) => c.title)
    await payload.updateGlobal({
      slug: 'footer',
      locale: 'cs',
      data: { columns: [...columns, { id: 'seo-geo-solutions', title: 'Řešení', links: [] }] },
    })
    const en = await footerIn('en')
    await payload.updateGlobal({
      slug: 'footer',
      locale: 'en',
      data: {
        columns: (en.columns ?? []).map((c) =>
          c.id === 'seo-geo-solutions' ? { ...c, title: 'Solutions' } : c,
        ),
      },
    })

    await published()
    expect(((await footerIn('cs')).columns ?? []).map((c) => c.id)).toEqual(
      columns.map((c) => c.id),
    )
    expect(((await footerIn('en')).columns ?? []).map((c) => c.title)).toEqual(enTitles)
  }, 60_000)

  it('links the about page in the footer only once it is published', async () => {
    const about = (await findPage('o-nas'))!
    const linksAbout = async (locale: 'cs' | 'en') =>
      ((await footerIn(locale)).columns ?? [])
        .flatMap((c) => c.links ?? [])
        .filter((item) => item.link.page === about.id)
    const withoutAbout = async () => {
      for (const locale of ['cs', 'en'] as const) {
        const footer = await footerIn(locale)
        await payload.updateGlobal({
          slug: 'footer',
          locale,
          data: {
            columns: (footer.columns ?? []).map((c) => ({
              ...c,
              links: (c.links ?? []).filter((item) => item.link.page !== about.id),
            })),
          },
        })
      }
    }

    // The page is published (no markers) and linked in both languages, once.
    expect((await linksAbout('cs')).map((item) => item.link.label)).toEqual(['O nás'])
    expect((await linksAbout('en')).map((item) => item.link.label)).toEqual(['About'])

    // As a draft, the page gets no link.
    await withoutAbout()
    await payload.update({
      collection: 'pages',
      id: about.id,
      locale: 'cs',
      data: { _status: 'draft' },
    })
    const hero = (await latestPage(about.id)).layout?.find((b) => b.blockType === 'hero')
    await payload.update({
      collection: 'pages',
      id: about.id,
      locale: 'cs',
      draft: true,
      data: {
        layout: (await latestPage(about.id)).layout?.map((b) =>
          b.id === hero?.id ? { ...b, text: 'Text [doplnit Filip]' } : b,
        ),
        _status: 'draft',
      },
    })
    try {
      await published()
      expect(await linksAbout('cs')).toHaveLength(0)
    } finally {
      await payload.update({
        collection: 'pages',
        id: about.id,
        locale: 'cs',
        data: {
          layout: (await latestPage(about.id)).layout?.map((b) =>
            hero && b.id === hero.id ? hero : b,
          ),
          _status: 'published',
        },
      })
    }
    await published()
    expect(await linksAbout('cs')).toHaveLength(1)
    await published()
    expect(await linksAbout('cs')).toHaveLength(1)
  }, 120_000)

  it('adds the pricing FAQs once', async () => {
    const pricing = (await findPage(existing.pricing.slug))!
    const faqIds = async () => {
      const page = await latestPage(pricing.id)
      const block = page.layout?.find((b) => b.blockType === 'faqAccordion')
      return block?.blockType === 'faqAccordion' ? (block.faqs ?? []) : []
    }
    await published()
    const ids = await faqIds()
    expect(new Set(ids).size).toBe(ids.length)
    for (const key of existing.pricing.faqs) {
      const q = readJson<Record<string, { cs: { q: string } }>>('faqs.json')[key].cs.q
      const found = await payload.find({
        collection: 'faqs',
        where: { question: { equals: q } },
        locale: 'cs',
        depth: 0,
      })
      expect(found.totalDocs, key).toBe(1)
      expect(ids, key).toContain(found.docs[0].id)
    }
    expect((await latestPage(pricing.id))._status).toBe('published')
  }, 60_000)

  describe('vision guide', () => {
    let guideId: number
    let original: Post | undefined

    const guideCs = () =>
      payload.findByID({ collection: 'posts', id: guideId, locale: 'cs', draft: true, depth: 0 })
    const setGuide = async (heading: string, seoTitle: string) => {
      const content = await markdownToLexical(
        payload.config,
        `Úvod.\n\n## ${heading}\n\nPrvní sekce.\n\n## Druhá sekce\n\nText.`,
      )
      await payload.update({
        collection: 'posts',
        id: guideId,
        locale: 'cs',
        data: { content, seo: { title: seoTitle }, _status: 'published' },
      })
    }

    beforeAll(async () => {
      const found = await payload.find({
        collection: 'posts',
        where: { slug: { equals: existing.guide.slug } },
        locale: 'cs',
        depth: 0,
        limit: 1,
      })
      original = found.docs[0]
      if (original) {
        guideId = original.id
      } else {
        const doc = await payload.create({
          collection: 'posts',
          locale: 'cs',
          data: {
            title: 'Průvodce (test)',
            slug: existing.guide.slug,
            content: await markdownToLexical(payload.config, 'Text.'),
            _status: 'published',
          },
        })
        guideId = doc.id
      }
    }, 60_000)

    afterAll(async () => {
      if (!original) {
        await payload.delete({ collection: 'posts', id: guideId })
        return
      }
      await payload.update({
        collection: 'posts',
        id: guideId,
        locale: 'cs',
        data: { content: original.content, seo: original.seo, _status: 'published' },
      })
    })

    it('changes the first H2 and seo.title only from their exact value, adds the paragraph once', async () => {
      await setGuide(existing.guide.heading.replaceIf, existing.guide.seoTitle.replaceIf)
      await published()
      let post = await guideCs()
      expect(post._status).toBe('published')
      let nodes = nodesOf(post)
      const h2s = nodes.filter((n) => n.tag === 'h2').map(plain)
      expect(h2s).toEqual([existing.guide.heading.value, 'Druhá sekce'])
      expect(post.seo?.title).toBe(existing.guide.seoTitle.value)
      // The paragraph is the last node of the first section.
      const second = nodes.findIndex((n) => plain(n) === 'Druhá sekce')
      expect(plain(nodes[second - 1])).toMatch(/^Česky se computer vision říká počítačové vidění/)

      const report = await published()
      expect(report.updated).toEqual([])
      nodes = nodesOf(await guideCs())
      expect(nodes.filter((n) => plain(n).startsWith('Česky se computer vision'))).toHaveLength(1)

      // An editor changed the heading and the title: both stay, the paragraph comes back.
      await setGuide('Nadpis editora', 'Titulek editora')
      await published()
      post = await guideCs()
      nodes = nodesOf(post)
      expect(nodes.filter((n) => n.tag === 'h2').map(plain)).toEqual([
        'Nadpis editora',
        'Druhá sekce',
      ])
      expect(post.seo?.title).toBe('Titulek editora')
      expect(nodes.filter((n) => plain(n).startsWith('Česky se computer vision'))).toHaveLength(1)
    }, 120_000)
  })

  it('reports a removed stage 1 page as obsolete and does not delete it', async () => {
    const doc = await payload.create({
      collection: 'pages',
      locale: 'cs',
      data: {
        title: 'Strojové vidění',
        slug: 'strojove-videni',
        layout: [{ blockType: 'content', content: await markdownToLexical(payload.config, 'X') }],
        _status: 'draft',
      },
      draft: true,
    })
    try {
      const report = await published()
      expect(report.skipped).toContain('obsolete: strojove-videni')
      expect(await findPage('strojove-videni')).toBeDefined()
    } finally {
      await payload.delete({ collection: 'pages', id: doc.id })
    }
  }, 60_000)

  it('writes solutions and company facts only while empty and never verification', async () => {
    const before = await payload.findGlobal({ slug: 'site-settings', locale: 'all', depth: 0 })
    const ids = await Promise.all(
      settingsCopy.solutions.map(async (key) => {
        const landing = readJson<{ pages: { key: string; cs: { slug: string } }[] }>(
          'landing-pages.json',
        ).pages.find((p) => p.key === key)!
        return (await findPage(landing.cs.slug))!.id
      }),
    )
    expect(before.solutions).toEqual(ids)
    expect(before.company?.legalName).toBe(settingsCopy.company.legalName)
    expect(before.verification?.bing || null).toBeNull()

    await payload.updateGlobal({
      slug: 'site-settings',
      data: { solutions: [ids[0]], company: { legalName: 'Jiná firma s.r.o.' } },
    })
    await published()
    let after = await payload.findGlobal({ slug: 'site-settings', depth: 0 })
    expect(after.solutions).toEqual([ids[0]])
    expect(after.company?.legalName).toBe('Jiná firma s.r.o.')

    // The value the migration copied from footer.copyright gets the register spelling.
    await payload.updateGlobal({
      slug: 'site-settings',
      data: { company: { legalName: 'Robopipe s.r.o.' } },
    })
    await published()
    after = await payload.findGlobal({ slug: 'site-settings', depth: 0 })
    expect(after.company?.legalName).toBe('robopipe s.r.o.')

    await payload.updateGlobal({
      slug: 'site-settings',
      data: { solutions: [], company: { legalName: null } },
    })
    await published()
    after = await payload.findGlobal({ slug: 'site-settings', depth: 0 })
    expect(after.solutions).toEqual(ids)
    expect(after.company?.legalName).toBe(settingsCopy.company.legalName)
    expect(after.verification?.bing || null).toBeNull()
    expect(after.verification?.seznam || null).toBeNull()
  }, 120_000)
})
