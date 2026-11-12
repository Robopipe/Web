'use client'

import { useLocale } from 'next-intl'
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

import type { Locale } from '@/i18n/routing'
import { clearGoogleCookies, initGoogleTag, trackEvent, updateGoogleConsent } from '@/lib/analytics'
import { clickIdFromSearch, persistClickId, type ClickId } from '@/lib/clickId'
import { readCookie, writeCookie } from '@/lib/clientCookies'
import {
  CONSENT_COOKIE,
  CONSENT_MAX_AGE_SECONDS,
  createConsent,
  deniedCategories,
  parseConsent,
  serializeConsent,
  type ConsentChoice,
} from '@/lib/consent'
import { privacyPath } from '@/lib/paths'

import { CookieBanner } from './CookieBanner'
import { CookieSettingsDialog } from './CookieSettingsDialog'

/** `bannerOpen` is also true while the stored choice is not read yet. */
type ConsentContextValue = { bannerOpen: boolean; openSettings: () => void }

const ConsentContext = createContext<ConsentContextValue | null>(null)

/** `null` when the site has no Google ID: no banner, no footer link. */
export const useConsent = (): ConsentContextValue | null => useContext(ConsentContext)

type Props = {
  analyticsId?: string | null
  adsId?: string | null
  children: React.ReactNode
}

/** Measures clicks on `mailto:` and `tel:` links anywhere on the page (links come from the CMS). */
const trackContactClick = (event: MouseEvent) => {
  const link = event.target instanceof Element ? event.target.closest('a') : null
  const href = link?.getAttribute('href') ?? ''
  if (href.startsWith('mailto:')) trackEvent('contact_click', { method: 'email' })
  else if (href.startsWith('tel:')) trackEvent('contact_click', { method: 'phone' })
}

/** Tells other tabs of this site that `rp_consent` changed. The message carries no data. */
const CONSENT_CHANNEL = 'rp_consent'

/**
 * Cookie banner, settings dialog and the Google tag (issue #21). Renders nothing of its
 * own before the first effect, so the server HTML is the same for every visitor.
 */
export const ConsentProvider: React.FC<Props> = ({ analyticsId, adsId, children }) => {
  const locale = useLocale() as Locale
  const enabled = Boolean(analyticsId || adsId)
  const [mounted, setMounted] = useState(false)
  const [choice, setChoice] = useState<ConsentChoice | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)

  // The ad click ID from the landing URL (issue #26). Without marketing consent it lives
  // only in page memory. The provider sits in the locale layout, so it survives navigation.
  const pendingClick = useRef<ClickId | null>(null)

  useEffect(() => {
    if (!enabled) return
    const stored = parseConsent(readCookie(CONSENT_COOKIE))
    pendingClick.current = clickIdFromSearch(location.search)
    if (stored?.marketing && pendingClick.current) {
      persistClickId(pendingClick.current)
      pendingClick.current = null
    }
    // Reading the cookie (an external system) on mount — the sanctioned use of an effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setChoice(stored)
    setMounted(true)
    initGoogleTag({ analyticsId, adsId }, stored)
  }, [enabled, analyticsId, adsId])

  useEffect(() => {
    if (!enabled) return
    document.addEventListener('click', trackContactClick, { capture: true })
    return () => document.removeEventListener('click', trackContactClick, { capture: true })
  }, [enabled])

  const apply = useCallback((next: ConsentChoice) => {
    updateGoogleConsent(next)
    for (const category of deniedCategories(next)) clearGoogleCookies(category)
    // After a rejection the click stays in memory: a later consent on this visit still stores it.
    if (next.marketing && pendingClick.current) {
      persistClickId(pendingClick.current)
      pendingClick.current = null
    }
    setChoice(next)
  }, [])

  // Other open tabs keep their banner and their consent mode until they hear of a new choice.
  // The cookie stays the only store (architecture R2): a message only says "read it again".
  const channel = useRef<BroadcastChannel | null>(null)
  useEffect(() => {
    if (!enabled || typeof BroadcastChannel === 'undefined') return
    const current = new BroadcastChannel(CONSENT_CHANNEL)
    current.onmessage = () => {
      const stored = parseConsent(readCookie(CONSENT_COOKIE))
      if (stored) apply(stored)
    }
    channel.current = current
    return () => {
      current.close()
      channel.current = null
    }
  }, [enabled, apply])

  const save = useCallback(
    (analytics: boolean, marketing: boolean) => {
      const next = createConsent(analytics, marketing)
      writeCookie(CONSENT_COOKIE, serializeConsent(next), CONSENT_MAX_AGE_SECONDS)
      apply(next)
      setSettingsOpen(false)
      channel.current?.postMessage(null)
    },
    [apply],
  )

  const acceptAll = useCallback(() => save(true, true), [save])
  const rejectAll = useCallback(() => save(false, false), [save])
  const openSettings = useCallback(() => setSettingsOpen(true), [])
  const closeSettings = useCallback(() => setSettingsOpen(false), [])

  const showBanner = mounted && choice === null

  // When the banner closes, the focused button (or the settings dialog opened from it)
  // leaves the page and focus falls to <body>. The next Tab would start at the top of the
  // page again, so focus goes to the content instead.
  const bannerWasShown = useRef(false)
  useEffect(() => {
    if (showBanner) {
      bannerWasShown.current = true
      return
    }
    if (!bannerWasShown.current) return
    bannerWasShown.current = false
    if (document.activeElement === null || document.activeElement === document.body) {
      document.querySelector('main')?.focus({ preventScroll: true })
    }
  }, [showBanner])
  // Before the first effect the choice is unknown. Other boxes wait as if the banner were open.
  const bannerOpen = !mounted || choice === null
  const value = useMemo(() => ({ bannerOpen, openSettings }), [bannerOpen, openSettings])

  if (!enabled) return <>{children}</>

  return (
    <ConsentContext.Provider value={value}>
      {/* Before the page content, so the banner is first in the Tab order. */}
      {showBanner && (
        <CookieBanner
          privacyHref={privacyPath(locale)}
          onAcceptAll={acceptAll}
          onReject={rejectAll}
          onSettings={openSettings}
        />
      )}
      {children}
      {mounted && settingsOpen && (
        <CookieSettingsDialog
          choice={choice}
          onSave={save}
          onAcceptAll={acceptAll}
          onClose={closeSettings}
        />
      )}
    </ConsentContext.Provider>
  )
}
