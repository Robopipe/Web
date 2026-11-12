import React from 'react'

import { CMSLink } from '@/components/CMSLink'
import { Media } from '@/components/Media'
import { buttonClasses, Chip } from '@/components/ui'
import type { HeroBlock } from '@/payload-types'

import { HeroVideo } from './HeroVideo'

/** Rendered width of the hero media: full container when centred, one column when split. */
const SIZES = {
  centered: '(min-width: 1152px) 1088px, 100vw',
  split: '(min-width: 1152px) 520px, (min-width: 1024px) 50vw, 100vw',
}

/** Fixed box of the hero media, so a video or a late image never moves the layout. */
const MEDIA_BOX = 'h-[280px] w-full sm:h-[360px] lg:h-[420px]'

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
  mobileVideo,
  image,
  trust,
  variant,
}) => {
  const centered = variant !== 'split'
  const videoDoc = video && typeof video !== 'number' ? video : null
  const mobileVideoDoc = mobileVideo && typeof mobileVideo !== 'number' ? mobileVideo : null
  const sizes = centered ? SIZES.centered : SIZES.split
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
              // The image is the poster: a responsive next/image under the video, without
              // high priority (the hero text is the LCP element on phones). The video is
              // transparent until its first frame and then covers the image (issue #30).
              <div className={`relative overflow-hidden rounded-xl bg-brand-tint ${MEDIA_BOX}`}>
                <Media
                  media={image}
                  size="hero"
                  fill
                  loading="eager"
                  sizes={sizes}
                  className="object-cover"
                />
                <HeroVideo
                  src={videoDoc.url}
                  mobileSrc={mobileVideoDoc?.url}
                  className="absolute inset-0 h-full w-full object-cover"
                />
              </div>
            ) : (
              <Media
                media={image}
                size="hero"
                className={`${MEDIA_BOX} rounded-xl object-cover`}
                priority
                sizes={sizes}
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
