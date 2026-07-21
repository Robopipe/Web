import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import React from 'react'

import { CaseStudyCard } from '@/components/CaseStudyCard'
import { locales, type Locale } from '@/i18n/routing'
import { SERVER_URL } from '@/lib/paths'
import { getCaseStudies } from '@/lib/queries'

export const revalidate = 600

type Props = {
  params: Promise<{ locale: Locale }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'caseStudies' })
  return {
    title: `${t('title')} — Robopipe`,
    description: t('description'),
    alternates: {
      canonical: `${SERVER_URL}/${locale}/case-studies`,
      languages: Object.fromEntries(
        locales.map((loc) => [loc, `${SERVER_URL}/${loc}/case-studies`]),
      ),
    },
  }
}

export default async function CaseStudiesPage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('caseStudies')

  const caseStudies = await getCaseStudies(locale)

  return (
    <div className="container-site py-16">
      <header className="mb-12 max-w-2xl">
        <h1 className="text-4xl font-bold">{t('title')}</h1>
        <p className="mt-4 text-lg text-ink-500">{t('description')}</p>
      </header>
      <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {caseStudies.docs.map((caseStudy) => (
          <CaseStudyCard key={caseStudy.id} caseStudy={caseStudy} />
        ))}
      </div>
    </div>
  )
}
