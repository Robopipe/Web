import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import Link from 'next/link'
import React from 'react'

import { NewsletterForm } from '@/components/NewsletterForm'
import { PostCard } from '@/components/PostCard'
import { Chip } from '@/components/ui'
import type { Locale } from '@/i18n/routing'
import { locales } from '@/i18n/routing'
import { SERVER_URL } from '@/lib/paths'
import { getPosts } from '@/lib/queries'

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
  const tNewsletter = await getTranslations('newsletter')
  const tPagination = await getTranslations('pagination')

  const { page: pageParam } = await searchParams
  const page = Math.max(1, Number(pageParam) || 1)

  const posts = await getPosts(locale, { page, limit: 10 })
  // The newest post leads as the featured card on the first page.
  const [featured, ...rest] = page === 1 ? posts.docs : [null, ...posts.docs]

  return (
    <>
      <div className="container-site pt-16 pb-16 lg:pt-20">
        <header className="mx-auto mb-12 flex max-w-2xl flex-col items-center gap-5 text-center">
          <Chip>{t('title')}</Chip>
          <h1 className="text-[44px] leading-[54px] lg:text-[52px] lg:leading-[62px]">
            {t('headline')}
          </h1>
          <p className="max-w-xl text-lg leading-8 text-text-60 lg:text-xl">{t('description')}</p>
        </header>

        {posts.docs.length ? (
          <div className="flex flex-col gap-5">
            {featured && <PostCard post={featured} variant="featured" />}
            {rest.length > 0 && (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {rest.map((post) => post && <PostCard key={post.id} post={post} />)}
              </div>
            )}
          </div>
        ) : (
          <p className="text-center text-text-60">{t('noPosts')}</p>
        )}

        {posts.totalPages > 1 && (
          <nav
            className="mt-12 flex items-center justify-center gap-4 text-sm"
            aria-label="Pagination"
          >
            {posts.hasPrevPage && (
              <Link
                href={`/${locale}/blog?page=${page - 1}`}
                className="rounded-sm border border-border-12 px-4 py-2 font-medium text-text-90 hover:bg-surface-3"
              >
                ← {tPagination('previous')}
              </Link>
            )}
            <span className="text-text-60">
              {tPagination('page', { page, total: posts.totalPages })}
            </span>
            {posts.hasNextPage && (
              <Link
                href={`/${locale}/blog?page=${page + 1}`}
                className="rounded-sm border border-border-12 px-4 py-2 font-medium text-text-90 hover:bg-surface-3"
              >
                {tPagination('next')} →
              </Link>
            )}
          </nav>
        )}
      </div>

      <section className="bg-surface-dark">
        <div className="container-site flex flex-col items-center gap-5 py-16 text-center lg:py-18">
          <h2 className="text-text-invert">{tNewsletter('heading')}</h2>
          <p className="max-w-md text-base text-text-invert-60">{tNewsletter('text')}</p>
          <NewsletterForm />
        </div>
      </section>
    </>
  )
}
