import type { Metadata } from 'next'

import type { Locale } from '@/i18n/routing'
import { locales } from '@/i18n/routing'
import type { Media } from '@/payload-types'

import { pathFor, SERVER_URL, type PreviewCollection } from './paths'

type SeoGroup = {
  title?: string | null
  description?: string | null
  image?: (number | null) | Media
  noIndex?: boolean | null
}

type DocMetaInput = {
  title: string
  seo?: SeoGroup | null
  excerpt?: string | null
  collection: PreviewCollection
  locale: Locale
  /** Localized slugs per locale, from getLocalizedSlugs. */
  slugs: Partial<Record<Locale, string>>
  siteName?: string
}

export const ogImageUrl = (image?: (number | null) | Media): string | undefined => {
  if (!image || typeof image === 'number') return undefined
  const sized = image.sizes?.og?.url ?? image.url
  return sized ? `${SERVER_URL}${sized}` : undefined
}

/** Metadata with hreflang alternates pointing at each locale's own slug. */
export const buildMeta = ({
  title,
  seo,
  excerpt,
  collection,
  locale,
  slugs,
  siteName = 'Robopipe',
}: DocMetaInput): Metadata => {
  const metaTitle = seo?.title || (title.includes(siteName) ? title : `${title} — ${siteName}`)
  const description = seo?.description || excerpt || undefined
  const languages: Record<string, string> = {}
  for (const loc of locales) {
    const slug = slugs[loc]
    if (slug) languages[loc] = `${SERVER_URL}${pathFor(collection, slug, loc)}`
  }
  const canonicalSlug = slugs[locale]

  return {
    title: metaTitle,
    description,
    alternates: {
      ...(canonicalSlug
        ? { canonical: `${SERVER_URL}${pathFor(collection, canonicalSlug, locale)}` }
        : {}),
      languages,
    },
    openGraph: {
      title: metaTitle,
      description,
      siteName,
      locale,
      type: collection === 'posts' ? 'article' : 'website',
      images: ogImageUrl(seo?.image),
    },
    ...(seo?.noIndex ? { robots: { index: false, follow: false } } : {}),
  }
}
