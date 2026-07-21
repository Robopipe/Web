import React from 'react'

import { RichText } from '@/components/RichText'
import type { FAQAccordionBlock } from '@/payload-types'

/** Native <details> accordion — accessible, zero JS, and crawlable for FAQPage schema. */
export const FAQAccordionComponent: React.FC<FAQAccordionBlock> = ({ heading, faqs }) => {
  const items = (faqs ?? []).filter((f): f is Exclude<typeof f, number> => typeof f !== 'number')
  if (!items.length) return null

  return (
    <section className="container-site py-16 lg:py-24">
      <div className="mx-auto max-w-3xl">
        {heading && <h2 className="mb-10 text-center text-3xl font-bold">{heading}</h2>}
        <div className="divide-y divide-ink-100 rounded-lg border border-ink-100">
          {items.map((faq) => (
            <details key={faq.id} className="group px-6 py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-left font-semibold text-ink-900 [&::-webkit-details-marker]:hidden">
                {faq.question}
                <svg
                  className="h-5 w-5 shrink-0 text-ink-400 transition-transform group-open:rotate-180"
                  viewBox="0 0 20 20"
                  fill="none"
                  aria-hidden="true"
                >
                  <path d="M5 8l5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </summary>
              <div className="pt-3">
                <RichText
                  data={faq.answer}
                  className="prose prose-sm prose-slate max-w-none prose-a:text-brand-700"
                />
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}
