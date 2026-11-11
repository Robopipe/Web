import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { afterAll, describe, expect, it } from 'vitest'

import {
  applyChange,
  applyChangeFile,
  type ChangeFile,
  getAt,
  listChangeFiles,
  parseChangeFile,
  parseContentArgs,
  sameValue,
} from '@/seed/contentChanges'
import type { SeoGeoClient } from '@/seed/remoteClient'

/**
 * Content change files of `pnpm content:apply` (issue #8, architecture chapter 9).
 * Uses an in-memory REST client. The run against the local web is described in
 * docs/specs/8-local-comments/implementation.md.
 */

type Doc = Record<string, unknown>
type Write = { op: string; target: string; locale?: string; data: Doc }

const home = (): Doc => ({
  id: 1,
  slug: 'home',
  _status: 'published',
  updatedAt: '2026-11-10T10:00:00.000Z',
  title: 'Domů',
  layout: [
    { id: 'hero1', blockType: 'hero', heading: 'Starý nadpis', image: 45 },
    { id: 'cta1', blockType: 'cta', heading: 'Ozvěte se' },
  ],
})

/** A fake Payload REST API: published and draft documents, a header global and media. */
const fakeRemote = ({
  pages = [home()],
  drafts = new Map<number, Doc>(),
  media = [{ id: 45, filename: 'old.jpg' }] as Doc[],
}: { pages?: Doc[]; drafts?: Map<number, Doc>; media?: Doc[] } = {}) => {
  const header: Doc = {
    updatedAt: '2026-11-01T00:00:00.000Z',
    navItems: [{ id: 'n1', link: { label: 'Ceník', type: 'internal', page: 2 } }],
  }
  const writes: Write[] = []
  const matches = (doc: Doc, where: Record<string, { equals: unknown }>) =>
    Object.entries(where).every(([k, v]) => doc[k] === v.equals)
  const client = {
    find: async ({ collection, where, draft }: Doc) => {
      const list = collection === 'media' ? media : pages
      const docs = list
        .filter((d) => matches(d, where as never))
        .map((d) => (draft && drafts.get(d.id as number)) || d)
      return { docs: structuredClone(docs) }
    },
    findGlobal: async () => structuredClone(header),
    create: async ({ collection, data, filePath }: Doc) => {
      const doc = {
        ...(data as Doc),
        id: 100 + media.length,
        filename: path.basename(String(filePath)),
      }
      media.push(doc)
      writes.push({ op: 'create', target: String(collection), data: doc })
      return doc
    },
    update: async ({ collection, id, locale, data }: Doc) => {
      writes.push({
        op: 'update',
        target: `${collection}/${id}`,
        locale: String(locale),
        data: data as Doc,
      })
      return data
    },
    updateGlobal: async ({ slug, locale, data }: Doc) => {
      writes.push({
        op: 'update',
        target: `globals/${slug}`,
        locale: String(locale),
        data: data as Doc,
      })
      return data
    },
  } as unknown as SeoGeoClient
  return { client, writes }
}

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'content-changes-'))
fs.mkdirSync(path.join(dir, 'media'))
fs.writeFileSync(path.join(dir, 'media', 'hero-linka.jpg'), 'jpg')
afterAll(() => fs.rmSync(dir, { recursive: true, force: true }))

const run = (client: SeoGeoClient, changes: ChangeFile['changes'], dryRun = false) =>
  applyChangeFile(client, { comment: 12, changes }, { dryRun, baseDir: dir })

const setHeading = (from: string, to: string) =>
  ({
    op: 'set',
    collection: 'pages',
    slug: 'home',
    locale: 'cs',
    path: 'layout.hero1.heading',
    from,
    to,
  }) as const

describe('path and value helpers', () => {
  it('follows row ids, not indexes, and compares values without key order', () => {
    expect(getAt(home(), 'layout.cta1.heading')).toBe('Ozvěte se')
    expect(getAt(home(), 'layout.missing.heading')).toBeUndefined()
    expect(sameValue({ a: 1, b: [1, { c: 2 }] }, { b: [1, { c: 2 }], a: 1 })).toBe(true)
    expect(sameValue({ a: 1 }, { a: 2 })).toBe(false)
    expect(sameValue(null, undefined)).toBe(true)
  })

  it('applyChange set: writes on a match, skips when done, conflicts otherwise', () => {
    const doc = home()
    expect(applyChange(doc, setHeading('Starý nadpis', 'Nový'))).toEqual({ outcome: 'applied' })
    expect(getAt(doc, 'layout.hero1.heading')).toBe('Nový')
    expect(applyChange(doc, setHeading('Starý nadpis', 'Nový'))).toEqual({ outcome: 'skipped' })
    const conflict = applyChange(doc, setHeading('Jiný', 'Třetí'))
    expect(conflict.outcome).toBe('conflict')
    expect(conflict.detail).toBe('from "Jiný", now "Nový", to "Třetí"')
  })
})

