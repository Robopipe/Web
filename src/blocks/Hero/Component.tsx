import React from 'react'

import { CMSLink } from '@/components/CMSLink'
import { Media } from '@/components/Media'
import type { HeroBlock } from '@/payload-types'

const buttonStyles = [
  'rounded-md bg-brand-500 px-5 py-3 text-sm font-semibold text-ink-900 transition-colors hover:bg-brand-400',
  'rounded-md border border-ink-200 px-5 py-3 text-sm font-semibold text-ink-800 transition-colors hover:border-ink-400',
]

export const HeroComponent: React.FC<HeroBlock> = ({
  eyebrow,
  heading,
  text,
  links,
  image,
  variant,
}) => {
  const centered = variant === 'centered'

  return (
    <section className="bg-ink-900 text-white">
      <div
        className={
          centered
            ? 'container-site flex flex-col items-center gap-8 py-20 text-center lg:py-28'
            : 'container-site grid items-center gap-12 py-20 lg:grid-cols-2 lg:py-28'
        }
      >
        <div className={centered ? 'max-w-3xl space-y-6' : 'space-y-6'}>
          {eyebrow && (
            <p className="text-sm font-semibold uppercase tracking-widest text-brand-300">
              {eyebrow}
            </p>
          )}
          <h1 className="font-heading text-4xl font-bold leading-tight text-white sm:text-5xl">
            {heading}
          </h1>
          {text && <p className="text-lg leading-relaxed text-ink-300">{text}</p>}
          {!!links?.length && (
            <div className={`flex flex-wrap gap-3 ${centered ? 'justify-center' : ''}`}>
              {links.map((row, i) => (
                <CMSLink key={i} link={row.link} className={buttonStyles[i] ?? buttonStyles[1]} />
              ))}
            </div>
          )}
        </div>
        {image && typeof image !== 'number' && (
          <div className={centered ? 'w-full max-w-4xl' : ''}>
            <Media media={image} size="hero" className="w-full rounded-lg" priority />
          </div>
        )}
      </div>
    </section>
  )
}
