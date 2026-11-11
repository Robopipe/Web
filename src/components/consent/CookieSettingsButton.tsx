'use client'

import { useTranslations } from 'next-intl'
import React from 'react'

import { useConsent } from './ConsentProvider'

/** Footer link that opens the cookie settings. Nothing without a Google ID. */
export const CookieSettingsButton: React.FC = () => {
  const consent = useConsent()
  const t = useTranslations('footer')
  if (!consent) return null

  return (
    <button
      type="button"
      onClick={consent.openSettings}
      className="transition-colors hover:text-text-invert"
    >
      {t('cookieSettings')}
    </button>
  )
}
