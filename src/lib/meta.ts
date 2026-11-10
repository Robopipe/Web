import type { Metadata } from 'next'

import type { Locale } from '@/i18n/routing'
import type { Media } from '@/payload-types'

import { absoluteUrl, alternatesFor } from './paths'

type MediaRef = (number | null) | Media | undefined

type SeoGroup = {
  title?: string | null
  description?: string | null
  image?: MediaRef
  noIndex?: boolean | null
}

type DocMetaInput = {
  title: string
  seo?: SeoGroup | null
  excerpt?: string | null
  locale: Locale
  /** Site path of this document per locale (from pathFor or localizedPaths). */
  paths: Partial<Record<Locale, string>>
  type?: 'website' | 'article'
  /** Document image used when seo.image is empty, e.g. the hero of a post or case study. */
  image?: MediaRef
  /** Last fallback, site-settings.defaultSeo.image. */
  fallbackImage?: MediaRef
  siteName?: string
}

const OG_LOCALE: Record<Locale, string> = { cs: 'cs_CZ', en: 'en_US' }

/** Open Graph needs an absolute URL. Media URLs from GCS already are one. */
export const ogImageUrl = (image?: MediaRef): string | undefined => {
  if (!image || typeof image === 'number') return undefined
  const sized = image.sizes?.og?.url ?? image.url
  if (!sized) return undefined
  return sized.startsWith('/') ? absoluteUrl(sized) : sized
}

/** Metadata with a self canonical, hreflang alternates (incl. x-default) and Open Graph. */
export const buildMeta = ({
  title,
  seo,
  excerpt,
  locale,
  paths,
  type = 'website',
  image,
  fallbackImage,
  siteName = 'Robopipe',
}: DocMetaInput): Metadata => {
  const metaTitle = seo?.title || (title.includes(siteName) ? title : `${title} | ${siteName}`)
  const description = seo?.description || excerpt || undefined
  const urls = Object.fromEntries(
    Object.entries(paths).map(([loc, path]) => [loc, absoluteUrl(path as string)]),
  ) as Partial<Record<Locale, string>>
  const canonical = urls[locale]
  const ogImage = ogImageUrl(seo?.image) ?? ogImageUrl(image) ?? ogImageUrl(fallbackImage)

  return {
    title: metaTitle,
    description,
    alternates: {
      ...(canonical ? { canonical } : {}),
      languages: alternatesFor(urls),
    },
    openGraph: {
      title: metaTitle,
      description,
      siteName,
      url: canonical,
      locale: OG_LOCALE[locale],
      alternateLocale: (Object.keys(urls) as Locale[])
        .filter((loc) => loc !== locale)
        .map((loc) => OG_LOCALE[loc]),
      type,
      images: ogImage,
    },
    ...(seo?.noIndex ? { robots: { index: false, follow: false } } : {}),
  }
}
