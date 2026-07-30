import { useLocale, useTranslations } from 'next-intl'
import Link from 'next/link'
import React from 'react'

import { buttonClasses } from '@/components/ui'

export default function NotFound() {
  const t = useTranslations('notFound')
  const locale = useLocale()

  return (
    <div className="container-site flex flex-col items-center py-32 text-center">
      <p className="font-numbers text-6xl font-semibold text-brand-fg">404</p>
      <h1 className="mt-4 text-3xl leading-10">{t('title')}</h1>
      <p className="mt-3 max-w-md text-text-60">{t('description')}</p>
      <Link href={`/${locale}`} className={buttonClasses({ className: 'mt-8' })}>
        {t('backHome')}
      </Link>
    </div>
  )
}
