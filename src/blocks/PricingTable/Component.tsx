import React from 'react'

import { CMSLink } from '@/components/CMSLink'
import type { PricingTableBlock } from '@/payload-types'

export const PricingTableComponent: React.FC<PricingTableBlock> = ({
  heading,
  text,
  tiers,
  footnote,
}) => (
  <section className="container-site py-16 lg:py-24">
    {(heading || text) && (
      <div className="mx-auto mb-12 max-w-2xl text-center">
        {heading && <h2 className="text-3xl font-bold sm:text-4xl">{heading}</h2>}
        {text && <p className="mt-4 text-lg text-ink-500">{text}</p>}
      </div>
    )}
    <div className="grid gap-8 lg:grid-cols-3">
      {(tiers ?? []).map((tier, i) => (
        <div
          key={i}
          className={
            tier.highlighted
              ? 'relative rounded-lg border-2 border-brand-500 bg-white p-8 shadow-lg'
              : 'rounded-lg border border-ink-100 bg-white p-8'
          }
        >
          <h3 className="text-lg font-semibold">{tier.name}</h3>
          <p className="mt-4">
            <span className="font-heading text-3xl font-bold text-ink-900">{tier.price}</span>
            {tier.period && <span className="ml-1 text-sm text-ink-500">{tier.period}</span>}
          </p>
          {tier.description && (
            <p className="mt-3 text-sm leading-relaxed text-ink-500">{tier.description}</p>
          )}
          {!!tier.features?.length && (
            <ul className="mt-6 space-y-2.5">
              {tier.features.map((feature, j) => (
                <li key={j} className="flex items-start gap-2 text-sm text-ink-700">
                  <svg
                    className="mt-0.5 h-4 w-4 shrink-0 text-brand-600"
                    viewBox="0 0 16 16"
                    fill="none"
                    aria-hidden="true"
                  >
                    <path
                      d="M3 8.5l3.5 3.5L13 4.5"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                  {feature.text}
                </li>
              ))}
            </ul>
          )}
          {tier.cta?.label && (
            <CMSLink
              link={tier.cta}
              className={
                tier.highlighted
                  ? 'mt-8 block rounded-md bg-brand-500 px-5 py-3 text-center text-sm font-semibold text-ink-900 transition-colors hover:bg-brand-400'
                  : 'mt-8 block rounded-md border border-ink-200 px-5 py-3 text-center text-sm font-semibold text-ink-800 transition-colors hover:border-ink-400'
              }
            />
          )}
        </div>
      ))}
    </div>
    {footnote && <p className="mt-6 text-center text-xs text-ink-400">{footnote}</p>}
  </section>
)
