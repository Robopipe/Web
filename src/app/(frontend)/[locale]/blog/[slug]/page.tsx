import type { Metadata } from 'next'
import { getFormatter, getTranslations, setRequestLocale } from 'next-intl/server'
import { draftMode } from 'next/headers'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import React from 'react'

import { LivePreviewListener } from '@/components/LivePreviewListener'
import { Media } from '@/components/Media'
import { PostCard } from '@/components/PostCard'
import { RichText } from '@/components/RichText'
import { locales, type Locale } from '@/i18n/routing'
import { buildMeta, ogImageUrl } from '@/lib/meta'
import { SERVER_URL, pathFor } from '@/lib/paths'
import { getLocalizedSlugs, getPostBySlug, getPosts, getRelatedPosts } from '@/lib/queries'

export const revalidate = 600

type Props = {
  params: Promise<{ locale: Locale; slug: string }>
}

export async function generateStaticParams() {
  const params: { locale: Locale; slug: string }[] = []
  for (const locale of locales) {
    const posts = await getPosts(locale, { limit: 500 })
    for (const post of posts.docs) {
      if (post.slug) params.push({ locale, slug: post.slug })
    }
  }
  return params
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params
  const post = await getPostBySlug(slug, locale)
  if (!post) return {}
  const slugs = await getLocalizedSlugs('posts', post.id)
  return buildMeta({
    title: post.title,
    seo: post.seo,
    excerpt: post.excerpt,
    collection: 'posts',
    locale,
    slugs,
  })
}

export default async function PostPage({ params }: Props) {
  const { locale, slug } = await params
  setRequestLocale(locale)

  const { isEnabled: draft } = await draftMode()
  const post = await getPostBySlug(slug, locale, draft)
  if (!post) notFound()

  const t = await getTranslations('common')
  const tBlog = await getTranslations('blog')
  const format = await getFormatter()

  const authors = (post.authors ?? []).filter(
    (a): a is Exclude<typeof a, number> => typeof a !== 'number',
  )
  const categories = (post.categories ?? []).filter(
    (c): c is Exclude<typeof c, number> => typeof c !== 'number',
  )
  const related = await getRelatedPosts(
    locale,
    post.id,
    categories.map((c) => c.id),
  )

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.excerpt || undefined,
    datePublished: post.publishedAt || undefined,
    dateModified: post.updatedAt,
    image: ogImageUrl(post.heroImage) || undefined,
    author: authors.map((author) => ({ '@type': 'Person', name: author.name })),
    mainEntityOfPage: `${SERVER_URL}${pathFor('posts', slug, locale)}`,
  }

  return (
    <article className="container-site py-16">
      {draft && <LivePreviewListener />}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="mx-auto max-w-3xl">
        <Link
          href={`/${locale}/blog`}
          className="text-sm font-semibold text-brand-700 hover:text-brand-600"
        >
          ← {tBlog('backToBlog')}
        </Link>

        <header className="mt-6 mb-10">
          {!!categories.length && (
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-brand-700">
              {categories.map((c) => c.title).join(' · ')}
            </p>
          )}
          <h1 className="text-4xl font-bold leading-tight">{post.title}</h1>
          <p className="mt-4 text-sm text-ink-500">
            {authors.length > 0 && `${t('by', { name: authors.map((a) => a.name).join(', ') })} · `}
            {post.publishedAt &&
              format.dateTime(new Date(post.publishedAt), {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            {post.readingTime ? ` · ${t('minRead', { minutes: post.readingTime })}` : ''}
          </p>
        </header>

        {post.heroImage && typeof post.heroImage !== 'number' && (
          <Media media={post.heroImage} size="hero" className="mb-10 w-full rounded-lg" priority />
        )}

        <RichText data={post.content} />
      </div>

      {!!related.length && (
        <aside className="mx-auto mt-20 max-w-5xl">
          <h2 className="mb-8 text-2xl font-bold">{tBlog('relatedPosts')}</h2>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((relatedPost) => (
              <PostCard key={relatedPost.id} post={relatedPost} />
            ))}
          </div>
        </aside>
      )}
    </article>
  )
}
