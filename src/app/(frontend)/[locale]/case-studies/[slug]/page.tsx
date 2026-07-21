import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { draftMode } from 'next/headers'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import React from 'react'

import { LivePreviewListener } from '@/components/LivePreviewListener'
import { Media } from '@/components/Media'
import { RichText } from '@/components/RichText'
import { locales, type Locale } from '@/i18n/routing'
import { buildMeta } from '@/lib/meta'
import { getCaseStudies, getCaseStudyBySlug, getLocalizedSlugs } from '@/lib/queries'

export const revalidate = 600

type Props = {
  params: Promise<{ locale: Locale; slug: string }>
}

export async function generateStaticParams() {
  const params: { locale: Locale; slug: string }[] = []
  for (const locale of locales) {
    const caseStudies = await getCaseStudies(locale)
    for (const caseStudy of caseStudies.docs) {
      if (caseStudy.slug) params.push({ locale, slug: caseStudy.slug })
    }
  }
  return params
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params
  const caseStudy = await getCaseStudyBySlug(slug, locale)
  if (!caseStudy) return {}
  const slugs = await getLocalizedSlugs('case-studies', caseStudy.id)
  return buildMeta({
    title: caseStudy.title,
    seo: caseStudy.seo,
    excerpt: caseStudy.excerpt,
    collection: 'case-studies',
    locale,
    slugs,
  })
}

export default async function CaseStudyPage({ params }: Props) {
  const { locale, slug } = await params
  setRequestLocale(locale)

  const { isEnabled: draft } = await draftMode()
  const caseStudy = await getCaseStudyBySlug(slug, locale, draft)
  if (!caseStudy) notFound()

  const t = await getTranslations('caseStudies')

  return (
    <article className="container-site py-16">
      {draft && <LivePreviewListener />}
      <div className="mx-auto max-w-3xl">
        <Link
          href={`/${locale}/case-studies`}
          className="text-sm font-semibold text-brand-700 hover:text-brand-600"
        >
          ← {t('backToList')}
        </Link>

        <header className="mt-6 mb-10">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-brand-700">
            {[caseStudy.customer, caseStudy.industry].filter(Boolean).join(' · ')}
          </p>
          <h1 className="text-4xl font-bold leading-tight">{caseStudy.title}</h1>
          {caseStudy.excerpt && <p className="mt-4 text-lg text-ink-500">{caseStudy.excerpt}</p>}
        </header>

        {caseStudy.heroImage && typeof caseStudy.heroImage !== 'number' && (
          <Media
            media={caseStudy.heroImage}
            size="hero"
            className="mb-10 w-full rounded-lg"
            priority
          />
        )}

        {!!caseStudy.metrics?.length && (
          <dl className="mb-12 grid gap-6 rounded-lg bg-ink-50 p-8 text-center sm:grid-cols-2 lg:grid-cols-4">
            {caseStudy.metrics.map((metric, i) => (
              <div key={i}>
                <dd className="font-heading text-3xl font-bold text-brand-600">{metric.value}</dd>
                <dt className="mt-1 text-sm text-ink-500">{metric.label}</dt>
              </div>
            ))}
          </dl>
        )}

        <RichText data={caseStudy.content} />
      </div>
    </article>
  )
}
