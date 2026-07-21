import { useFormatter, useLocale, useTranslations } from 'next-intl'
import Link from 'next/link'
import React from 'react'

import { Media } from '@/components/Media'
import type { Locale } from '@/i18n/routing'
import { pathFor } from '@/lib/paths'
import type { Post } from '@/payload-types'

export const PostCard: React.FC<{ post: Post }> = ({ post }) => {
  const locale = useLocale() as Locale
  const format = useFormatter()
  const t = useTranslations('common')

  if (!post.slug) return null
  const categories = (post.categories ?? []).filter(
    (c): c is Exclude<typeof c, number> => typeof c !== 'number',
  )

  return (
    <article className="group flex flex-col overflow-hidden rounded-lg border border-ink-100 transition hover:border-brand-300 hover:shadow-sm">
      <Link href={pathFor('posts', post.slug, locale)} className="flex flex-1 flex-col">
        {post.heroImage && typeof post.heroImage !== 'number' && (
          <Media
            media={post.heroImage}
            size="card"
            className="aspect-video w-full object-cover"
          />
        )}
        <div className="flex flex-1 flex-col p-5">
          {!!categories.length && (
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-brand-700">
              {categories.map((c) => c.title).join(' · ')}
            </p>
          )}
          <h3 className="text-lg font-semibold group-hover:text-brand-700">{post.title}</h3>
          {post.excerpt && (
            <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-ink-500">{post.excerpt}</p>
          )}
          <p className="mt-auto pt-4 text-xs text-ink-400">
            {post.publishedAt &&
              format.dateTime(new Date(post.publishedAt), {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            {post.readingTime ? ` · ${t('minRead', { minutes: post.readingTime })}` : ''}
          </p>
        </div>
      </Link>
    </article>
  )
}
