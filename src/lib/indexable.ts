import type { Locale } from '@/i18n/routing'
import { locales } from '@/i18n/routing'

import { pathFor, type PreviewCollection } from './paths'
import { getPayloadClient } from './queries'

export type IndexableLocale = { path: string; title: string; description?: string }

export type IndexableDoc = {
  collection: PreviewCollection
  updatedAt: string
  locales: Partial<Record<Locale, IndexableLocale>>
}

type Localized<T> = Partial<Record<Locale, T | null>> | null | undefined

type RawDoc = {
  slug?: Localized<string>
  title?: Localized<string>
  excerpt?: Localized<string>
  seo?: {
    title?: Localized<string>
    description?: Localized<string>
    noIndex?: boolean | null
  } | null
  updatedAt: string
}

const COLLECTIONS: PreviewCollection[] = ['pages', 'case-studies', 'posts']

/**
 * Converts one document read with `locale: 'all'` into its public URLs.
 * Locales without a slug are left out, and so is a document with `seo.noIndex`.
 */
export const toIndexableDoc = (collection: PreviewCollection, doc: RawDoc): IndexableDoc | null => {
  if (doc.seo?.noIndex) return null
  const out: IndexableDoc['locales'] = {}
  for (const locale of locales) {
    const slug = doc.slug?.[locale]
    if (!slug) continue
    const description = doc.seo?.description?.[locale] || doc.excerpt?.[locale] || undefined
    out[locale] = {
      path: pathFor(collection, slug, locale),
      title: doc.title?.[locale] || slug,
      ...(description ? { description } : {}),
    }
  }
  return Object.keys(out).length ? { collection, updatedAt: doc.updatedAt, locales: out } : null
}

/**
 * Every published, indexable page, case study and post with its public URL per
 * locale. One source for the sitemap and /llms.txt, no hand-written URL lists.
 */
export const getIndexableDocs = async (): Promise<IndexableDoc[]> => {
  const payload = await getPayloadClient()
  const results = await Promise.all(
    COLLECTIONS.map(async (collection) => {
      const result = await payload.find({
        collection,
        locale: 'all',
        depth: 0,
        limit: 1000,
        pagination: false,
        sort: 'createdAt',
        // Without this the Local API skips access control and drafts get indexed.
        overrideAccess: false,
      })
      return result.docs
        .map((doc) => toIndexableDoc(collection, doc as unknown as RawDoc))
        .filter((doc): doc is IndexableDoc => doc !== null)
    }),
  )
  return results.flat()
}
