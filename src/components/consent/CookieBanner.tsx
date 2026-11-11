'use client'

import { useTranslations } from 'next-intl'
import Link from 'next/link'
import React, { useEffect, useRef } from 'react'

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

/**
 * Gives the page as much space at its end as the banner covers, so the visitor can scroll
 * the footer (with the only language switch) above the banner. The scroll padding keeps
 * elements that get focus with Tab out from under the banner.
 */
const useReservedSpaceBelow = (ref: React.RefObject<HTMLElement | null>) => {
  useEffect(() => {
    const banner = ref.current
    if (!banner) return
    const reserve = () => {
      const height = `${banner.getBoundingClientRect().height}px`
      document.body.style.paddingBottom = height
      document.documentElement.style.scrollPaddingBottom = height
    }
    reserve()
    const observer = new ResizeObserver(reserve)
    observer.observe(banner)
    return () => {
      observer.disconnect()
      document.body.style.paddingBottom = ''
      document.documentElement.style.scrollPaddingBottom = ''
    }
  }, [ref])
}

/** Not modal: it takes no focus and the page stays usable behind it. */
export const CookieBanner: React.FC<Props> = ({
  privacyHref,
  onAcceptAll,
  onReject,
  onSettings,
}) => {
  const t = useTranslations('consent')
  const ref = useRef<HTMLElement>(null)
  useReservedSpaceBelow(ref)

  return (
    <section
      ref={ref}
      role="region"
      aria-labelledby="cookie-banner-title"
      className="fixed inset-x-0 bottom-0 z-50 max-h-[50vh] overflow-y-auto bg-white shadow-popup"
    >
      {/* DOM order: text, accept, reject, settings, privacy link. Tab reaches "accept" first.
          Below `sm` the buttons sit in two columns (accept | reject, settings | link) to keep
          the banner low on phones. Accept and reject still have the same width. */}
      <div className="container-site grid grid-cols-2 gap-x-2 gap-y-3 py-4 sm:grid-cols-1 sm:gap-x-8 sm:py-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <div className="col-span-2 max-w-2xl sm:col-span-1">
          <h2
            id="cookie-banner-title"
            className="text-base leading-6 font-semibold text-text-heading"
          >
            {t('bannerTitle')}
          </h2>
          <p className="mt-1 text-sm text-text-60">{t('bannerText')}</p>
        </div>
        <div className="contents sm:flex sm:flex-row sm:items-center sm:gap-3 lg:row-span-2">
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
        <p className="self-center text-sm lg:row-start-2">
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
