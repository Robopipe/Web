import { useLocale } from 'next-intl'
import Link from 'next/link'
import React from 'react'

import { Media } from '@/components/Media'
import type { Locale } from '@/i18n/routing'
import { pathFor } from '@/lib/paths'
import type { UseCaseCardsBlock } from '@/payload-types'

export const UseCaseCardsComponent: React.FC<UseCaseCardsBlock> = ({ heading, text, cards }) => {
  const locale = useLocale() as Locale

  return (
    <section className="container-site py-16 lg:py-24">
      {(heading || text) && (
        <div className="mx-auto mb-12 max-w-2xl text-center">
          {heading && <h2 className="text-3xl font-bold sm:text-4xl">{heading}</h2>}
          {text && <p className="mt-4 text-lg text-ink-500">{text}</p>}
        </div>
      )}
      <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
        {(cards ?? []).map((card, i) => {
          const page = card.page && typeof card.page !== 'number' ? card.page : null
          const href = page?.slug ? pathFor('pages', page.slug, locale) : null
          const body = (
            <>
              {card.image && typeof card.image !== 'number' && (
                <Media
                  media={card.image}
                  size="card"
                  className="mb-4 aspect-video w-full rounded-md object-cover"
                />
              )}
              <h3 className="text-lg font-semibold group-hover:text-brand-700">{card.title}</h3>
              {card.text && <p className="mt-2 text-sm leading-relaxed text-ink-500">{card.text}</p>}
            </>
          )
          return href ? (
            <Link key={i} href={href} className="group rounded-lg border border-ink-100 p-5 transition hover:border-brand-300 hover:shadow-sm">
              {body}
            </Link>
          ) : (
            <div key={i} className="rounded-lg border border-ink-100 p-5">
              {body}
            </div>
          )
        })}
      </div>
    </section>
  )
}
