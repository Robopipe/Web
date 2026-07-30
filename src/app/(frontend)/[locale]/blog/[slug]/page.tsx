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
import { buttonClasses, Chip } from '@/components/ui'
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
  let related = (
    await getRelatedPosts(
      locale,
      post.id,
      categories.map((c) => c.id),
      2,
    )
  ).slice(0, 2)
  if (!related.length) {
    // No same-category siblings — fall back to the latest posts.
    const latest = await getPosts(locale, { limit: 3 })
    related = latest.docs.filter((p) => p.id !== post.id).slice(0, 2)
  }

  const framed = post.heroStyle === 'framed'
  const hasHero = post.heroImage && typeof post.heroImage !== 'number'

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.excerpt || undefined,
    datePublished: post.publishedAt || undefined,
    dateModified: post.updatedAt,
    image: ogImageUrl(post.heroImage) || undefined,
    author: authors.map((author) => ({ '@type': 'Person', name: author.name })),
    publisher: { '@type': 'Organization', name: 'Robopipe' },
    mainEntityOfPage: `${SERVER_URL}${pathFor('posts', slug, locale)}`,
  }

  return (
    <>
      <article className="pt-16">
        {draft && <LivePreviewListener />}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <div className="container-article">
          <Link
            href={`/${locale}/blog`}
            className="text-sm font-medium text-brand-fg hover:text-brand-fg-hover"
          >
            ← {tBlog('backToBlog')}
          </Link>

          <header className="mt-6">
            <div className="mb-5 flex flex-wrap items-center gap-3">
              {categories[0] && <Chip>{categories[0].title}</Chip>}
              <span className="text-[13px] text-text-38">
                {authors.length > 0 &&
                  `${t('by', { name: authors.map((a) => a.name).join(', ') })} · `}
                {post.publishedAt &&
                  format.dateTime(new Date(post.publishedAt), {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                {post.readingTime ? ` · ${t('minRead', { minutes: post.readingTime })}` : ''}
              </span>
            </div>
            <h1>{post.title}</h1>
            {post.excerpt && (
              <p className="mt-5 text-[19px] leading-[30px] text-text-60">{post.excerpt}</p>
            )}
          </header>
        </div>

        {hasHero && (
          <div className="container-article-wide mt-10">
            {framed ? (
              <div className="flex h-[280px] items-center justify-center rounded-lg bg-linear-160 from-gray-800 to-gray-950 p-8 sm:h-[420px]">
                <Media
                  media={post.heroImage}
                  size="hero"
                  className="max-h-full w-auto max-w-[85%] rounded-[6px] shadow-lift"
                  priority
                />
              </div>
            ) : (
              <Media
                media={post.heroImage}
                size="hero"
                className="h-[280px] w-full rounded-lg object-cover sm:h-[420px]"
                priority
              />
            )}
          </div>
        )}

        <div className="container-article mt-10 pb-16">
          <RichText data={post.content} />
        </div>
      </article>

      {!!related.length && (
        <aside className="container-article-wide pb-16">
          <div className="border-t border-border-12 pt-10">
            <h3 className="mb-8 text-2xl leading-8">{tBlog('relatedPosts')}</h3>
            <div className="grid gap-5 sm:grid-cols-2">
              {related.map((relatedPost) => (
                <PostCard key={relatedPost.id} post={relatedPost} variant="horizontal" />
              ))}
            </div>
          </div>
        </aside>
      )}

      <section className="bg-surface-dark">
        <div className="container-site flex flex-col items-center gap-6 py-16 text-center lg:py-18">
          <h2 className="max-w-3xl text-text-invert">{post.ctaHeadline || tBlog('ctaHeadline')}</h2>
          <Link
            href={tBlog('ctaHref')}
            className={buttonClasses({ variant: 'filled', size: 'lg' })}
          >
            {tBlog('ctaButton')}
          </Link>
        </div>
      </section>
    </>
  )
}
