import React from 'react'

import type { CaseStudy } from '@/payload-types'

/** Headline results of a case study. Shared by the listing card and the detail page. */
export const CaseStudyMetrics: React.FC<{
  metrics: CaseStudy['metrics']
  size?: 'default' | 'large'
  className?: string
}> = ({ metrics, size = 'default', className = '' }) => {
  if (!metrics?.length) return null
  return (
    <dl className={`flex flex-wrap gap-x-10 gap-y-4 border-t border-border-12 pt-5 ${className}`}>
      {metrics.map((metric, i) => (
        <div key={i}>
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
