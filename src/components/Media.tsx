import Image from 'next/image'
import React from 'react'

import type { Media as MediaType } from '@/payload-types'

type Props = {
  media: (number | null | undefined) | MediaType
  size?: 'thumbnail' | 'card' | 'hero' | 'og'
  className?: string
  priority?: boolean
  fill?: boolean
  sizes?: string
}

/** Renders a Payload media doc via next/image; no-op when the relation isn't populated. */
export const Media: React.FC<Props> = ({ media, size, className, priority, fill, sizes }) => {
  if (!media || typeof media === 'number') return null

  const sized = size ? media.sizes?.[size] : undefined
  const url = sized?.url ?? media.url
  const width = sized?.width ?? media.width
  const height = sized?.height ?? media.height
  if (!url) return null

  if (fill) {
    return (
      <Image
        src={url}
        alt={media.alt || ''}
        fill
        className={className}
        priority={priority}
        sizes={sizes}
      />
    )
  }

  if (!width || !height) return null
  return (
    <Image
      src={url}
      alt={media.alt || ''}
      width={width}
      height={height}
      className={className}
      priority={priority}
      sizes={sizes}
    />
  )
}
