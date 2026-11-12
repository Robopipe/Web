import type { MetadataRoute } from 'next'

import type { Locale } from '@/i18n/routing'
import { getIndexableDocs, latestUpdate } from '@/lib/indexable'
import { absoluteUrl, alternatesFor, sectionPaths } from '@/lib/paths'

export const revalidate = 600

type Entry = MetadataRoute.Sitemap[number]

/**
 * One entry per locale URL, each with hreflang alternates for its siblings and
 * x-default. `lastModified` gives the date per locale.
 */
const entriesFor = (
  paths: Partial<Record<Locale, string>>,
  lastModified: (locale: Locale) => string | undefined,
): Entry[] => {
  const urls = Object.fromEntries(
    Object.entries(paths).map(([loc, path]) => [loc, absoluteUrl(path as string)]),
  ) as Partial<Record<Locale, string>>
  const languages = alternatesFor(urls)
  return (Object.entries(urls) as [Locale, string][]).map(([locale, url]) => {
    const date = lastModified(locale)
    return { url, lastModified: date ? new Date(date) : undefined, alternates: { languages } }
  })
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const docs = await getIndexableDocs()
  return [
    // A section index changes with its newest document in that locale (issue #40).
    ...entriesFor(sectionPaths('/blog'), (locale) => latestUpdate(docs, 'posts', locale)),
    ...entriesFor(sectionPaths('/case-studies'), (locale) =>
      latestUpdate(docs, 'case-studies', locale),
    ),
    ...docs.flatMap((doc) =>
      entriesFor(
        Object.fromEntries(Object.entries(doc.locales).map(([loc, l]) => [loc, l?.path])),
        () => doc.updatedAt,
      ),
    ),
  ]
}
