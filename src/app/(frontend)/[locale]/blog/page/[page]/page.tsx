import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { notFound, permanentRedirect } from 'next/navigation'
import React from 'react'

import { BlogListing } from '@/components/BlogListing'
import type { Locale } from '@/i18n/routing'
import { blogPagePath, parseBlogPage, POSTS_PER_PAGE } from '@/lib/blogPages'
import { checkedParams } from '@/lib/checkedParams'
import { buildMeta } from '@/lib/meta'
import { getGlobals, getPosts } from '@/lib/queries'

/** Blog listing page 2 and later (issue #40). Page 1 is /blog. */
export const revalidate = 600

type Props = {
  params: Promise<{ locale: Locale; page: string }>
}

// Rendered on the first request, then cached like the other pages.
export async function generateStaticParams() {
  return []
}

/** The page number and its posts; 404 for a page that does not exist. */
const loadPage = async (params: Props['params']) => {
  const { locale, page: param } = await checkedParams(params)
  const page = parseBlogPage(param)
  if (!page) notFound()
  if (page === 1) permanentRedirect(blogPagePath(locale, 1))
  const posts = await getPosts(locale, { page, limit: POSTS_PER_PAGE })
  if (page > posts.totalPages) notFound()
  return { locale, page, posts }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, page, posts } = await loadPage(params)
  const [t, tPagination, { settings }] = await Promise.all([
    getTranslations({ locale, namespace: 'blog' }),
    getTranslations({ locale, namespace: 'pagination' }),
    getGlobals(locale),
  ])
  const pageLabel = tPagination('page', { page, total: posts.totalPages })
  return buildMeta({
    title: `${t('title')}: ${pageLabel}`,
    seo: { description: t('description') },
    locale,
    // Self canonical, no hreflang: the other locale has its own post count and pages.
    paths: { [locale]: blogPagePath(locale, page) },
    fallbackImage: settings.defaultSeo?.image,
  })
}

export default async function BlogListingPage({ params }: Props) {
  const { locale, page, posts } = await loadPage(params)
  setRequestLocale(locale)
  return <BlogListing locale={locale} page={page} posts={posts} />
}
