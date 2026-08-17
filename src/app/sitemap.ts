import type { MetadataRoute } from 'next'

import { locales } from '@/i18n/routing'
import { pathFor, SERVER_URL, type PreviewCollection } from '@/lib/paths'
import { getPayloadClient, getPosts } from '@/lib/queries'

type Entry = MetadataRoute.Sitemap[number]

/** One entry per locale-specific URL, each carrying hreflang alternates for its siblings. */
const entriesFor = (
  collection: PreviewCollection,
  slugs: Partial<Record<(typeof locales)[number], string>>,
  lastModified?: string | null,
): Entry[] => {
  const languages = Object.fromEntries(
    Object.entries(slugs).map(([loc, slug]) => [loc, `${SERVER_URL}${pathFor(collection, slug, loc)}`]),
  )
  return Object.entries(slugs).map(([loc, slug]) => ({
    url: `${SERVER_URL}${pathFor(collection, slug, loc)}`,
    lastModified: lastModified ? new Date(lastModified) : undefined,
    alternates: { languages },
  }))
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const payload = await getPayloadClient()
  const entries: Entry[] = []

  // Static section indexes
  for (const section of ['', '/blog', '/case-studies']) {
    const languages = Object.fromEntries(
      locales.map((loc) => [loc, `${SERVER_URL}/${loc}${section}`]),
    )
    for (const locale of locales) {
      entries.push({ url: `${SERVER_URL}/${locale}${section}`, alternates: { languages } })
    }
  }

  // Pages (all locales at once via locale: 'all')
  const pages = await payload.find({
    collection: 'pages',
    locale: 'all',
    limit: 500,
    depth: 0,
    select: { slug: true, updatedAt: true, seo: true },
    // Without this the Local API skips access control and drafts get indexed.
    overrideAccess: false,
  })
  for (const page of pages.docs) {
    const seo = page.seo as { noIndex?: boolean | null } | undefined
    if (seo?.noIndex) continue
    const slugs = (page.slug ?? {}) as Record<string, string>
    const filtered = Object.fromEntries(
      Object.entries(slugs).filter(([, value]) => value && value !== 'home'),
    )
    if (Object.keys(filtered).length) entries.push(...entriesFor('pages', filtered, page.updatedAt))
  }

  // Posts — per-locale queries already exclude untranslated docs.
  // Case studies are listing-only (no detail pages), so only /case-studies is indexed.
  const byId = new Map<number, { slugs: Record<string, string>; updatedAt: string }>()
  for (const locale of locales) {
    const result = await getPosts(locale, { limit: 500 })
    for (const doc of result.docs) {
      if (!doc.slug) continue
      const entry = byId.get(doc.id) ?? { slugs: {}, updatedAt: doc.updatedAt }
      entry.slugs[locale] = doc.slug
      byId.set(doc.id, entry)
    }
  }
  for (const { slugs, updatedAt } of byId.values()) {
    entries.push(...entriesFor('posts', slugs, updatedAt))
  }

  return entries
}
