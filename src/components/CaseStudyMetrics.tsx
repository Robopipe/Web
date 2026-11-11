import React from 'react'

import type { CaseStudy } from '@/payload-types'

/**
 * Headline results of a case study. Shared by the listing card and the detail page.
 * On a listing card (`listing`) the results share one row in equal columns from
 * `sm` up. Long labels wrap in their column, also inside a long word, so two
 * results never drop below each other and no text is cut off.
 */
export const CaseStudyMetrics: React.FC<{
  metrics: CaseStudy['metrics']
  size?: 'default' | 'large'
  listing?: boolean
  className?: string
}> = ({ metrics, size = 'default', listing = false, className = '' }) => {
  if (!metrics?.length) return null
  const layout = listing
    ? 'flex flex-wrap gap-x-6 gap-y-4 sm:grid sm:auto-cols-fr sm:grid-flow-col'
    : 'flex flex-wrap gap-x-10 gap-y-4'
  return (
    <dl className={`${layout} border-t border-border-12 pt-5 ${className}`}>
      {metrics.map((metric, i) => (
        <div key={i} className="min-w-0">
          <dd
            className={`font-numbers font-semibold text-text-heading ${
              size === 'large' ? 'text-[32px] leading-10' : 'text-2xl leading-8'
            }`}
          >
            {metric.value}
          </dd>
          <dt className="mt-0.5 text-[13px] text-text-60 break-words hyphens-auto">
            {metric.label}
          </dt>
        </div>
      ))}
    </dl>
  )
}
