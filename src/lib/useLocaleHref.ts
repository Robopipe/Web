'use client'

import { useLocale } from 'next-intl'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

import { locales, type Locale } from '@/i18n/routing'

/**
 * Resolves the translated-slug URL for each locale by reading the hreflang
 * <link rel="alternate"> tags each page emits via its metadata. Falls back to
 * swapping the locale prefix when a page has no alternate for a locale (e.g.
 * an untranslated blog post); the target route 404s gracefully to that
 * locale's homepage via not-found handling.
 */
export function useLocaleHref(): (target: Locale) => string {
  const locale = useLocale() as Locale
  const pathname = usePathname()
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

  return (target: Locale) =>
    alternates[target] ?? (pathname.replace(new RegExp(`^/${locale}(?=/|$)`), `/${target}`) || `/${target}`)
}
