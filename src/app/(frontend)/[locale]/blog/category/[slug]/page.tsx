import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import React from 'react'

import { PostCard } from '@/components/PostCard'
import type { Locale } from '@/i18n/routing'
import { getPosts, getPayloadClient } from '@/lib/queries'

export const revalidate = 600

type Props = {
  params: Promise<{ locale: Locale; slug: string }>
}

const getCategory = async (slug: string, locale: Locale) => {
  const payload = await getPayloadClient()
  const result = await payload.find({
    collection: 'categories',
    where: { slug: { equals: slug } },
    locale,
    limit: 1,
  })
  return result.docs[0] ?? null
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params
  const category = await getCategory(slug, locale)
  if (!category) return {}
  const t = await getTranslations({ locale, namespace: 'blog' })
  return { title: `${category.title} — ${t('title')} — Robopipe` }
}

export default async function CategoryPage({ params }: Props) {
  const { locale, slug } = await params
  setRequestLocale(locale)

  const category = await getCategory(slug, locale)
  if (!category) notFound()

  const t = await getTranslations('blog')
  const posts = await getPosts(locale, { category: slug, limit: 50 })

  return (
    <div className="container-site py-16">
      <header className="mb-12 max-w-2xl">
        <Link
          href={`/${locale}/blog`}
          className="text-sm font-semibold text-brand-700 hover:text-brand-600"
        >
          ← {t('backToBlog')}
        </Link>
        <h1 className="mt-4 text-4xl font-bold">{category.title}</h1>
      </header>

      {posts.docs.length ? (
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {posts.docs.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      ) : (
        <p className="text-ink-500">{t('noPosts')}</p>
      )}
    </div>
  )
}
