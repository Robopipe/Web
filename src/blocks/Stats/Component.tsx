import React from 'react'

import type { StatsBlock } from '@/payload-types'

export const StatsComponent: React.FC<StatsBlock> = ({ heading, background, items }) => {
  const dark = background === 'dark'

  return (
    <section className={dark ? 'bg-surface-dark' : 'bg-surface-3'}>
      <div className="container-site py-14">
        {heading && (
          <h2 className={`mb-10 text-center ${dark ? 'text-text-invert' : ''}`}>{heading}</h2>
        )}
        <dl className="grid grid-cols-2 gap-8 text-center sm:grid-cols-3 lg:grid-cols-5">
          {(items ?? []).map((item, i) => (
            <div key={i}>
              <dd
                className={`font-numbers text-[40px] leading-12 font-semibold ${
                  dark ? 'text-text-invert' : 'text-text-heading'
                }`}
              >
                {item.value}
              </dd>
              <dt className={`mt-1 text-[13px] ${dark ? 'text-text-invert-60' : 'text-text-60'}`}>
                {item.label}
              </dt>
            </div>
          ))}
        </dl>
      </div>
    </section>
  )
}
