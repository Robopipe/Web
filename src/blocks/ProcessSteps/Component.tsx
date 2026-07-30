import React from 'react'

import { CMSLink } from '@/components/CMSLink'
import { Media } from '@/components/Media'
import { buttonClasses } from '@/components/ui'
import type { ProcessStepsBlock } from '@/payload-types'

export const ProcessStepsComponent: React.FC<ProcessStepsBlock> = ({
  heading,
  text,
  image,
  steps,
  cta,
  stats,
}) => (
  <section className="bg-surface-dark">
    <div className="container-site py-16 lg:py-24">
      <div className="mx-auto mb-14 max-w-2xl text-center">
        <h2 className="text-text-invert">{heading}</h2>
        {text && <p className="mt-4 text-lg text-text-invert-60">{text}</p>}
      </div>

      <div className="grid items-center gap-10 lg:grid-cols-2">
        {image && typeof image !== 'number' && (
          <div className="min-h-[320px] overflow-hidden rounded-lg">
            <Media media={image} size="card" className="h-full w-full object-cover" fill={false} />
          </div>
        )}
        <div className="flex flex-col gap-8">
          {(steps ?? []).map((step, i) => (
            <div key={i} className="flex gap-5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand font-numbers text-base font-semibold text-brand-ink">
                {i + 1}
              </div>
              <div>
                <h5 className="text-text-invert">{step.title}</h5>
                {step.text && (
                  <p className="mt-1.5 text-sm leading-relaxed text-text-invert-60">{step.text}</p>
                )}
              </div>
            </div>
          ))}
          {cta?.link?.label && (
            <div>
              <CMSLink link={cta.link} className={buttonClasses()} />
            </div>
          )}
        </div>
      </div>

      {!!stats?.length && (
        <dl className="mt-14 grid grid-cols-2 gap-8 border-t border-border-invert-12 pt-10 text-center sm:grid-cols-3 lg:grid-cols-5">
          {stats.map((item, i) => (
            <div key={i}>
              <dd className="font-numbers text-[40px] leading-12 font-semibold text-text-invert">
                {item.value}
              </dd>
              <dt className="mt-1 text-[13px] text-text-invert-60">{item.label}</dt>
            </div>
          ))}
        </dl>
      )}
    </div>
  </section>
)
