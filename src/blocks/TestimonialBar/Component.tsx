import React from 'react'

import { CMSLink } from '@/components/CMSLink'
import { Chip } from '@/components/ui'
import type { TestimonialBarBlock } from '@/payload-types'

export const TestimonialBarComponent: React.FC<TestimonialBarBlock> = ({
  eyebrow,
  heading,
  testimonials,
  link,
}) => {
  const items = (testimonials ?? []).filter(
    (t): t is Exclude<typeof t, number> => typeof t !== 'number',
  )
  if (!items.length) return null

  const single = items.length === 1
  const inlineLink = link?.link

  return (
    <section className="bg-surface-page">
      <div className="container-site py-16 lg:py-20">
        {heading && <h2 className="mb-12 text-center">{heading}</h2>}
        {single ? (
          <figure className="mx-auto flex max-w-3xl flex-col items-center gap-6 text-center">
            {eyebrow && <Chip>{eyebrow}</Chip>}
            <blockquote className="font-heading text-[24px] leading-9 font-medium text-text-heading lg:text-[28px] lg:leading-10">
              “{items[0].quote}”
            </blockquote>
            <figcaption className="text-sm text-text-60">
              {[items[0].personRole, items[0].company].filter(Boolean).join(' · ') ||
                items[0].personName}
              {inlineLink?.label && (
                <>
                  {' · '}
                  <CMSLink
                    link={inlineLink}
                    className="font-medium text-brand-fg hover:text-brand-fg-hover"
                  />
                </>
              )}
            </figcaption>
          </figure>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            {items.map((testimonial) => (
              <figure
                key={testimonial.id}
                className="rounded-lg border border-border-12 bg-white p-8"
              >
                <blockquote className="text-lg leading-relaxed text-text-90">
                  “{testimonial.quote}”
                </blockquote>
                <figcaption className="mt-6">
                  <p className="font-semibold text-text-heading">{testimonial.personName}</p>
                  <p className="text-sm text-text-60">
                    {[testimonial.personRole, testimonial.company].filter(Boolean).join(' · ')}
                  </p>
                </figcaption>
              </figure>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
