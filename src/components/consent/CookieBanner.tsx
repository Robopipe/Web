'use client'

import { useTranslations } from 'next-intl'
import Link from 'next/link'
import React from 'react'

import { buttonClasses } from '@/components/ui'

type Props = {
  privacyHref: string
  onAcceptAll: () => void
  onReject: () => void
  onSettings: () => void
}

// Accept and reject must look the same (issue #21, criterion 2): same variant, same width.
// The settings dialog uses the same classes.
export const choiceButtonClasses = buttonClasses({
  variant: 'filled',
  className: 'w-full sm:w-auto sm:min-w-40',
})

/** Not modal: it takes no focus and the page stays usable behind it. */
export const CookieBanner: React.FC<Props> = ({
  privacyHref,
  onAcceptAll,
  onReject,
  onSettings,
}) => {
  const t = useTranslations('consent')

  return (
    <section
      role="region"
      aria-labelledby="cookie-banner-title"
      className="fixed inset-x-0 bottom-0 z-50 max-h-[50vh] overflow-y-auto bg-white shadow-popup"
    >
      {/* DOM order: text, accept, reject, settings, privacy link. Tab reaches "accept" first. */}
      <div className="container-site grid gap-x-8 gap-y-3 py-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <div className="max-w-2xl">
          <h2
            id="cookie-banner-title"
            className="text-base leading-6 font-semibold text-text-heading"
          >
            {t('bannerTitle')}
          </h2>
          <p className="mt-1 text-sm text-text-60">{t('bannerText')}</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3 lg:row-span-2">
          <button type="button" onClick={onAcceptAll} className={choiceButtonClasses}>
            {t('acceptAll')}
          </button>
          <button type="button" onClick={onReject} className={choiceButtonClasses}>
            {t('rejectAll')}
          </button>
          <button
            type="button"
            onClick={onSettings}
            className={buttonClasses({ variant: 'outlined', className: 'w-full sm:w-auto' })}
          >
            {t('settings')}
          </button>
        </div>
        <p className="text-sm lg:row-start-2">
          <Link
            href={privacyHref}
            className="font-medium text-brand-fg underline underline-offset-2 hover:text-brand-fg-hover"
          >
            {t('privacyLink')}
          </Link>
        </p>
      </div>
    </section>
  )
}
