import React from 'react'

import type { StatsBlock } from '@/payload-types'

export const StatsComponent: React.FC<StatsBlock> = ({ heading, items }) => (
  <section className="bg-ink-50">
    <div className="container-site py-14">
      {heading && <h2 className="mb-10 text-center text-3xl font-bold">{heading}</h2>}
      <dl className="grid gap-8 text-center sm:grid-cols-2 lg:grid-cols-4">
        {(items ?? []).map((item, i) => (
          <div key={i}>
            <dd className="font-heading text-4xl font-bold text-brand-600">{item.value}</dd>
            <dt className="mt-1 text-sm text-ink-500">{item.label}</dt>
          </div>
        ))}
      </dl>
    </div>
  </section>
)
