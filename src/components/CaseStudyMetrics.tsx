import React from 'react'

import type { CaseStudy } from '@/payload-types'

/**
 * Headline results of a case study. Shared by the listing card and the detail page.
 * On a listing card (`listing`) results marked `hideInListing` are left out, and
 * from `sm` up the results share one row in equal columns. Long labels wrap in
 * their column, so two results never drop below each other.
 */
export const CaseStudyMetrics: React.FC<{
  metrics: CaseStudy['metrics']
  size?: 'default' | 'large'
  listing?: boolean
  className?: string
}> = ({ metrics, size = 'default', listing = false, className = '' }) => {
  const shown = listing ? metrics?.filter((metric) => !metric.hideInListing) : metrics
  if (!shown?.length) return null
  const layout = listing
    ? 'flex flex-wrap gap-x-6 gap-y-4 sm:grid sm:auto-cols-fr sm:grid-flow-col'
    : 'flex flex-wrap gap-x-10 gap-y-4'
  return (
    <dl className={`${layout} border-t border-border-12 pt-5 ${className}`}>
      {shown.map((metric, i) => (
        <div key={i} className="min-w-0">
          <dd
            className={`font-numbers font-semibold text-text-heading ${
              size === 'large' ? 'text-[32px] leading-10' : 'text-2xl leading-8'
            }`}
          >
            {metric.value}
          </dd>
          <dt className="mt-0.5 text-[13px] text-text-60">{metric.label}</dt>
        </div>
      ))}
    </dl>
  )
}
