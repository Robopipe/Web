import { useLocale, useTranslations } from 'next-intl'
import Link from 'next/link'
import React from 'react'

import { CaseStudyMetrics } from '@/components/CaseStudyMetrics'
import { Media } from '@/components/Media'
import { Chip } from '@/components/ui'
import { pathFor } from '@/lib/paths'
import type { CaseStudy } from '@/payload-types'

/**
 * Listing card (logo, industry chip, title, excerpt, metrics). The whole card
 * links to the case study detail page.
 */
export const CaseStudyCard: React.FC<{ caseStudy: CaseStudy; featured?: boolean }> = ({
  caseStudy,
  featured,
}) => {
  const t = useTranslations('industries')
  const locale = useLocale()
  const href = caseStudy.slug ? pathFor('case-studies', caseStudy.slug, locale) : undefined
  const industryLabel = caseStudy.industry ? t(caseStudy.industry) : null

  const meta = (
    <div className="flex items-center gap-3">
      {caseStudy.customerLogo && typeof caseStudy.customerLogo !== 'number' && (
        <Media
          media={caseStudy.customerLogo}
          size="thumbnail"
          className={`w-auto object-contain ${featured ? 'h-9' : 'h-7'}`}
        />
      )}
      {industryLabel && <Chip>{industryLabel}</Chip>}
    </div>
  )

  const metrics = (
    <CaseStudyMetrics
      metrics={caseStudy.metrics}
      size={featured ? 'large' : 'default'}
      listing
      className={featured ? 'mt-2' : 'mt-auto'}
    />
  )

  const linkClasses =
    'group block h-full rounded-lg transition-shadow hover:shadow-lift focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand'
  const wrap = (card: React.ReactElement) =>
    href ? (
      <Link href={href} className={`${linkClasses} ${featured ? 'rounded-xl' : ''}`}>
        {card}
      </Link>
    ) : (
      card
    )

  if (featured) {
    return wrap(
      <article className="grid h-full overflow-hidden rounded-xl border border-border-12 bg-white lg:grid-cols-[1.1fr_1fr]">
        {caseStudy.heroImage && typeof caseStudy.heroImage !== 'number' && (
          <div className="min-h-[240px] lg:min-h-[340px]">
            <Media
              media={caseStudy.heroImage}
              size="card"
              className="h-full w-full object-cover"
            />
          </div>
        )}
        <div className="flex flex-col gap-4 p-8">
          {meta}
          <h3 className="text-[26px] leading-[34px] group-hover:text-brand-fg">{caseStudy.title}</h3>
          {caseStudy.excerpt && (
            <p className="text-[15px] leading-relaxed text-text-60">{caseStudy.excerpt}</p>
          )}
          {metrics}
        </div>
      </article>,
    )
  }

  return wrap(
    <article className="flex h-full flex-col overflow-hidden rounded-lg border border-border-12 bg-white">
      {caseStudy.heroImage && typeof caseStudy.heroImage !== 'number' && (
        <div className="aspect-video overflow-hidden">
          <Media
            media={caseStudy.heroImage}
            size="card"
            className="h-full w-full object-cover"
          />
        </div>
      )}
      <div className="flex flex-1 flex-col gap-3 p-5">
        {meta}
        <h3 className="text-[19px] leading-[25px] group-hover:text-brand-fg">{caseStudy.title}</h3>
        {caseStudy.excerpt && (
          <p className="text-sm leading-[21px] text-text-60">{caseStudy.excerpt}</p>
        )}
        {metrics}
      </div>
    </article>,
  )
}
