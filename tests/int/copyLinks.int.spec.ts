import fs from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

/**
 * The SEO and GEO copy (seed-assets/copy/seo-geo) links only to pages that
 * exist, uses every FAQ it defines and follows the text rules of issue #6.
 * No database needed.
 */

const COPY = path.resolve(process.cwd(), 'seed-assets/copy/seo-geo')
const read = (file: string) => fs.readFileSync(path.join(COPY, file), 'utf8')
const readJson = <T>(file: string): T => JSON.parse(read(file))

type Localized<T> = Record<'cs' | 'en', T>
const landing = readJson<{
  pages: ({ key: string; faqs: string[] } & Localized<{ slug: string }>)[]
}>('landing-pages.json').pages
const faqs = readJson<Record<string, Localized<{ q: string; a: string }>>>('faqs.json')
const caseStudies = readJson<Record<string, { faqs: string[] }>>('case-studies.json')
const existing = readJson<{ pricing: { faqs: string[] } }>('existing-pages.json')

/** Section routes and the fixed pages of the base seed. */
const SECTIONS = [
  '/cs',
  '/en',
  '/cs/cenik',
  '/en/pricing',
  '/cs/obory',
  '/en/industries',
  '/cs/kontakt',
  '/en/contact',
  '/cs/case-studies',
  '/en/case-studies',
]

/**
 * Blog posts the copy links to. All of them are published on robopipe.io
 * (checked through the public API on 10. 11. 2026).
 */
const POSTS = [
  '/cs/blog/co-je-vizualni-system-srozumitelny-pruvodce-strojovym-videnim-ve-vyrobe',
  '/en/blog/what-is-a-vision-system-a-plain-english-guide-to-machine-vision-in-manufacturing',
  '/cs/blog/trendy-v-kontrole-kvality-2026-co-se-na-vyrobnich-linkach-skutecne-meni',
  '/en/blog/quality-control-trends-in-2026-what-s-actually-changing-on-the-factory-floor',
  '/cs/blog/snizte-zmetkovitost',
  '/en/blog/cut-reject-rates',
]

const PAGES = landing.flatMap((page) => [`/cs/${page.cs.slug}`, `/en/${page.en.slug}`])
const ALLOWED = new Set([...SECTIONS, ...POSTS, ...PAGES])

const markdownFiles = fs.readdirSync(COPY).filter((file) => file.endsWith('.md'))
const sources: [string, string][] = [
  ...markdownFiles.map((file): [string, string] => [file, read(file)]),
  ...Object.entries(faqs).flatMap(([key, copy]): [string, string][] => [
    [`faqs.json ${key} cs`, copy.cs.a],
    [`faqs.json ${key} en`, copy.en.a],
  ]),
]

describe('seo-geo copy', () => {
  it('links only to seeded pages, sections and published posts', () => {
    const broken: string[] = []
    for (const [source, text] of sources) {
      for (const [, target] of text.matchAll(/\]\((\/[^)\s]*)\)/g)) {
        if (!ALLOWED.has(target)) broken.push(`${source}: ${target}`)
      }
    }
    expect(broken).toEqual([])
  })

  it('links a Czech page only from Czech copy and an English page from English copy', () => {
    for (const [source, text] of sources) {
      const english =
        source.endsWith(' en') || (source.endsWith('.md') && !source.endsWith('.cs.md'))
      for (const [, target] of text.matchAll(/\]\((\/[^)\s]*)\)/g)) {
        expect(target.startsWith(english ? '/en' : '/cs'), `${source}: ${target}`).toBe(true)
      }
    }
  })

  it('uses every FAQ in faqs.json and defines every FAQ it uses', () => {
    const used = new Set([
      ...landing.flatMap((page) => page.faqs),
      ...Object.values(caseStudies).flatMap((study) => study.faqs),
      ...existing.pricing.faqs,
    ])
    expect([...used].filter((key) => !faqs[key])).toEqual([])
    expect(Object.keys(faqs).filter((key) => !used.has(key))).toEqual([])
  })

  it('has no [ověřit] and keeps [doplnit Filip] on the about page only', () => {
    for (const [source, text] of sources) {
      expect(text, source).not.toContain('[ověřit]')
      if (!source.startsWith('landing-about')) expect(text, source).not.toContain('[doplnit Filip]')
    }
  })

  it('has no semicolons and no dashes as punctuation', () => {
    // existing-pages.json holds the current production heading on purpose (replaceIf).
    const files = fs
      .readdirSync(COPY)
      .filter((file) => /\.(md|json)$/.test(file) && file !== 'existing-pages.json')
    for (const file of files) expect(read(file), file).not.toMatch(/;| [—–] /)
  })

  it('names the best-before date variant on the label page (Filip, question 4)', () => {
    expect(read('landing-label-inspection.cs.md')).toContain('Čtení data spotřeby')
    expect(read('landing-label-inspection.md')).toContain('best-before date')
    expect(faqs['li-date'].cs.q).toContain('datum spotřeby')
  })
})
