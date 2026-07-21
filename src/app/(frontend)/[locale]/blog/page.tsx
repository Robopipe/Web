import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import Link from 'next/link'
import React from 'react'

import { PostCard } from '@/components/PostCard'
import type { Locale } from '@/i18n/routing'
import { locales } from '@/i18n/routing'
import { SERVER_URL } from '@/lib/paths'
import { getCategories, getPosts } from '@/lib/queries'

export const revalidate = 600

type Props = {
  params: Promise<{ locale: Locale }>
  searchParams: Promise<{ page?: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'blog' })
  return {
    title: `${t('title')} — Robopipe`,
    description: t('description'),
    alternates: {
      canonical: `${SERVER_URL}/${locale}/blog`,
      languages: Object.fromEntries(locales.map((loc) => [loc, `${SERVER_URL}/${loc}/blog`])),
    },
  }
}

export default async function BlogPage({ params, searchParams }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('blog')
  const tPagination = await getTranslations('pagination')

  const { page: pageParam } = await searchParams
  const page = Math.max(1, Number(pageParam) || 1)

  const [posts, categories] = await Promise.all([
    getPosts(locale, { page, limit: 9 }),
    getCategories(locale),
  ])

  return (
    <div className="container-site py-16">
      <header className="mb-12 max-w-2xl">
        <h1 className="text-4xl font-bold">{t('title')}</h1>
        <p className="mt-4 text-lg text-ink-500">{t('description')}</p>
      </header>

      {!!categories.length && (
        <nav aria-label={t('category')} className="mb-10 flex flex-wrap gap-2">
          <span className="rounded-full bg-ink-900 px-4 py-1.5 text-sm font-medium text-white">
            {t('allPosts')}
          </span>
          {categories.map(
            (category) =>
              category.slug && (
                <Link
                  key={category.id}
                  href={`/${locale}/blog/category/${category.slug}`}
                  className="rounded-full border border-ink-200 px-4 py-1.5 text-sm font-medium text-ink-600 transition-colors hover:border-ink-400 hover:text-ink-900"
                >
                  {category.title}
                </Link>
              ),
          )}
        </nav>
      )}

      {posts.docs.length ? (
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {posts.docs.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      ) : (
        <p className="text-ink-500">{t('noPosts')}</p>
      )}

      {posts.totalPages > 1 && (
        <nav className="mt-12 flex items-center justify-center gap-4 text-sm" aria-label="Pagination">
          {posts.hasPrevPage && (
            <Link
              href={`/${locale}/blog?page=${page - 1}`}
              className="rounded-md border border-ink-200 px-4 py-2 font-medium hover:border-ink-400"
            >
              ← {tPagination('previous')}
            </Link>
          )}
          <span className="text-ink-500">
            {tPagination('page', { page, total: posts.totalPages })}
          </span>
          {posts.hasNextPage && (
            <Link
              href={`/${locale}/blog?page=${page + 1}`}
              className="rounded-md border border-ink-200 px-4 py-2 font-medium hover:border-ink-400"
            >
              {tPagination('next')} →
            </Link>
          )}
        </nav>
      )}
    </div>
  )
}