describe('applyChangeFile', () => {
  it('set: writes the whole top-level field once, with locale and published status', async () => {
    const { client, writes } = fakeRemote()
    const report = await run(client, [
      setHeading('Starý nadpis', 'Nový nadpis'),
      { ...setHeading('Ozvěte se', 'Napište nám'), path: 'layout.cta1.heading' },
    ])
    expect(report.applied).toHaveLength(2)
    expect(writes).toHaveLength(1)
    expect(writes[0]).toMatchObject({ op: 'update', target: 'pages/1', locale: 'cs' })
    expect(writes[0].data._status).toBe('published')
    expect((writes[0].data.layout as Doc[]).map((b) => b.heading)).toEqual([
      'Nový nadpis',
      'Napište nám',
    ])
  })

  it('set: a value already written is skipped and nothing is sent', async () => {
    const { client, writes } = fakeRemote()
    const report = await run(client, [setHeading('Něco', 'Starý nadpis')])
    expect(report).toEqual({
      applied: [],
      skipped: ['set pages/home cs layout.hero1.heading'],
      conflict: [],
    })
    expect(writes).toHaveLength(0)
  })

  it('a conflict anywhere in the file writes nothing from the file', async () => {
    const { client, writes } = fakeRemote()
    const report = await run(client, [
      setHeading('Starý nadpis', 'Nový nadpis'),
      { ...setHeading('Ruční změna v produkci', 'X'), path: 'layout.cta1.heading' },
    ])
    expect(report.applied).toHaveLength(1)
    expect(report.conflict).toEqual([
      'set pages/home cs layout.cta1.heading: from "Ruční změna v produkci", now "Ozvěte se", to "X"',
    ])
    expect(writes).toHaveLength(0)
  })

  it('insert adds a row after the given id once, remove deletes only a matching row', async () => {
    const { client, writes } = fakeRemote()
    const value = { id: 'new1', blockType: 'cta', heading: 'Nový blok' }
    const insert = {
      op: 'insert',
      collection: 'pages',
      slug: 'home',
      locale: 'cs',
      path: 'layout',
      after: 'hero1',
      value,
    } as const
    const remove = {
      op: 'remove',
      collection: 'pages',
      slug: 'home',
      locale: 'cs',
      path: 'layout.cta1',
      from: { id: 'cta1', blockType: 'cta', heading: 'Ozvěte se' },
    } as const
    const report = await run(client, [insert, remove])
    expect(report.applied).toHaveLength(2)
    expect((writes[0].data.layout as Doc[]).map((b) => b.id)).toEqual(['hero1', 'new1'])

    // Already there and already gone: skipped.
    const hero = (home().layout as Doc[])[0]
    const done = fakeRemote({ pages: [{ ...home(), layout: [hero, value] }] })
    expect(await run(done.client, [insert, remove])).toMatchObject({ applied: [], conflict: [] })
    expect(done.writes).toHaveLength(0)

    // A changed row is a conflict.
    const changed = await run(fakeRemote().client, [
      { ...remove, from: { ...remove.from, heading: 'X' } },
    ])
    expect(changed.conflict).toHaveLength(1)
  })

  it('upload: reuses media with the same filename, else uploads and fills $media', async () => {
    const upload = {
      op: 'upload',
      ref: 'hero-linka',
      file: 'media/hero-linka.jpg',
      alt: { cs: 'Kamera nad linkou', en: 'Camera above the line' },
    } as const
    const setImage = {
      ...setHeading('', ''),
      path: 'layout.hero1.image',
      from: 45,
      to: { $media: 'hero-linka' },
    }

    const fresh = fakeRemote()
    const report = await run(fresh.client, [upload, setImage])
    expect(report.applied).toEqual([
      'upload hero-linka (media/hero-linka.jpg)',
      'set pages/home cs layout.hero1.image',
    ])
    expect(fresh.writes.map((w) => `${w.op} ${w.target} ${w.locale ?? ''}`.trim())).toEqual([
      'create media',
      'update media/101 en',
      'update pages/1 cs',
    ])
    expect(fresh.writes[0].data).toMatchObject({
      alt: 'Kamera nad linkou',
      filename: 'hero-linka.jpg',
    })
    expect(fresh.writes[1].data).toEqual({ alt: 'Camera above the line' })
    expect((fresh.writes[2].data.layout as Doc[])[0].image).toBe(101)

    // Second run: the file exists as media 102 and the page already points at it.
    const again = fakeRemote({
      pages: [{ ...home(), layout: [{ ...(home().layout as Doc[])[0], image: 102 }] }],
      media: [{ id: 102, filename: 'hero-linka.jpg' }],
    })
    expect(await run(again.client, [upload, setImage])).toMatchObject({
      applied: [],
      conflict: [],
    })
    expect(again.writes).toHaveLength(0)
  })

  it('a newer draft is a conflict, so other work in progress is never published', async () => {
    const drafts = new Map([[1, { ...home(), updatedAt: '2026-11-11T08:00:00.000Z' }]])
    const { client, writes } = fakeRemote({ drafts })
    const report = await run(client, [setHeading('Starý nadpis', 'Nový')])
    expect(report.conflict).toEqual(['pages/home: rozpracovaný koncept v produkci'])
    expect(writes).toHaveLength(0)
  })

  it('--dry-run reports the plan and writes nothing', async () => {
    const { client, writes } = fakeRemote()
    const report = await run(
      client,
      [
        setHeading('Starý nadpis', 'Nový'),
        {
          op: 'set',
          global: 'header',
          locale: 'en',
          path: 'navItems.n1.link.label',
          from: 'Ceník',
          to: 'Prices',
        },
      ],
      true,
    )
    expect(report.applied).toEqual([
      'set pages/home cs layout.hero1.heading',
      'set globals/header en navItems.n1.link.label',
    ])
    expect(writes).toHaveLength(0)
  })

  it('a missing document is a conflict', async () => {
    const { client } = fakeRemote()
    const report = await run(client, [{ ...setHeading('a', 'b'), slug: 'neni' }])
    expect(report.conflict).toEqual(['set pages/neni cs layout.hero1.heading: document not found'])
  })
})

