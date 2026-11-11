import { getImageProps } from 'next/image'
import React from 'react'

import { CMSLink } from '@/components/CMSLink'
import { Media, relativize } from '@/components/Media'
import { buttonClasses, Chip } from '@/components/ui'
import type { HeroBlock, Media as MediaType } from '@/payload-types'

import { HeroVideo } from './HeroVideo'

/** Rendered width of the hero media: full container when centred, one column when split. */
const SIZES = {
  centered: '(min-width: 1152px) 1088px, 100vw',
  split: '(min-width: 1152px) 520px, (min-width: 1024px) 50vw, 100vw',
}

/**
 * Optimised poster URL from the block's image, if set. A video has no frame of
 * its own in the media library, so the image is the only poster source.
 */
const posterUrl = (image: HeroBlock['image']): string | undefined => {
  const media = image && typeof image !== 'number' ? (image as MediaType) : null
  const sized = media?.sizes?.hero
  const url = sized?.url ?? media?.url
  const width = sized?.width ?? media?.width
  const height = sized?.height ?? media?.height
  if (!url || !width || !height) return undefined
  // 540 CSS px at 2x gives the 1080 px variant: sharp on phones, light enough for desktop.
  return getImageProps({
    src: relativize(url),
    alt: '',
    width: 540,
    height: Math.round((540 * height) / width),
  }).props.src
}

const linkStyles = [
  buttonClasses({ variant: 'filled', size: 'lg' }),
  buttonClasses({ variant: 'outlined', size: 'lg' }),
]

export const HeroComponent: React.FC<HeroBlock> = ({
  eyebrow,
  heading,
  text,
  links,
  video,
  image,
  trust,
  variant,
}) => {
  const centered = variant !== 'split'
  const videoDoc = video && typeof video !== 'number' ? video : null
  const trustItems = trust?.items ?? []

  return (
    <section className="bg-surface-page">
      <div
        className={
          centered
            ? 'container-site flex flex-col items-center gap-6 pt-16 pb-12 text-center lg:pt-20'
            : 'container-site grid items-center gap-12 py-16 lg:grid-cols-2 lg:py-20'
        }
      >
        <div className={centered ? 'flex max-w-3xl flex-col items-center gap-6' : 'space-y-6'}>
          {eyebrow && <Chip>{eyebrow}</Chip>}
          <h1>{heading}</h1>
          {text && <p className="max-w-2xl text-lg leading-8 text-text-60 lg:text-xl">{text}</p>}
          {!!links?.length && (
            <div className={`flex flex-wrap gap-3 ${centered ? 'justify-center' : ''}`}>
              {links.map((row, i) => (
                <CMSLink key={i} link={row.link} className={linkStyles[i] ?? linkStyles[1]} />
              ))}
            </div>
          )}
        </div>

        {(videoDoc?.url || (image && typeof image !== 'number')) && (
          <div className={centered ? 'mt-4 w-full' : ''}>
            {videoDoc?.url ? (
              <HeroVideo
                src={videoDoc.url}
                poster={posterUrl(image)}
                className="h-[280px] w-full rounded-xl bg-brand-tint object-cover sm:h-[360px] lg:h-[420px]"
              />
            ) : (
              <Media
                media={image}
                size="hero"
                className="h-[280px] w-full rounded-xl object-cover sm:h-[360px] lg:h-[420px]"
                priority
                sizes={centered ? SIZES.centered : SIZES.split}
              />
            )}
          </div>
        )}

        {(trust?.label || trustItems.length > 0) && (
          <div className="flex w-full flex-wrap items-center justify-center gap-x-8 gap-y-2 text-sm text-text-60">
            {trust?.label && <span className="text-text-38">{trust.label}</span>}
            {trustItems.map((item, i) => (
              <span key={i} className="font-medium text-text-90">
                {item.text}
              </span>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
