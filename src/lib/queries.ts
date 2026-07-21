import config from '@payload-config'
import { getPayload } from 'payload'

import type { Locale } from '@/i18n/routing'

/** Payload caches the instance internally — safe to call per request. */
export const getPayloadClient = () => getPayload({ config })

export const getPageBySlug = async (slug: string, locale: Locale, draft = false) => {
  const payload = await getPayloadClient()
  const result = await payload.find({
    collection: 'pages',
    where: { slug: { equals: slug } },
    locale,
    draft,
    limit: 1,
    depth: 2,
    overrideAccess: draft,
  })
  return result.docs[0] ?? null
}

/**
 * Posts/case studies are only visible in locales where they are translated:
 * fallbackLocale is disabled so untranslated docs have no slug in this locale
 * and are filtered out — no Czech text leaking into the English blog.
 */
export const getPosts = async (
  locale: Locale,
  opts: { page?: number; limit?: number; category?: string } = {},
) => {
  const payload = await getPayloadClient()
  return payload.find({
    collection: 'posts',
    where: {
      slug: { exists: true },
      ...(opts.category ? { 'categories.slug': { equals: opts.category } } : {}),
    },
    locale,
    fallbackLocale: false,
    sort: '-publishedAt',
    page: opts.page ?? 1,
    limit: opts.limit ?? 9,
    depth: 2,
  })
}

export const getPostBySlug = async (slug: string, locale: Locale, draft = false) => {
  const payload = await getPayloadClient()
  const result = await payload.find({
    collection: 'posts',
    where: { slug: { equals: slug } },
    locale,
    fallbackLocale: false,
    draft,
    limit: 1,
    depth: 2,
    overrideAccess: draft,
  })
  return result.docs[0] ?? null
}

export const getRelatedPosts = async (
  locale: Locale,
  postId: number,
  categoryIds: number[],
  limit = 3,
) => {
  if (!categoryIds.length) return []
  const payload = await getPayloadClient()
  const result = await payload.find({
    collection: 'posts',
    where: {
      slug: { exists: true },
      id: { not_equals: postId },
      categories: { in: categoryIds },
    },
    locale,
    fallbackLocale: false,
    sort: '-publishedAt',
    limit,
    depth: 2,
  })
  return result.docs
}

export const getCaseStudies = async (locale: Locale, limit = 50) => {
  const payload = await getPayloadClient()
  return payload.find({
    collection: 'case-studies',
    where: { slug: { exists: true } },
    locale,
    fallbackLocale: false,
    sort: '-createdAt',
    limit,
    depth: 2,
  })
}

export const getCaseStudyBySlug = async (slug: string, locale: Locale, draft = false) => {
  const payload = await getPayloadClient()
  const result = await payload.find({
    collection: 'case-studies',
    where: { slug: { equals: slug } },
    locale,
    fallbackLocale: false,
    draft,
    limit: 1,
    depth: 2,
    overrideAccess: draft,
  })
  return result.docs[0] ?? null
}

export const getCategories = async (locale: Locale) => {
  const payload = await getPayloadClient()
  const result = await payload.find({
    collection: 'categories',
    locale,
    limit: 50,
    sort: 'title',
  })
  return result.docs
}

/** Localized slugs of a document in every locale — for hreflang and the language switcher. */
export const getLocalizedSlugs = async (
  collection: 'pages' | 'posts' | 'case-studies',
  id: number,
): Promise<Partial<Record<Locale, string>>> => {
  const payload = await getPayloadClient()
  const doc = await payload.findByID({
    collection,
    id,
    locale: 'all',
    depth: 0,
    draft: false,
  })
  const slugByLocale = (doc?.slug ?? {}) as Record<string, string | null>
  const out: Partial<Record<Locale, string>> = {}
  for (const [loc, value] of Object.entries(slugByLocale)) {
    if (typeof value === 'string' && value.length) out[loc as Locale] = value
  }
  return out
}

export const getRedirect = async (fromPath: string) => {
  const payload = await getPayloadClient()
  const result = await payload.find({
    collection: 'redirects',
    where: { from: { equals: fromPath } },
    limit: 1,
  })
  return result.docs[0] ?? null
}

export const getGlobals = async (locale: Locale) => {
  const payload = await getPayloadClient()
  const [header, footer, settings] = await Promise.all([
    payload.findGlobal({ slug: 'header', locale, depth: 2 }),
    payload.findGlobal({ slug: 'footer', locale, depth: 2 }),
    payload.findGlobal({ slug: 'site-settings', locale, depth: 2 }),
  ])
  return { header, footer, settings }
}
