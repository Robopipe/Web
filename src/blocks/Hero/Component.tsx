import React from 'react'

import { CMSLink } from '@/components/CMSLink'
import { Media } from '@/components/Media'
import { buttonClasses, Chip } from '@/components/ui'
import type { HeroBlock } from '@/payload-types'

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
          {text && (
            <p className="max-w-2xl text-lg leading-8 text-text-60 lg:text-xl">{text}</p>
          )}
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
              <video
                autoPlay
                muted
                loop
                playsInline
                src={videoDoc.url}
                className="h-[280px] w-full rounded-xl bg-brand-tint object-cover sm:h-[360px] lg:h-[420px]"
              />
            ) : (
              <Media
                media={image}
                size="hero"
                className="h-[280px] w-full rounded-xl object-cover sm:h-[360px] lg:h-[420px]"
                priority
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
