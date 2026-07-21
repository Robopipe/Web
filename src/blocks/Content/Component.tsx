import React from 'react'

import { RichText } from '@/components/RichText'
import type { ContentBlock } from '@/payload-types'

export const ContentComponent: React.FC<ContentBlock> = ({ content, width }) => (
  <section className="container-site py-12 lg:py-16">
    <div className={width === 'narrow' ? 'mx-auto max-w-3xl' : ''}>
      <RichText data={content} />
    </div>
  </section>
)
