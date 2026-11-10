import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { draftMode } from 'next/headers'
import Link from 'next/link'
import React from 'react'

import { FAQList } from '@/blocks/FAQAccordion/Component'
import { CaseStudyMetrics } from '@/components/CaseStudyMetrics'
import { JsonLd } from '@/components/JsonLd'
import { LivePreviewListener } from '@/components/LivePreviewListener'
import { Media } from '@/components/Media'
import { RichText } from '@/components/RichText'
import { buttonClasses, Chip } from '@/components/ui'
import { locales, type Locale } from '@/i18n/routing'
import { breadcrumbLd, faqPageLd } from '@/lib/jsonLd'
import { buildMeta } from '@/lib/meta'
import { localizedPaths, pathFor } from '@/lib/paths'
import { getCaseStudies, getCaseStudyBySlug, getGlobals, getLocalizedSlugs } from '@/lib/queries'
import { redirectOrNotFound } from '@/lib/redirects'
import type { CaseStudy } from '@/payload-types'

export const revalidate = 600

type Props = {
  params: Promise<{ locale: Locale; slug: string }>
}

/** Story sections in reading order. Each renders only when filled in. */
const SECTIONS = ['problem', 'solution', 'result', 'technique'] as const

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
  const [slugs, { settings }] = await Promise.all([
    getLocalizedSlugs('case-studies', caseStudy.id),
    getGlobals(locale),
  ])
  return buildMeta({
    title: caseStudy.title,
    seo: caseStudy.seo,
    excerpt: caseStudy.excerpt,
    locale,
    paths: localizedPaths('case-studies', slugs),
    image: caseStudy.heroImage,
    fallbackImage: settings.defaultSeo?.image,
  })
}

const populatedFaqs = (faqs: CaseStudy['faqs']) =>
  (faqs ?? []).filter((f): f is Exclude<typeof f, number> => typeof f !== 'number')

export default async function CaseStudyPage({ params }: Props) {
  const { locale, slug } = await params
  setRequestLocale(locale)

  const { isEnabled: draft } = await draftMode()
  const caseStudy = await getCaseStudyBySlug(slug, locale, draft)
  if (!caseStudy) return redirectOrNotFound([`/${locale}/case-studies/${slug}`])

  const t = await getTranslations('caseStudies')
  const tCommon = await getTranslations('common')
  const tIndustries = await getTranslations('industries')

  const faqs = populatedFaqs(caseStudy.faqs)
  const sections = SECTIONS.filter((key) => !!caseStudy[key])
  const hasLogo = caseStudy.customerLogo && typeof caseStudy.customerLogo !== 'number'
  const hasHero = caseStudy.heroImage && typeof caseStudy.heroImage !== 'number'

  return (
    <>
      <article className="pt-16">
        {draft && <LivePreviewListener />}
        <JsonLd
          data={[
            breadcrumbLd([
              { name: tCommon('home'), path: `/${locale}` },
              { name: t('title'), path: `/${locale}/case-studies` },
              { name: caseStudy.title, path: pathFor('case-studies', slug, locale) },
            ]),
            faqPageLd(faqs),
          ]}
        />
        <div className="container-article">
          <Link
            href={`/${locale}/case-studies`}
            className="text-sm font-medium text-brand-fg hover:text-brand-fg-hover"
          >
            ← {t('backToList')}
          </Link>

          <header className="mt-6">
            <div className="mb-5 flex flex-wrap items-center gap-3">
              {hasLogo && (
                <Media
                  media={caseStudy.customerLogo}
                  size="thumbnail"
                  className="h-8 w-auto object-contain"
                />
              )}
              {caseStudy.industry && <Chip>{tIndustries(caseStudy.industry)}</Chip>}
            </div>
            <h1>{caseStudy.title}</h1>
            {caseStudy.excerpt && (
              <p className="mt-5 text-[19px] leading-[30px] text-text-60">{caseStudy.excerpt}</p>
            )}
            <CaseStudyMetrics metrics={caseStudy.metrics} size="large" className="mt-8" />
          </header>
        </div>

        {hasHero && (
          <div className="container-article-wide mt-10">
            <Media
              media={caseStudy.heroImage}
              size="hero"
              className="h-[280px] w-full rounded-lg object-cover sm:h-[420px]"
              priority
            />
          </div>
        )}

        <div className="container-article mt-10 flex flex-col gap-10 pb-16">
          {sections.map((key) => (
            <section key={key}>
              <h2 className="mb-4">{t(key)}</h2>
              <RichText data={caseStudy[key]} />
            </section>
          ))}

          {faqs.length > 0 && (
            <section>
              <h2 className="mb-6">{t('faq')}</h2>
              <FAQList items={faqs} />
            </section>
          )}
        </div>
      </article>

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
