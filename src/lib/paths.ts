import { locales, type Locale } from '@/i18n/routing'

export type PreviewCollection = 'pages' | 'posts' | 'case-studies'

/**
 * Frontend path for a document. Section segments (/blog, /case-studies) are constant
 * across locales; only document slugs are localized. The homepage uses the reserved slug "home".
 */
export const pathFor = (collection: PreviewCollection, slug: string, locale: string): string => {
  switch (collection) {
    case 'pages':
      return slug === 'home' ? `/${locale}` : `/${locale}/${slug}`
    case 'posts':
      return `/${locale}/blog/${slug}`
    case 'case-studies':
      return `/${locale}/case-studies/${slug}`
  }
}

// Production sets NEXT_PUBLIC_SERVER_URL explicitly; Vercel preview deployments
// fall back to the stable branch alias exposed by the system env vars.
const vercelUrl =
  process.env.NEXT_PUBLIC_VERCEL_BRANCH_URL || process.env.NEXT_PUBLIC_VERCEL_URL

export const SERVER_URL =
  process.env.NEXT_PUBLIC_SERVER_URL ||
  (vercelUrl ? `https://${vercelUrl}` : 'http://localhost:3000')

/** Absolute URL for a site path such as `/cs/blog`. */
export const absoluteUrl = (path: string): string => `${SERVER_URL}${path}`

/** Frontend path per locale for a document's localized slugs. */
export const localizedPaths = (
  collection: PreviewCollection,
  slugs: Partial<Record<Locale, string>>,
): Partial<Record<Locale, string>> =>
  Object.fromEntries(
    Object.entries(slugs)
      .filter(([, slug]) => !!slug)
      .map(([loc, slug]) => [loc, pathFor(collection, slug as string, loc)]),
  )

/** Path per locale of a section index such as `/blog` (same segment in every locale). */
export const sectionPaths = (section: '/blog' | '/case-studies'): Record<Locale, string> =>
  Object.fromEntries(locales.map((loc) => [loc, `/${loc}${section}`])) as Record<Locale, string>

/**
 * hreflang map for one document. `x-default` is the English URL, never `/`:
 * the root only redirects, and a hreflang target must answer 200. Without an
 * English version there is no `x-default`.
 */
export const alternatesFor = (
  urlsByLocale: Partial<Record<Locale, string>>, // absolute URLs
): Record<string, string> => ({
  ...urlsByLocale,
  ...(urlsByLocale.en ? { 'x-default': urlsByLocale.en } : {}),
})
