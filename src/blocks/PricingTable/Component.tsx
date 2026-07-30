import React from 'react'

import { CMSLink } from '@/components/CMSLink'
import { buttonClasses } from '@/components/ui'
import type { PricingTableBlock } from '@/payload-types'

const CheckIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path d="M3 8.5l3.5 3.5L13 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
)

export const PricingTableComponent: React.FC<PricingTableBlock> = ({
  heading,
  text,
  tiers,
  footnote,
}) => (
  <section className="container-site py-16 lg:py-24">
    {(heading || text) && (
      <div className="mx-auto mb-12 max-w-2xl text-center">
        {heading && <h2>{heading}</h2>}
        {text && <p className="mt-4 text-lg text-text-60">{text}</p>}
      </div>
    )}
    <div className="grid items-start gap-6 lg:grid-cols-3">
      {(tiers ?? []).map((tier, i) => {
        const dark = Boolean(tier.highlighted)
        return (
          <div
            key={i}
            className={
              dark
                ? 'relative rounded-lg bg-surface-dark p-8 text-text-invert shadow-lift'
                : 'rounded-lg border border-border-12 bg-white p-8'
            }
          >
            <div className="flex items-center justify-between gap-3">
              <h3 className={`text-xl leading-7 ${dark ? 'text-text-invert' : ''}`}>{tier.name}</h3>
              {dark && tier.badge && (
                <span className="rounded-full bg-brand px-3 py-1 text-xs font-semibold text-brand-ink">
                  {tier.badge}
                </span>
              )}
            </div>
            {tier.tagline && (
              <p className={`mt-2 text-sm ${dark ? 'text-text-invert-60' : 'text-text-60'}`}>
                {tier.tagline}
              </p>
            )}
            <div className="mt-5">
              <span
                className={`font-numbers text-[40px] leading-12 font-semibold ${
                  dark ? 'text-text-invert' : 'text-text-heading'
                }`}
              >
                {tier.price}
              </span>
              {tier.period && (
                <span className={`block text-sm ${dark ? 'text-text-invert-60' : 'text-text-60'}`}>
                  {tier.period}
                </span>
              )}
            </div>
            {tier.subNote && (
              <p className={`mt-1 text-[13px] ${dark ? 'text-text-invert-60' : 'text-text-38'}`}>
                {tier.subNote}
              </p>
            )}
            {tier.cta?.label && (
              <CMSLink
                link={tier.cta}
                className={buttonClasses({
                  variant:
                    tier.ctaVariant === 'filled' ? 'filled' : dark ? 'outlined-dark' : 'outlined',
                  className: 'mt-6 w-full',
                })}
              />
            )}
            {(tier.featuresLeadIn || !!tier.features?.length) && (
              <ul className="mt-7 space-y-2.5">
                {tier.featuresLeadIn && (
                  <li
                    className={`text-sm font-semibold ${
                      dark ? 'text-text-invert' : 'text-text-heading'
                    }`}
                  >
                    {tier.featuresLeadIn}
                  </li>
                )}
                {(tier.features ?? []).map((feature, j) => (
                  <li
                    key={j}
                    className={`flex items-start gap-2.5 text-sm ${
                      dark ? 'text-text-invert-60' : 'text-text-90'
                    }`}
                  >
                    <CheckIcon
                      className={`mt-0.5 h-4 w-4 shrink-0 ${dark ? 'text-brand' : 'text-brand-fg'}`}
                    />
                    {feature.text}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )
      })}
    </div>
    {footnote && <p className="mt-8 text-center text-[13px] text-text-38">{footnote}</p>}
  </section>
)
