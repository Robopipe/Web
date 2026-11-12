import Image from 'next/image'
import React from 'react'

import { DEFAULT_SIZES } from '@/lib/imageSizes'
import { SERVER_URL } from '@/lib/paths'
import type { Media as MediaType } from '@/payload-types'

/** Same-origin media URLs become relative so next/image's localPatterns match them. */
export const relativize = (url: string): string =>
  url.startsWith(SERVER_URL) ? url.slice(SERVER_URL.length) : url

type Props = {
  media: (number | null | undefined) | MediaType
  size?: 'thumbnail' | 'card' | 'hero' | 'og'
  className?: string
  priority?: boolean
  /** `eager` loads at once without the high priority of `priority`. */
  loading?: 'eager' | 'lazy'
  fill?: boolean
  /** Rendered width for the browser's choice from `srcset`. Defaults to the container width. */
  sizes?: string
}

/** Renders a Payload media doc via next/image; no-op when the relation isn't populated. */
export const Media: React.FC<Props> = ({
  media,
  size,
  className,
  priority,
  loading,
  fill,
  sizes = DEFAULT_SIZES,
}) => {
  if (!media || typeof media === 'number') return null

  const sized = size ? media.sizes?.[size] : undefined
  const rawUrl = sized?.url ?? media.url
  const width = sized?.width ?? media.width
  const height = sized?.height ?? media.height
  if (!rawUrl) return null
  const url = relativize(rawUrl)

  const style =
    media.focalX != null && media.focalY != null
      ? { objectPosition: `${media.focalX}% ${media.focalY}%` }
      : undefined

  if (fill) {
    return (
      <Image
        src={url}
        alt={media.alt || ''}
        fill
        className={className}
        style={style}
        priority={priority}
        loading={loading}
        fetchPriority={priority ? 'high' : undefined}
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
      style={style}
      priority={priority}
      loading={loading}
      fetchPriority={priority ? 'high' : undefined}
      sizes={sizes}
    />
  )
}
