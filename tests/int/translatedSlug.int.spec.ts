import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { markdownToLexical } from '@/jobs/markdown'
import { getTranslatedSlug } from '@/lib/queries'
import config from '@/payload.config'

/**
 * Issue #53: a URL with the slug of the other locale (/en/cenik, /cs/blog/cut-reject-rates)
 * finds the document and its slug in the locale of the prefix.
 */

let payload: Payload
const created: { collection: 'pages' | 'posts'; id: number }[] = []
const stamp = Date.now()
const slug = (name: string) => `int-53-${name}-${stamp}`
const context = { skipRevalidate: true }

/** A published document with a slug in both locales. */
const createBoth = async (
  collection: 'pages' | 'posts',
  cs: string,
  en: string,
  status: 'published' | 'draft' = 'published',
) => {
  const content = await markdownToLexical(payload.config, 'Body text for the fixture.')
  const body =
    collection === 'posts' ? { content } : { layout: [{ blockType: 'content', content }] }
  const draft = status === 'draft'
  const doc = await payload.create({
    collection,
    locale: 'cs',
    draft,
    context,
    // One fixture for two collections: the union type of `data` does not narrow.
    data: { title: `Test ${cs}`, slug: cs, ...body, _status: status } as never,
  })
  await payload.update({
    collection,
    id: doc.id,
    locale: 'en',
    draft,
    context,
    data: { title: `Test ${en}`, slug: en, ...body, _status: status } as never,
  })
  created.push({ collection, id: doc.id })
}

beforeAll(async () => {
  payload = await getPayload({ config: await config })
  await createBoth('pages', slug('stranka'), slug('page'))
  await createBoth('posts', slug('clanek'), slug('post'))
  await createBoth('posts', slug('koncept'), slug('draft'), 'draft')
  // Only a Czech slug: the English page has no address to go to.
  const content = await markdownToLexical(payload.config, 'Body text for the fixture.')
  const csOnly = await payload.create({
    collection: 'pages',
    locale: 'cs',
    context,
    data: {
      title: 'Test jen česky',
      slug: slug('jen-cesky'),
      layout: [{ blockType: 'content', content }],
      _status: 'published',
    },
  })
  created.push({ collection: 'pages', id: csOnly.id })
})

afterAll(async () => {
  for (const { collection, id } of created) await payload.delete({ collection, id, context })
})

describe('getTranslatedSlug', () => {
  it('maps the slug of the other locale to the slug of the prefix, both ways', async () => {
    expect(await getTranslatedSlug('pages', slug('stranka'), 'en')).toBe(slug('page'))
    expect(await getTranslatedSlug('pages', slug('page'), 'cs')).toBe(slug('stranka'))
    expect(await getTranslatedSlug('posts', slug('clanek'), 'en')).toBe(slug('post'))
    expect(await getTranslatedSlug('posts', slug('post'), 'cs')).toBe(slug('clanek'))
  })

  it('gives null for an unknown slug and for the slug of the same locale', async () => {
    expect(await getTranslatedSlug('pages', slug('neexistuje'), 'en')).toBeNull()
    expect(await getTranslatedSlug('pages', slug('page'), 'en')).toBeNull()
  })

  it('keeps collections apart', async () => {
    expect(await getTranslatedSlug('posts', slug('stranka'), 'en')).toBeNull()
    expect(await getTranslatedSlug('pages', slug('clanek'), 'en')).toBeNull()
  })

  it('does not reveal a draft', async () => {
    expect(await getTranslatedSlug('posts', slug('koncept'), 'en')).toBeNull()
  })

  it('gives null when the document has no slug in the prefix locale', async () => {
    expect(await getTranslatedSlug('pages', slug('jen-cesky'), 'en')).toBeNull()
  })
})
