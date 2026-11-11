import config from '@payload-config'
import { getPayload } from 'payload'
import { cache } from 'react'

import { routing, type Locale } from '@/i18n/routing'
import type { Media, Page } from '@/payload-types'

import { pathFor } from './paths'

/** Payload caches the instance internally — safe to call per request. */
export const getPayloadClient = () => getPayload({ config })

/**
 * The Local API bypasses access control unless told otherwise, so every public
 * read of a drafts-enabled collection (pages, posts, case studies) must opt in
 * for `publishedOrLoggedIn` to run — without it, unpublished drafts are served
 * to visitors. Only the draft-preview path may skip it.
 */
const PUBLIC_ONLY = { overrideAccess: false } as const

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
  const page = result.docs[0] ?? null
  if (!page || locale === routing.defaultLocale) return page
  const own = await payload.findByID({
    collection: 'pages',
    id: page.id,
    locale,
    fallbackLocale: false,
    draft,
    depth: 0,
    select: { layout: true },
    overrideAccess: draft,
  })
  return withoutFallbackCardLinks(page, own.layout)
}

/**
 * A card link label is localized, but the fallback locale fills an empty one with the
 * Czech text. A card link without its own label in this locale is not shown.
 * `own` is the same layout read without the fallback locale.
 */
export const withoutFallbackCardLinks = (page: Page, own: Page['layout']): Page => ({
  ...page,
  layout: page.layout?.map((block) => {
    if (block.blockType !== 'featureGrid') return block
    const ownBlock = own?.find((b) => b.id === block.id)
    const ownFeatures = ownBlock?.blockType === 'featureGrid' ? ownBlock.features : []
    return {
      ...block,
      features: block.features.map((feature) =>
        feature.link?.label && !ownFeatures.find((f) => f.id === feature.id)?.link?.label
          ? { ...feature, link: { ...feature.link, label: null } }
          : feature,
      ),
    }
  }),
})

/**
 * Posts/case studies are only visible in locales where they are translated:
 * fallbackLocale is disabled so untranslated docs have no slug in this locale
 * and are filtered out — no Czech text leaking into the English blog.
 */
export const getPosts = async (locale: Locale, opts: { page?: number; limit?: number } = {}) => {
  const payload = await getPayloadClient()
  return payload.find({
    collection: 'posts',
    where: { slug: { exists: true } },
    locale,
    fallbackLocale: false,
    sort: '-publishedAt',
    page: opts.page ?? 1,
    limit: opts.limit ?? 9,
    depth: 2,
    ...PUBLIC_ONLY,
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
    ...PUBLIC_ONLY,
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
    sort: 'createdAt',
    limit,
    depth: 2,
    ...PUBLIC_ONLY,
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

/**
 * The published page with the pricing table and its tiers. The pricing page
 * content is the one source of prices (Product offers in JSON-LD).
 */
export const getPricing = async (locale: Locale, { depth = 0 }: { depth?: 0 | 1 } = {}) => {
  const payload = await getPayloadClient()
  const pages = await payload.find({
    collection: 'pages',
    locale,
    fallbackLocale: false,
    where: { slug: { exists: true } },
    limit: 200,
    // depth 1 resolves the tier buttons' page links, for rendering the tiers elsewhere.
    depth,
    select: { slug: true, layout: true },
    ...PUBLIC_ONLY,
  })
  for (const page of pages.docs) {
    // A table with source "pricingPage" (solution pages) only shows these tiers. It has none of its own.
    const table = page.layout?.find(
      (block) => block.blockType === 'pricingTable' && block.source !== 'pricingPage',
    )
    if (page.slug && table?.blockType === 'pricingTable') {
      return { path: pathFor('pages', page.slug, locale), tiers: table.tiers ?? [] }
    }
  }
  return null
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

/** Cached per request: the layout, metadata and JSON-LD share one read. */
export const getGlobals = cache(async (locale: Locale) => {
  const payload = await getPayloadClient()
  const [header, footer, settings] = await Promise.all([
    payload.findGlobal({ slug: 'header', locale, depth: 2 }),
    payload.findGlobal({ slug: 'footer', locale, depth: 2 }),
    payload.findGlobal({ slug: 'site-settings', locale, depth: 2 }),
  ])
  return { header, footer, settings }
})

export type SolutionPage = {
  title: string
  path: string
  description: string | null
  image: Media | null
}

type SolutionDoc = Pick<Page, 'id' | 'title' | 'slug' | 'seo' | 'layout'>

/**
 * Orders the published solution pages as in site-settings.solutions. A page
 * without a slug in this locale is left out, so no link leads to a 404.
 */
export const solutionPagesFrom = (
  ids: number[],
  docs: SolutionDoc[],
  locale: Locale,
): SolutionPage[] =>
  ids.flatMap((id) => {
    const doc = docs.find((d) => d.id === id)
    if (!doc?.slug) return []
    const hero = doc.layout?.find((block) => block.blockType === 'hero')
    const image = [doc.seo?.image, hero?.blockType === 'hero' ? hero.image : null].find(
      (value): value is Media => typeof value === 'object' && value !== null,
    )
    return [
      {
        title: doc.title,
        path: pathFor('pages', doc.slug, locale),
        description: doc.seo?.description || null,
        image: image ?? null,
      },
    ]
  })

/** The solution and task pages from site-settings.solutions: footer, card blocks, use cases listing. */
export const getSolutionPages = cache(async (locale: Locale): Promise<SolutionPage[]> => {
  const { settings } = await getGlobals(locale)
  const ids = (settings.solutions ?? []).map((value) =>
    typeof value === 'number' ? value : value.id,
  )
  if (!ids.length) return []
  const payload = await getPayloadClient()
  const result = await payload.find({
    collection: 'pages',
    where: { id: { in: ids } },
    locale,
    fallbackLocale: false,
    limit: ids.length,
    depth: 1,
    select: { title: true, slug: true, seo: true, layout: true },
    ...PUBLIC_ONLY,
  })
  return solutionPagesFrom(ids, result.docs as SolutionDoc[], locale)
})
