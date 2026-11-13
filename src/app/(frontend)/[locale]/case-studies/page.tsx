import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import Link from 'next/link'
import React from 'react'

import { IndustryCardsComponent } from '@/blocks/IndustryCards/Component'
import { CaseStudyCard } from '@/components/CaseStudyCard'
import { JsonLd } from '@/components/JsonLd'
import { buttonClasses, Chip } from '@/components/ui'
import type { Locale } from '@/i18n/routing'
import { checkedParams } from '@/lib/checkedParams'
import { breadcrumbLd } from '@/lib/jsonLd'
import { buildMeta } from '@/lib/meta'
import { sectionPaths } from '@/lib/paths'
import { getCaseStudies, getGlobals, getPayloadClient } from '@/lib/queries'

export const revalidate = 600

type Props = {
  params: Promise<{ locale: Locale }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await checkedParams(params)
  const [t, { settings }] = await Promise.all([
    getTranslations({ locale, namespace: 'caseStudies' }),
    getGlobals(locale),
  ])
  return buildMeta({
    title: t('title'),
    seo: { title: t('metaTitle'), description: t('description') },
    locale,
    paths: sectionPaths('/case-studies'),
    fallbackImage: settings.defaultSeo?.image,
  })
}

export default async function CaseStudiesPage({ params }: Props) {
  const { locale } = await checkedParams(params)
  setRequestLocale(locale)
  const t = await getTranslations('caseStudies')
  const tCommon = await getTranslations('common')

  const caseStudies = await getCaseStudies(locale)
  const featured = caseStudies.docs.find((cs) => cs.featured) ?? caseStudies.docs[0]
  const rest = caseStudies.docs.filter((cs) => cs !== featured)

  // The pull quote between the grid and the solutions by task: first testimonial doc.
  const payload = await getPayloadClient()
  const testimonials = await payload.find({
    collection: 'testimonials',
    locale,
    limit: 1,
    sort: 'createdAt',
  })
  const quote = testimonials.docs[0]

  return (
    <>
      <JsonLd
        data={[
          breadcrumbLd([
            { name: tCommon('home'), path: `/${locale}` },
            { name: t('title'), path: `/${locale}/case-studies` },
          ]),
        ]}
      />
      <div className="container-site pt-16 pb-16 lg:pt-20">
        <header className="mx-auto mb-12 flex max-w-2xl flex-col items-center gap-5 text-center">
          <Chip>{t('title')}</Chip>
          <h1 className="text-[44px] leading-[54px] lg:text-[52px] lg:leading-[62px]">
            {t('headline')}
          </h1>
          <p className="max-w-xl text-lg leading-8 text-text-60 lg:text-xl">{t('description')}</p>
        </header>

        <div className="flex flex-col gap-5">
          {featured && <CaseStudyCard caseStudy={featured} featured headingLevel="h2" />}
          {rest.length > 0 && (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {rest.map((caseStudy) => (
                <CaseStudyCard key={caseStudy.id} caseStudy={caseStudy} headingLevel="h2" />
              ))}
            </div>
          )}
        </div>
      </div>

      {quote && (
        <section className="container-site pb-16">
          <figure className="mx-auto flex max-w-3xl flex-col items-center gap-6 text-center">
            <blockquote className="font-heading text-[24px] leading-9 font-medium text-text-heading lg:text-[28px] lg:leading-10">
              {tCommon('quote', { text: quote.quote })}
            </blockquote>
            <figcaption className="text-sm text-text-60">
              {[quote.personRole, quote.company].filter(Boolean).join(' · ') || quote.personName}
            </figcaption>
          </figure>
        </section>
      )}

      <IndustryCardsComponent blockType="industryCards" source="solutions" heading={t('byTask')} />

      <section className="bg-surface-dark">
        <div className="container-site flex flex-col items-center gap-6 py-16 text-center lg:py-18">
          <h2 className="max-w-3xl text-text-invert">{t('ctaHeading')}</h2>
          <p className="max-w-2xl text-lg text-text-invert-60">{t('ctaText')}</p>
          <Link href={t('ctaHref')} className={buttonClasses({ variant: 'filled', size: 'lg' })}>
            {t('ctaButton')}
          </Link>
        </div>
      </section>
    </>
  )
}
