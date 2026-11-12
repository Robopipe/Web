import { getPayloadClient } from './queries'
import { toIndexableDoc, type IndexableDoc, type RawDoc } from './indexableDoc'

export { latestUpdate, toIndexableDoc } from './indexableDoc'
export type { IndexableDoc, IndexableLocale } from './indexableDoc'

const COLLECTIONS = ['pages', 'case-studies', 'posts'] as const

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
