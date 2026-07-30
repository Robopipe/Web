import { useFormatter, useLocale, useTranslations } from 'next-intl'
import Link from 'next/link'
import React from 'react'

import { Media } from '@/components/Media'
import { Chip } from '@/components/ui'
import type { Locale } from '@/i18n/routing'
import { pathFor } from '@/lib/paths'
import type { Post } from '@/payload-types'

type Props = {
  post: Post
  /**
   * default — vertical card (listing grid)
   * horizontal — square thumb left, no excerpt (related posts, split section)
   * featured — large two-column card (newest post on the listing)
   */
  variant?: 'default' | 'horizontal' | 'featured'
}

export const PostCard: React.FC<Props> = ({ post, variant = 'default' }) => {
  const locale = useLocale() as Locale
  const format = useFormatter()
  const t = useTranslations('common')

  if (!post.slug) return null
  const href = pathFor('posts', post.slug, locale)
  const category = (post.categories ?? []).find(
    (c): c is Exclude<typeof c, number> => typeof c !== 'number',
  )
  const date =
    post.publishedAt &&
    format.dateTime(new Date(post.publishedAt), {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })

  if (variant === 'featured') {
    return (
      <article className="overflow-hidden rounded-xl border border-border-12 bg-white transition-shadow hover:shadow-lift">
        <Link href={href} className="grid lg:grid-cols-[1.2fr_1fr]">
          {post.heroImage && typeof post.heroImage !== 'number' && (
            <div className="min-h-[220px] lg:min-h-[320px]">
              <Media media={post.heroImage} size="card" className="h-full w-full object-cover" />
            </div>
          )}
          <div className="flex flex-col gap-3 p-8">
            {category && (
              <div>
                <Chip>{category.title}</Chip>
              </div>
            )}
            <h2 className="text-[26px] leading-[34px] lg:text-3xl lg:leading-[38px]">
              {post.title}
            </h2>
            {post.excerpt && (
              <p className="line-clamp-3 text-[15px] leading-relaxed text-text-60">
                {post.excerpt}
              </p>
            )}
            <p className="mt-auto pt-3 text-[13px] text-text-38">
              {date}
              {post.readingTime ? ` · ${t('minRead', { minutes: post.readingTime })}` : ''}
            </p>
          </div>
        </Link>
      </article>
    )
  }

  if (variant === 'horizontal') {
    return (
      <article className="overflow-hidden rounded-lg border border-border-12 bg-white transition-shadow hover:shadow-lift">
        <Link href={href} className="flex">
          {post.heroImage && typeof post.heroImage !== 'number' && (
            <div className="h-auto w-28 shrink-0 sm:w-40">
              <Media media={post.heroImage} size="card" className="h-full w-full object-cover" />
            </div>
          )}
          <div className="flex flex-col gap-2 p-4 sm:p-5">
            {category && (
              <div>
                <Chip>{category.title}</Chip>
              </div>
            )}
            <h4 className="text-base leading-snug font-bold tracking-normal">{post.title}</h4>
            <p className="mt-auto text-xs text-text-38">{date}</p>
          </div>
        </Link>
      </article>
    )
  }

  return (
    <article className="flex flex-col overflow-hidden rounded-lg border border-border-12 bg-white transition-shadow hover:shadow-lift">
      <Link href={href} className="flex flex-1 flex-col">
        {post.heroImage && typeof post.heroImage !== 'number' && (
          <div className="aspect-video overflow-hidden">
            <Media media={post.heroImage} size="card" className="h-full w-full object-cover" />
          </div>
        )}
        <div className="flex flex-1 flex-col gap-2 p-4 sm:p-5">
          {category && (
            <div>
              <Chip>{category.title}</Chip>
            </div>
          )}
          <h4 className="text-xl leading-[26px] tracking-[-0.01em]">{post.title}</h4>
          {post.excerpt && (
            <p className="line-clamp-3 text-sm leading-5 text-text-60">{post.excerpt}</p>
          )}
          <p className="mt-auto pt-2 text-xs text-text-38">{date}</p>
        </div>
      </Link>
    </article>
  )
}
