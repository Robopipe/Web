import React from 'react'

import { CMSLink } from '@/components/CMSLink'
import type { CTABannerBlock } from '@/payload-types'

export const CTABannerComponent: React.FC<CTABannerBlock> = ({ heading, text, link }) => (
  <section className="container-site py-16">
    <div className="rounded-xl bg-ink-900 px-8 py-14 text-center">
      <h2 className="text-3xl font-bold text-white sm:text-4xl">{heading}</h2>
      {text && <p className="mx-auto mt-4 max-w-2xl text-lg text-ink-300">{text}</p>}
      {link?.label && (
        <CMSLink
          link={link}
          className="mt-8 inline-block rounded-md bg-brand-500 px-6 py-3 text-sm font-semibold text-ink-900 transition-colors hover:bg-brand-400"
        />
      )}
    </div>
  </section>
)
