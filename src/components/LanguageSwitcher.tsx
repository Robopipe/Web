'use client'

import { useLocale, useTranslations } from 'next-intl'
import Link from 'next/link'
import React from 'react'

import { locales, type Locale } from '@/i18n/routing'
import { suppressLocaleSuggestion } from '@/lib/localeSuggestion'
import { useLocaleHref } from '@/lib/useLocaleHref'

export const LanguageSwitcher: React.FC = () => {
  const locale = useLocale() as Locale
  const t = useTranslations('common')
  const hrefFor = useLocaleHref()

  return (
    <nav aria-label={t('language')} className="flex items-center gap-1 text-sm">
      {locales.map((target, i) => (
        <React.Fragment key={target}>
          {i > 0 && <span className="text-text-invert-60/50">/</span>}
          {target === locale ? (
            <span aria-current="true" className="px-1 font-semibold text-text-invert">
              {target.toUpperCase()}
            </span>
          ) : (
            <Link
              href={hrefFor(target)}
              onClick={suppressLocaleSuggestion}
              className="px-1 text-text-invert-60 transition-colors hover:text-brand"
            >
              {target.toUpperCase()}
            </Link>
          )}
        </React.Fragment>
      ))}
    </nav>
  )
}
