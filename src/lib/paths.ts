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

export const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'
