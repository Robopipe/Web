'use client'

import { useLocale, useTranslations } from 'next-intl'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import React, { useEffect, useState } from 'react'

import { locales, type Locale } from '@/i18n/routing'

/**
 * Locale switcher that lands on the translated slug: it reads the hreflang
 * <link rel="alternate"> tags each page emits via its metadata. When a page
 * has no alternate for a locale (e.g. untranslated blog post), it falls back
 * to swapping the locale prefix, and the target route 404s gracefully to that
 * locale's homepage via not-found handling.
 */
export const LanguageSwitcher: React.FC = () => {
  const locale = useLocale() as Locale
  const pathname = usePathname()
  const t = useTranslations('common')
  const [alternates, setAlternates] = useState<Partial<Record<Locale, string>>>({})

  useEffect(() => {
    const links = document.querySelectorAll<HTMLLinkElement>('link[rel="alternate"][hreflang]')
    const found: Partial<Record<Locale, string>> = {}
    links.forEach((link) => {
      const lang = link.hreflang as Locale
      if ((locales as readonly string[]).includes(lang)) {
        try {
          found[lang] = new URL(link.href).pathname
        } catch {
          /* ignore malformed hrefs */
        }
      }
    })
    // Syncing FROM an external system (the document head) into state — the sanctioned
    // use of an effect; the head only updates after navigation, tracked via pathname.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAlternates(found)
  }, [pathname])

  const fallbackFor = (target: Locale) =>
    pathname.replace(new RegExp(`^/${locale}(?=/|$)`), `/${target}`) || `/${target}`

  return (
    <nav aria-label={t('language')} className="flex items-center gap-1 text-sm">
      {locales.map((target, i) => (
        <React.Fragment key={target}>
          {i > 0 && <span className="text-ink-300">/</span>}
          {target === locale ? (
            <span aria-current="true" className="px-1 font-semibold text-ink-900">
              {target.toUpperCase()}
            </span>
          ) : (
            <Link
              href={alternates[target] ?? fallbackFor(target)}
              className="px-1 text-ink-500 transition-colors hover:text-ink-900"
            >
              {target.toUpperCase()}
            </Link>
          )}
        </React.Fragment>
      ))}
    </nav>
  )
}
