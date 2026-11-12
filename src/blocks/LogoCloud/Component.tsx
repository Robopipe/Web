import { getLocale } from 'next-intl/server'
import React from 'react'

import { Media } from '@/components/Media'
import { Eyebrow } from '@/components/ui'
import type { Locale } from '@/i18n/routing'
import { fixedHeightSizes } from '@/lib/imageSizes'
import { getGlobals } from '@/lib/queries'
import type { LogoCloudBlock } from '@/payload-types'

type LogoEntry = {
  logo: NonNullable<LogoCloudBlock['logos']>[number]['logo']
  name: string
  url?: string | null
}

/** `source: 'memberships'` shows site-settings.memberships, the same logos as the footer. */
const logosFor = async (block: LogoCloudBlock): Promise<LogoEntry[]> => {
  if (block.source !== 'memberships') return block.logos ?? []
  const { settings } = await getGlobals((await getLocale()) as Locale)
  return settings.memberships ?? []
}

export const LogoCloudComponent: React.FC<LogoCloudBlock> = async (block) => {
  const logos = await logosFor(block)
  if (!logos.length) return null

  return (
    <section className="container-site py-12">
      <div className="border-t border-border-12 pt-10">
        {block.heading && <Eyebrow className="mb-8 text-center">{block.heading}</Eyebrow>}
        <div className="flex flex-wrap items-center justify-center gap-x-14 gap-y-8">
          {logos.map((entry, i) => {
            const img = (
              <Media
                media={entry.logo}
                size="thumbnail"
                sizes={fixedHeightSizes(48, typeof entry.logo === 'number' ? null : entry.logo)}
                className="h-12 w-auto object-contain opacity-80 grayscale transition hover:opacity-100 hover:grayscale-0"
              />
            )
            return entry.url ? (
              <a
                key={i}
                href={entry.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={entry.name}
              >
                {img}
              </a>
            ) : (
              <span key={i} aria-label={entry.name}>
                {img}
              </span>
            )
          })}
        </div>
      </div>
    </section>
  )
}