describe('change file and command line', () => {
  it('refuses a broken change file before any request', () => {
    expect(() => parseChangeFile({ comment: 1, changes: [] }, 'f.json')).toThrow(
      '"changes" is empty',
    )
    expect(() =>
      parseChangeFile(
        {
          comment: 1,
          changes: [{ op: 'set', collection: 'pages', locale: 'cs', path: 'a', from: 1, to: 2 }],
        },
        'f.json',
      ),
    ).toThrow('needs "slug" or "id"')
    expect(() =>
      parseChangeFile(
        {
          comment: 1,
          changes: [{ op: 'set', global: 'header', locale: 'de', path: 'a', from: 1, to: 2 }],
        },
        'f.json',
      ),
    ).toThrow('"locale" must be cs or en')
    expect(() =>
      parseChangeFile({ comment: 1, changes: [{ op: 'drop', global: 'header' }] }, 'f.json'),
    ).toThrow('unknown op "drop"')
  })

  it('lists change files by name', () => {
    const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'content-list-'))
    for (const name of ['0002-c5.json', '0001-c3.json', 'README.md']) {
      fs.writeFileSync(path.join(folder, name), '{}')
    }
    expect(listChangeFiles(folder).map((f) => path.basename(f))).toEqual([
      '0001-c3.json',
      '0002-c5.json',
    ])
    expect(listChangeFiles(path.join(folder, 'missing'))).toEqual([])
    fs.rmSync(folder, { recursive: true })
  })

  it('needs --remote and stops on an unknown argument', () => {
    expect(parseContentArgs(['--remote=http://127.0.0.1:3810'])).toEqual({
      remote: 'http://127.0.0.1:3810',
      dryRun: false,
    })
    expect(
      parseContentArgs(['--remote=https://robopipe.io', '--dry-run', '--file=a.json']),
    ).toEqual({
      remote: 'https://robopipe.io',
      dryRun: true,
      file: 'a.json',
    })
    expect(() => parseContentArgs(['--dry-run'])).toThrow('--remote is required.')
    expect(() => parseContentArgs(['--remote=https://robopipe.io', '--dryrun'])).toThrow(
      'Unknown argument "--dryrun"',
    )
  })
})
