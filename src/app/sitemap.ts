import type { MetadataRoute } from 'next'

import type { Locale } from '@/i18n/routing'
import { getIndexableDocs } from '@/lib/indexable'
import { absoluteUrl, alternatesFor, sectionPaths } from '@/lib/paths'

export const revalidate = 600

type Entry = MetadataRoute.Sitemap[number]

/** One entry per locale URL, each with hreflang alternates for its siblings and x-default. */
const entriesFor = (paths: Partial<Record<Locale, string>>, lastModified?: string): Entry[] => {
  const urls = Object.fromEntries(
    Object.entries(paths).map(([loc, path]) => [loc, absoluteUrl(path as string)]),
  ) as Partial<Record<Locale, string>>
  const languages = alternatesFor(urls)
  return Object.values(urls).map((url) => ({
    url: url as string,
    lastModified: lastModified ? new Date(lastModified) : undefined,
    alternates: { languages },
  }))
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const docs = await getIndexableDocs()
  return [
    // Section indexes have no document of their own.
    ...entriesFor(sectionPaths('/blog')),
    ...entriesFor(sectionPaths('/case-studies')),
    ...docs.flatMap((doc) =>
      entriesFor(
        Object.fromEntries(Object.entries(doc.locales).map(([loc, l]) => [loc, l?.path])),
        doc.updatedAt,
      ),
    ),
  ]
}
