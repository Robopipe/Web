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
        {heading && <h2 className="mb-10 text-center">{heading}</h2>}
        <FAQList items={items} />
      </div>
    </section>
  )
}

type FAQListProps = {
  items: Exclude<NonNullable<FAQAccordionBlock['faqs']>[number], number>[]
}

/** The bare card list — reused by SplitSection's FAQ column. */
export const FAQList: React.FC<FAQListProps> = ({ items }) => (
  <div className="flex flex-col gap-3">
    {items.map((faq, i) => (
      <details
        key={faq.id}
        open={i === 0}
        className="group rounded-md border border-border-12 bg-white open:bg-surface-3"
      >
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-6 py-4 text-left font-semibold text-text-heading hover:bg-surface-3 group-open:hover:bg-transparent [&::-webkit-details-marker]:hidden">
          {faq.question}
          <svg
            className="h-5 w-5 shrink-0 text-text-38 transition-transform duration-150 group-open:rotate-45"
            viewBox="0 0 20 20"
            fill="none"
            aria-hidden="true"
          >
            <path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </summary>
        <div className="px-6 pb-5">
          <RichText
            data={faq.answer}
            className="prose prose-sm max-w-none text-text-60 prose-a:text-brand-fg"
          />
        </div>
      </details>
    ))}
  </div>
)
