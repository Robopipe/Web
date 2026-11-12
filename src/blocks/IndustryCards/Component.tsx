import { getLocale, getTranslations } from 'next-intl/server'
import Link from 'next/link'
import React from 'react'

import { hrefFor } from '@/components/CMSLink'
import { Media } from '@/components/Media'
import type { Locale } from '@/i18n/routing'
import { gridSizes } from '@/lib/imageSizes'
import { getSolutionPages } from '@/lib/queries'
import type { IndustryCardsBlock, Media as MediaType } from '@/payload-types'

type Card = {
  title: string
  text?: string | null
  image?: MediaType | null
  href: string | null
  linkLabel?: string | null
}

/** An SVG card image is a line illustration: no frame, the whole drawing, centred text. */
const isIllustration = (card: Card): boolean => card.image?.mimeType === 'image/svg+xml'

/** `source: 'solutions'` shows site-settings.solutions, the same pages as the footer column. */
const cardsFor = async (block: IndustryCardsBlock, locale: Locale): Promise<Card[]> => {
  if (block.source === 'solutions') {
    const t = await getTranslations({ locale, namespace: 'common' })
    return (await getSolutionPages(locale)).map((page) => ({
      title: page.title,
      text: page.description,
      image: page.image,
      href: page.path,
      linkLabel: t('readMore'),
    }))
  }
  return (block.cards ?? []).map((card) => ({
    title: card.title,
    text: card.text,
    image: card.image && typeof card.image !== 'number' ? card.image : null,
    href: hrefFor(card.link, locale),
    linkLabel: card.exploreLabel,
  }))
}

export const IndustryCardsComponent: React.FC<IndustryCardsBlock> = async (block) => {
  const { heading, text } = block
  const locale = (await getLocale()) as Locale
  const cards = await cardsFor(block, locale)
  if (!cards.length) return null
  // Six solution pages fill two rows of three. Otherwise four per row, as before.
  const lgColumns = cards.length % 3 === 0 && cards.length % 4 !== 0 ? 3 : 4

  return (
    <section className="container-site py-16 lg:py-24">
      {(heading || text) && (
        <div className="mx-auto mb-12 max-w-2xl text-center">
          {heading && <h2>{heading}</h2>}
          {text && <p className="mt-4 text-lg text-text-60">{text}</p>}
        </div>
      )}
      <div
        className={`grid sm:grid-cols-2 ${lgColumns === 3 ? 'lg:grid-cols-3' : 'lg:grid-cols-4'} ${cards.every(isIllustration) ? 'mx-auto max-w-80 gap-x-7 gap-y-14 sm:max-w-none' : 'gap-5'}`}
      >
        {cards.map((card, i) => {
          if (isIllustration(card)) {
            const illustration = (
              <>
                <div className="relative aspect-280/184 w-full">
                  <Media media={card.image} fill sizes="320px" className="object-contain" />
                </div>
                <h3 className="mt-5 text-lg leading-6 font-bold tracking-normal">{card.title}</h3>
                {card.text && (
                  <p className="mt-2 max-w-65 text-[13px] leading-relaxed text-text-60">
                    {card.text}
                  </p>
                )}
                {card.href && card.linkLabel && (
                  <span className="mt-3 text-sm font-medium text-brand-fg">{card.linkLabel} →</span>
                )}
              </>
            )
            const illustrationClasses = 'flex flex-col items-center text-center'
            return card.href ? (
              <Link key={i} href={card.href} className={illustrationClasses}>
                {illustration}
              </Link>
            ) : (
              <div key={i} className={illustrationClasses}>
                {illustration}
              </div>
            )
          }
          const body = (
            <>
              {card.image && (
                <div className="aspect-4/3 overflow-hidden">
                  <Media
                    media={card.image}
                    size="card"
                    sizes={gridSizes(lgColumns, 20)}
                    className="h-full w-full object-cover"
                  />
                </div>
              )}
              <div className="flex flex-1 flex-col gap-2 p-5">
                <h3 className="text-lg leading-6 font-bold tracking-normal">{card.title}</h3>
                {card.text && (
                  <p className="text-[13px] leading-relaxed text-text-60">{card.text}</p>
                )}
                {card.href && card.linkLabel && (
                  <span className="mt-auto pt-2 text-sm font-medium text-brand-fg">
                    {card.linkLabel} →
                  </span>
                )}
              </div>
            </>
          )
          const cardClasses =
            'flex flex-col overflow-hidden rounded-lg border border-border-12 bg-white transition-shadow'
          return card.href ? (
            <Link key={i} href={card.href} className={`${cardClasses} hover:shadow-lift`}>
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
