import React from 'react'

import { Media } from '@/components/Media'
import type { MediaBlockType } from '@/payload-types'

export const MediaBlockComponent: React.FC<MediaBlockType> = ({ media, caption }) => (
  <section className="container-site py-12">
    <figure className="mx-auto max-w-4xl">
      <Media media={media} size="hero" className="w-full rounded-lg" />
      {caption && (
        <figcaption className="mt-3 text-center text-sm text-text-60">{caption}</figcaption>
      )}
    </figure>
  </section>
)
