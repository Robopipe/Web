import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import React from 'react'

import { BlogListing } from '@/components/BlogListing'
import type { Locale } from '@/i18n/routing'
import { POSTS_PER_PAGE } from '@/lib/blogPages'
import { checkedParams } from '@/lib/checkedParams'
import { buildMeta } from '@/lib/meta'
import { sectionPaths } from '@/lib/paths'
import { getGlobals, getPosts } from '@/lib/queries'

// The listing reads no query string, so it stays static and cacheable (issue #40).
// Older posts are on /blog/page/<n>. src/proxy.ts redirects the old ?page=<n> there.
export const revalidate = 600

type Props = {
  params: Promise<{ locale: Locale }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await checkedParams(params)
  const [t, { settings }] = await Promise.all([
    getTranslations({ locale, namespace: 'blog' }),
    getGlobals(locale),
  ])
  return buildMeta({
    title: t('title'),
    seo: { title: t('metaTitle'), description: t('description') },
    locale,
    paths: sectionPaths('/blog'),
    fallbackImage: settings.defaultSeo?.image,
  })
}

export default async function BlogPage({ params }: Props) {
  const { locale } = await checkedParams(params)
  setRequestLocale(locale)
  const posts = await getPosts(locale, { page: 1, limit: POSTS_PER_PAGE })
  return <BlogListing locale={locale} page={1} posts={posts} />
}
