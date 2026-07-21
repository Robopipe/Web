import React from 'react'

import { Media } from '@/components/Media'
import type { LogoCloudBlock } from '@/payload-types'

export const LogoCloudComponent: React.FC<LogoCloudBlock> = ({ heading, logos }) => (
  <section className="container-site py-12">
    {heading && (
      <p className="mb-8 text-center text-sm font-semibold uppercase tracking-widest text-ink-400">
        {heading}
      </p>
    )}
    <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-8">
      {(logos ?? []).map((entry, i) => {
        const img = (
          <Media
            media={entry.logo}
            size="thumbnail"
            className="h-9 w-auto object-contain opacity-70 grayscale transition hover:opacity-100 hover:grayscale-0"
          />
        )
        return entry.url ? (
          <a key={i} href={entry.url} target="_blank" rel="noopener noreferrer" aria-label={entry.name}>
            {img}
          </a>
        ) : (
          <span key={i} aria-label={entry.name}>
            {img}
          </span>
        )
      })}
    </div>
  </section>
)
