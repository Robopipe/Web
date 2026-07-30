import React from 'react'

import { Icon, iconData, type IconName } from '@/components/icons'
import { Media } from '@/components/Media'
import type { FeatureGridBlock } from '@/payload-types'

const columnClasses: Record<string, string> = {
  '2': 'sm:grid-cols-2',
  '3': 'sm:grid-cols-2 lg:grid-cols-3',
  '4': 'sm:grid-cols-2 lg:grid-cols-4',
}

export const FeatureGridComponent: React.FC<FeatureGridBlock> = ({
  heading,
  text,
  background,
  columns,
  features,
}) => {
  const dark = background === 'dark'

  return (
    <section className={dark ? 'bg-surface-dark' : 'bg-surface-page'}>
      <div className="container-site py-16 lg:py-24">
        {(heading || text) && (
          <div className="mx-auto mb-12 max-w-2xl text-center">
            {heading && <h2 className={dark ? 'text-text-invert' : undefined}>{heading}</h2>}
            {text && (
              <p className={`mt-4 text-lg ${dark ? 'text-text-invert-60' : 'text-text-60'}`}>
                {text}
              </p>
            )}
          </div>
        )}
        <div className={`grid gap-6 ${columnClasses[columns ?? '3']}`}>
          {(features ?? []).map((feature, i) => {
            const icon =
              feature.icon && feature.icon in iconData ? (feature.icon as IconName) : null
            const framed = feature.imageStyle === 'framed'
            const hasImage = feature.image && typeof feature.image !== 'number'

            return (
              <div
                key={i}
                className={
                  dark
                    ? 'rounded-lg p-2'
                    : 'overflow-hidden rounded-lg border border-border-12 bg-white'
                }
              >
                {hasImage && (
                  <div
                    className={
                      framed
                        ? 'flex aspect-16/10 items-center justify-center bg-linear-160 from-gray-800 to-gray-950 p-6'
                        : 'aspect-16/10 overflow-hidden'
                    }
                  >
                    <Media
                      media={feature.image}
                      size="card"
                      className={
                        framed
                          ? 'max-h-full w-auto max-w-[85%] rounded-[6px] shadow-lift'
                          : 'h-full w-full object-cover'
                      }
                    />
                  </div>
                )}
                <div className={hasImage ? 'p-6' : dark ? '' : 'p-6'}>
                  {icon && (
                    <div
                      className={`mb-4 flex h-10 w-10 items-center justify-center rounded-sm bg-brand-tint ${
                        dark ? 'text-brand' : 'text-brand-fg'
                      }`}
                    >
                      <Icon name={icon} size={22} />
                    </div>
                  )}
                  <h5 className={dark ? 'text-text-invert' : undefined}>{feature.title}</h5>
                  {feature.text && (
                    <p
                      className={`mt-2 text-sm leading-relaxed ${
                        dark ? 'text-text-invert-60' : 'text-text-60'
                      }`}
                    >
                      {feature.text}
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
