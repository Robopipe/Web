import { getLocale } from 'next-intl/server'
import React from 'react'

import { CaseStudyCard } from '@/components/CaseStudyCard'
import type { Locale } from '@/i18n/routing'
import { getCaseStudies } from '@/lib/queries'
import type { CaseStudy, CaseStudyGridBlock } from '@/payload-types'

export const CaseStudyGridComponent: React.FC<CaseStudyGridBlock> = async ({
  heading,
  caseStudies,
  limit,
}) => {
  const locale = (await getLocale()) as Locale

  let items: CaseStudy[] = (caseStudies ?? []).filter(
    (cs): cs is CaseStudy => typeof cs !== 'number',
  )
  if (!items.length) {
    const result = await getCaseStudies(locale, limit ?? 3)
    items = result.docs
  }
  if (!items.length) return null

  return (
    <section className="container-site py-16 lg:py-24">
      {heading && <h2 className="mb-12 text-center">{heading}</h2>}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((caseStudy) => (
          <CaseStudyCard key={caseStudy.id} caseStudy={caseStudy} />
        ))}
      </div>
    </section>
  )
}
