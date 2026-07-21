import { getLocale, getTranslations } from 'next-intl/server'
import Link from 'next/link'
import React from 'react'

import { PostCard } from '@/components/PostCard'
import type { Locale } from '@/i18n/routing'
import { getPosts } from '@/lib/queries'
import type { BlogTeaserBlock } from '@/payload-types'

export const BlogTeaserComponent: React.FC<BlogTeaserBlock> = async ({ heading, limit }) => {
  const locale = (await getLocale()) as Locale
  const t = await getTranslations('blog')
  const result = await getPosts(locale, { limit: limit ?? 3 })
  if (!result.docs.length) return null

  return (
    <section className="container-site py-16 lg:py-24">
      <div className="mb-10 flex items-end justify-between">
        <h2 className="text-3xl font-bold">{heading || t('title')}</h2>
        <Link
          href={`/${locale}/blog`}
          className="text-sm font-semibold text-brand-700 hover:text-brand-600"
        >
          {t('allPosts')} →
        </Link>
      </div>
      <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {result.docs.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>
    </section>
  )
}
