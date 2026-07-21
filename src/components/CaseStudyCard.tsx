import { useLocale } from 'next-intl'
import Link from 'next/link'
import React from 'react'

import { Media } from '@/components/Media'
import type { Locale } from '@/i18n/routing'
import { pathFor } from '@/lib/paths'
import type { CaseStudy } from '@/payload-types'

export const CaseStudyCard: React.FC<{ caseStudy: CaseStudy }> = ({ caseStudy }) => {
  const locale = useLocale() as Locale
  if (!caseStudy.slug) return null

  return (
    <article className="group overflow-hidden rounded-lg border border-ink-100 transition hover:border-brand-300 hover:shadow-sm">
      <Link href={pathFor('case-studies', caseStudy.slug, locale)} className="block">
        {caseStudy.heroImage && typeof caseStudy.heroImage !== 'number' && (
          <Media
            media={caseStudy.heroImage}
            size="card"
            className="aspect-video w-full object-cover"
          />
        )}
        <div className="p-5">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-brand-700">
            {[caseStudy.customer, caseStudy.industry].filter(Boolean).join(' · ')}
          </p>
          <h3 className="text-lg font-semibold group-hover:text-brand-700">{caseStudy.title}</h3>
          {caseStudy.excerpt && (
            <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-ink-500">
              {caseStudy.excerpt}
            </p>
          )}
        </div>
      </Link>
    </article>
  )
}
