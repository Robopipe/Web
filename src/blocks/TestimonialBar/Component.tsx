import React from 'react'

import { Media } from '@/components/Media'
import type { TestimonialBarBlock } from '@/payload-types'

export const TestimonialBarComponent: React.FC<TestimonialBarBlock> = ({
  heading,
  testimonials,
}) => {
  const items = (testimonials ?? []).filter(
    (t): t is Exclude<typeof t, number> => typeof t !== 'number',
  )
  if (!items.length) return null

  return (
    <section className="bg-ink-900 text-white">
      <div className="container-site py-16 lg:py-20">
        {heading && <h2 className="mb-12 text-center text-3xl font-bold text-white">{heading}</h2>}
        <div className={`grid gap-8 ${items.length > 1 ? 'lg:grid-cols-2' : 'mx-auto max-w-3xl'}`}>
          {items.map((testimonial) => (
            <figure key={testimonial.id} className="rounded-lg bg-ink-800 p-8">
              <blockquote className="text-lg leading-relaxed text-ink-100">
                “{testimonial.quote}”
              </blockquote>
              <figcaption className="mt-6 flex items-center gap-4">
                {testimonial.avatar && typeof testimonial.avatar !== 'number' && (
                  <Media
                    media={testimonial.avatar}
                    size="thumbnail"
                    className="h-11 w-11 rounded-full object-cover"
                  />
                )}
                <div>
                  <p className="font-semibold text-white">{testimonial.personName}</p>
                  <p className="text-sm text-ink-400">
                    {[testimonial.personRole, testimonial.company].filter(Boolean).join(' · ')}
                  </p>
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  )
}
