import React from 'react'

import { Media } from '@/components/Media'
import { Chip } from '@/components/ui'
import type { IndustrySectionBlock } from '@/payload-types'

export const IndustrySectionComponent: React.FC<IndustrySectionBlock> = ({
  anchor,
  chip,
  heading,
  text,
  image,
  imageSide,
  background,
  bullets,
  stats,
}) => {
  const imageRight = imageSide === 'right'

  return (
    <section
      id={anchor || undefined}
      className={background === 'tinted' ? 'bg-surface-3' : 'bg-surface-page'}
    >
      <div className="container-site grid items-center gap-10 py-16 lg:grid-cols-2 lg:gap-16 lg:py-20">
        {image && typeof image !== 'number' && (
          <div
            className={`min-h-[280px] overflow-hidden rounded-lg lg:min-h-[360px] ${
              imageRight ? 'lg:order-2' : ''
            }`}
          >
            <Media media={image} size="card" className="h-full w-full object-cover" />
          </div>
        )}
        <div className={imageRight ? 'lg:order-1' : ''}>
          {chip && <Chip className="mb-4">{chip}</Chip>}
          <h2 className="text-[32px] leading-10 lg:text-[36px] lg:leading-[46px]">{heading}</h2>
          {text && <p className="mt-4 text-lg leading-relaxed text-text-60">{text}</p>}
          {!!bullets?.length && (
            <ul className="mt-6 space-y-3">
              {bullets.map((bullet, i) => (
                <li key={i} className="flex items-start gap-3 text-[15px] text-text-90">
                  <svg
                    className="mt-1 h-4 w-4 shrink-0 text-brand-fg"
                    viewBox="0 0 16 16"
                    fill="none"
                    aria-hidden="true"
                  >
                    <path
                      d="M3 8.5l3.5 3.5L13 4.5"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                  {bullet.text}
                </li>
              ))}
            </ul>
          )}
          {!!stats?.length && (
            <dl className="mt-8 flex gap-12 border-t border-border-12 pt-6">
              {stats.map((stat, i) => (
                <div key={i}>
                  <dd className="font-numbers text-[32px] leading-10 font-semibold text-text-heading">
                    {stat.value}
                  </dd>
                  <dt className="mt-0.5 text-[13px] text-text-60">{stat.label}</dt>
                </div>
              ))}
            </dl>
          )}
        </div>
      </div>
    </section>
  )
}
