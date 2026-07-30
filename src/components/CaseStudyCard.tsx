import { useTranslations } from 'next-intl'
import React from 'react'

import { Media } from '@/components/Media'
import { Chip } from '@/components/ui'
import type { CaseStudy } from '@/payload-types'

/**
 * Case studies are listing-only: the card carries the whole story
 * (logo, industry chip, title, body, metrics) and links nowhere.
 */
export const CaseStudyCard: React.FC<{ caseStudy: CaseStudy; featured?: boolean }> = ({
  caseStudy,
  featured,
}) => {
  const t = useTranslations('industries')
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

  const metrics = !!caseStudy.metrics?.length && (
    <dl className={`flex gap-10 border-t border-border-12 pt-5 ${featured ? 'mt-2' : 'mt-auto'}`}>
      {caseStudy.metrics.map((metric, i) => (
        <div key={i}>
          <dd
            className={`font-numbers font-semibold text-text-heading ${
              featured ? 'text-[32px] leading-10' : 'text-2xl leading-8'
            }`}
          >
            {metric.value}
          </dd>
          <dt className="mt-0.5 text-[13px] text-text-60">{metric.label}</dt>
        </div>
      ))}
    </dl>
  )

  if (featured) {
    return (
      <article className="grid overflow-hidden rounded-xl border border-border-12 bg-white lg:grid-cols-[1.1fr_1fr]">
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
          <h3 className="text-[26px] leading-[34px]">{caseStudy.title}</h3>
          {caseStudy.excerpt && (
            <p className="text-[15px] leading-relaxed text-text-60">{caseStudy.excerpt}</p>
          )}
          {metrics}
        </div>
      </article>
    )
  }

  return (
    <article className="flex flex-col overflow-hidden rounded-lg border border-border-12 bg-white">
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
        <h3 className="text-[19px] leading-[25px]">{caseStudy.title}</h3>
        {caseStudy.excerpt && (
          <p className="text-sm leading-[21px] text-text-60">{caseStudy.excerpt}</p>
        )}
        {metrics}
      </div>
    </article>
  )
}
