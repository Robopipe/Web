import { useLocale, useTranslations } from 'next-intl'
import Link from 'next/link'
import React from 'react'

export default function NotFound() {
  const t = useTranslations('notFound')
  const locale = useLocale()

  return (
    <div className="container-site flex flex-col items-center py-32 text-center">
      <p className="font-heading text-6xl font-bold text-brand-500">404</p>
      <h1 className="mt-4 text-3xl font-bold">{t('title')}</h1>
      <p className="mt-3 max-w-md text-ink-500">{t('description')}</p>
      <Link
        href={`/${locale}`}
        className="mt-8 rounded-md bg-brand-500 px-6 py-3 text-sm font-semibold text-ink-900 transition-colors hover:bg-brand-400"
      >
        {t('backHome')}
      </Link>
    </div>
  )
}
