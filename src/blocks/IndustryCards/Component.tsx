'use client'

import { useLocale } from 'next-intl'
import Link from 'next/link'
import React from 'react'

import { hrefFor } from '@/components/CMSLink'
import { Media } from '@/components/Media'
import type { Locale } from '@/i18n/routing'
import type { IndustryCardsBlock } from '@/payload-types'

export const IndustryCardsComponent: React.FC<IndustryCardsBlock> = ({ heading, text, cards }) => {
  const locale = useLocale() as Locale

  return (
    <section className="container-site py-16 lg:py-24">
      {(heading || text) && (
        <div className="mx-auto mb-12 max-w-2xl text-center">
          {heading && <h2>{heading}</h2>}
          {text && <p className="mt-4 text-lg text-text-60">{text}</p>}
        </div>
      )}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {(cards ?? []).map((card, i) => {
          const href = hrefFor(card.link, locale)
          const body = (
            <>
              {card.image && typeof card.image !== 'number' && (
                <div className="aspect-4/3 overflow-hidden">
                  <Media media={card.image} size="card" className="h-full w-full object-cover" />
                </div>
              )}
              <div className="flex flex-1 flex-col gap-2 p-5">
                <h3 className="text-lg leading-6 font-bold tracking-normal">{card.title}</h3>
                {card.text && (
                  <p className="text-[13px] leading-relaxed text-text-60">{card.text}</p>
                )}
                {href && card.exploreLabel && (
                  <span className="mt-auto pt-2 text-sm font-medium text-brand-fg">
                    {card.exploreLabel} →
                  </span>
                )}
              </div>
            </>
          )
          const cardClasses =
            'flex flex-col overflow-hidden rounded-lg border border-border-12 bg-white transition-shadow'
          return href ? (
            <Link key={i} href={href} className={`${cardClasses} hover:shadow-lift`}>
              {body}
            </Link>
          ) : (
            <div key={i} className={cardClasses}>
              {body}
            </div>
          )
        })}
      </div>
    </section>
  )
}
