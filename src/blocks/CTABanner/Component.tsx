import React from 'react'

import { CMSLink } from '@/components/CMSLink'
import { buttonClasses } from '@/components/ui'
import type { CTABannerBlock } from '@/payload-types'

const linkStyles = [
  buttonClasses({ variant: 'filled', size: 'lg' }),
  buttonClasses({ variant: 'outlined-dark', size: 'lg' }),
]

export const CTABannerComponent: React.FC<CTABannerBlock> = ({ heading, text, links }) => (
  <section className="bg-surface-dark">
    <div className="container-site flex flex-col items-center gap-6 py-16 text-center lg:py-20">
      <h2 className="max-w-3xl text-text-invert">{heading}</h2>
      {text && <p className="max-w-2xl text-lg text-text-invert-60">{text}</p>}
      {!!links?.length && (
        <div className="flex flex-wrap justify-center gap-3">
          {links.map((row, i) => (
            <CMSLink key={i} link={row.link} className={linkStyles[i] ?? linkStyles[1]} />
          ))}
        </div>
      )}
    </div>
  </section>
)
