import React from 'react'

import { Media } from '@/components/Media'
import type { FeatureGridBlock } from '@/payload-types'

const columnClasses: Record<string, string> = {
  '2': 'sm:grid-cols-2',
  '3': 'sm:grid-cols-2 lg:grid-cols-3',
  '4': 'sm:grid-cols-2 lg:grid-cols-4',
}

export const FeatureGridComponent: React.FC<FeatureGridBlock> = ({
  heading,
  text,
  columns,
  features,
}) => (
  <section className="container-site py-16 lg:py-24">
    {(heading || text) && (
      <div className="mx-auto mb-12 max-w-2xl text-center">
        {heading && <h2 className="text-3xl font-bold sm:text-4xl">{heading}</h2>}
        {text && <p className="mt-4 text-lg text-ink-500">{text}</p>}
      </div>
    )}
    <div className={`grid gap-8 ${columnClasses[columns ?? '3']}`}>
      {(features ?? []).map((feature, i) => (
        <div key={i} className="rounded-lg border border-ink-100 p-6">
          {feature.icon && typeof feature.icon !== 'number' && (
            <div className="mb-4 h-10 w-10">
              <Media media={feature.icon} size="thumbnail" className="h-10 w-10 object-contain" />
            </div>
          )}
          <h3 className="text-lg font-semibold">{feature.title}</h3>
          {feature.text && <p className="mt-2 text-sm leading-relaxed text-ink-500">{feature.text}</p>}
        </div>
      ))}
    </div>
  </section>
)
