import React, { Suspense } from 'react'

import { LeadForm } from '@/components/LeadForm'
import type { ContactFormBlock } from '@/payload-types'

export const ContactFormComponent: React.FC<ContactFormBlock> = ({
  heading,
  text,
  showUseCase,
}) => (
  <section className="container-site py-16 lg:py-24" id="contact">
    <div className="mx-auto max-w-2xl">
      {(heading || text) && (
        <div className="mb-10 text-center">
          {heading && <h2 className="text-3xl font-bold sm:text-4xl">{heading}</h2>}
          {text && <p className="mt-4 text-lg text-ink-500">{text}</p>}
        </div>
      )}
      <Suspense>
        <LeadForm showUseCase={showUseCase ?? true} />
      </Suspense>
    </div>
  </section>
)
