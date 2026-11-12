import type { CollectionAfterChangeHook, PayloadRequest } from 'payload'

import type { Locale } from '@/i18n/routing'
import {
  toIndexableDoc,
  type IndexableDoc,
  type IndexableLocale,
  type RawDoc,
} from '@/lib/indexableDoc'
import { loadIndexNowConfig, submitToIndexNow, type IndexNowConfig } from '@/lib/indexNow'
import { absoluteUrl, sectionPaths, type PreviewCollection } from '@/lib/paths'

/** A new or changed post or case study also changes its section index. */
const SECTIONS: Partial<Record<PreviewCollection, '/blog' | '/case-studies'>> = {
  posts: '/blog',
  'case-studies': '/case-studies',
}

/** Public URLs in every locale of a published document, plus its section index. */
export const indexNowUrls = (doc: IndexableDoc): string[] => {
  const section = SECTIONS[doc.collection]
  const entries = Object.entries(doc.locales) as [Locale, IndexableLocale][]
  return entries
    .flatMap(([locale, { path }]) => (section ? [path, sectionPaths(section)[locale]] : [path]))
    .map(absoluteUrl)
}

/**
 * The document in all locales, read in the transaction of the save (`req`).
 * The Local API writes the locale and depth of this call into `req`; they are
 * put back so the rest of the request keeps its own.
 */
const findInAllLocales = async (
  req: PayloadRequest,
  collection: PreviewCollection,
  id: number | string,
): Promise<RawDoc> => {
  const { locale, fallbackLocale } = req
  const depth = req.query?.depth
  try {
    const doc = await req.payload.findByID({ collection, id, locale: 'all', depth: 0, req })
    return doc as unknown as RawDoc
  } finally {
    req.locale = locale
    req.fallbackLocale = fallbackLocale
    if (req.query) req.query.depth = depth
  }
}

type Deps = {
  config?: (payload: PayloadRequest['payload']) => Promise<IndexNowConfig | null>
  submit?: typeof submitToIndexNow
}

/**
 * After a publish, tells Bing and Seznam about the document's URLs (issue #40).
 * Drafts, autosaves and `seo.noIndex` documents send nothing. Without a key
 * (site settings or INDEXNOW_KEY) or outside production it does nothing (see
 * loadIndexNowConfig).
 * The request runs in the background, so a slow search engine never delays
 * the save, and no error here can make the save fail.
 */
export const indexNowAfterChange =
  (
    collection: PreviewCollection,
    { config: getConfig = loadIndexNowConfig, submit = submitToIndexNow }: Deps = {},
  ): CollectionAfterChangeHook =>
  async ({ doc, req }) => {
    if ('_status' in doc && doc._status !== 'published') return doc

    try {
      const config = await getConfig(req.payload)
      if (!config) return doc

      // The saved doc has the slug of one locale only; the URLs need all of them.
      const indexable = toIndexableDoc(collection, await findInAllLocales(req, collection, doc.id))
      if (!indexable) return doc

      const urls = indexNowUrls(indexable)
      void submit(urls, { config }).then((results) => {
        for (const { endpoint, status, error } of results) {
          const message = `IndexNow ${endpoint}: ${status ?? error} for ${urls.length} URLs`
          if (status === 200 || status === 202) req.payload.logger.info(message)
          else req.payload.logger.warn(message)
        }
      })
    } catch (error) {
      req.payload.logger.warn(`IndexNow skipped for ${collection} ${doc.id}: ${String(error)}`)
    }
    return doc
  }
