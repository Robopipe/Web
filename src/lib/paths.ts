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

/** Slugs of the privacy policy page, which the cookie banner links to. */
export const PRIVACY_SLUGS: Record<Locale, string> = {
  cs: 'ochrana-osobnich-udaju',
  en: 'privacy-policy',
}

export const privacyPath = (locale: Locale): string =>
  pathFor('pages', PRIVACY_SLUGS[locale], locale)

/** Path per locale of a section index such as `/blog` (same segment in every locale). */
export const sectionPaths = (section: '/blog' | '/case-studies'): Record<Locale, string> =>
  Object.fromEntries(locales.map((loc) => [loc, `/${loc}${section}`])) as Record<Locale, string>

/** Paths of one page per locale, keyed by its path in the current locale. */
export type LocaleSwitchPaths = Record<string, Partial<Record<Locale, string>>>

/**
 * Language-switch map for one locale: every public path in `locale` with its
 * paths in the other locales (the same paths the pages give as hreflang).
 * Section indexes are added here as they have no document of their own.
 */
export const localeSwitchPaths = (
  locale: Locale,
  docs: { collection: PreviewCollection; slugs: Partial<Record<Locale, string>> }[],
): LocaleSwitchPaths => {
  const all = [
    sectionPaths('/blog'),
    sectionPaths('/case-studies'),
    ...docs.map((doc) => localizedPaths(doc.collection, doc.slugs)),
  ]
  const out: LocaleSwitchPaths = {}
  for (const paths of all) {
    const own = paths[locale]
    if (own) out[own] = paths
  }
  return out
}

/**
 * Switcher target for `pathname`: the page's own path in `target`. A page
 * without a `target` version links to that locale's homepage, never to a 404.
 */
export const localeSwitchHref = (
  paths: LocaleSwitchPaths,
  pathname: string,
  target: Locale,
): string => paths[pathname.replace(/(.)\/+$/, '$1')]?.[target] ?? `/${target}`

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
