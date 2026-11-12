import type { Locale } from '@/i18n/routing'
import { locales } from '@/i18n/routing'

import { pathFor, type PreviewCollection } from './paths'

/**
 * Public URLs of a document read with `locale: 'all'`. Pure functions with no
 * database access, so Payload hooks can use them without an import cycle.
 */
export type IndexableLocale = { path: string; title: string; description?: string }

export type IndexableDoc = {
  collection: PreviewCollection
  updatedAt: string
  locales: Partial<Record<Locale, IndexableLocale>>
}

type Localized<T> = Partial<Record<Locale, T | null>> | null | undefined

export type RawDoc = {
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

/** Newest `updatedAt` of the documents of a collection that exist in a locale (ISO dates sort as text). */
export const latestUpdate = (
  docs: IndexableDoc[],
  collection: PreviewCollection,
  locale: Locale,
): string | undefined =>
  docs
    .filter((doc) => doc.collection === collection && doc.locales[locale])
    .map((doc) => doc.updatedAt)
    .sort()
    .at(-1)
