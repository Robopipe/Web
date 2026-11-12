import { cookieNames, deleteCookie } from '@/lib/clientCookies'
import {
  GOOGLE_COOKIES,
  cookieDomain,
  toConsentMode,
  type ConsentCategory,
  type ConsentChoice,
} from '@/lib/consent'

/**
 * The Google tag (gtag.js) with consent mode v2, advanced mode (issue #21).
 * The tag always loads. Before a choice and after a rejection all four consent
 * values are `denied`, so Google gets only cookieless signals.
 */

type Gtag = (...args: unknown[]) => void

declare global {
  interface Window {
    dataLayer?: unknown[]
    gtag?: Gtag
  }
}

export type GoogleTagIds = {
  analyticsId?: string | null
  adsId?: string | null
}

const GTAG_SRC = 'https://www.googletagmanager.com/gtag/js'

/** The longest wait for an idle moment after `load` before the script loads anyway. */
export const IDLE_TIMEOUT_MS = 2000
/** Delay after `load` in browsers without `requestIdleCallback` (Safari). */
export const IDLE_FALLBACK_MS = 500

/**
 * Runs `callback` when the browser has nothing else to do, at the latest after
 * `IDLE_TIMEOUT_MS`. Safari has no `requestIdleCallback` and waits a fixed time.
 */
export function whenIdle(callback: () => void): void {
  if (typeof window.requestIdleCallback === 'function') {
    window.requestIdleCallback(() => callback(), { timeout: IDLE_TIMEOUT_MS })
  } else {
    window.setTimeout(callback, IDLE_FALLBACK_MS)
  }
}

/** The Google Ads tag ID (`AW-…`) from initGoogleTag. Target of the hashed email (issue #26). */
let adsTagId: string | null = null

/**
 * Starts the Google tag once per page load. The `dataLayer` queue keeps the order of
 * the commands, so the default `denied` is always before `config`, even when the
 * script loads early. The queue starts at once, so consent updates and events sent
 * before the script loads wait in it. The script itself loads after the window `load`
 * event, when the browser is idle (issue #30).
 */
export function initGoogleTag(
  { analyticsId, adsId }: GoogleTagIds,
  choice: ConsentChoice | null,
): void {
  // React Strict Mode and client navigation run the caller again.
  if (window.gtag) return
  const ids = [analyticsId, adsId].filter((id): id is string => Boolean(id))
  if (ids.length === 0) return

  adsTagId = adsId || null

  const dataLayer = (window.dataLayer = window.dataLayer || [])
  // gtag.js reads only `arguments` objects from the queue. Arrays are ignored.
  const gtag: Gtag = function gtag() {
    dataLayer.push(arguments)
  }
  window.gtag = gtag

  gtag('consent', 'default', toConsentMode(null))
  gtag('set', 'ads_data_redaction', true)
  // A returning visitor sends no request in the `denied` state.
  if (choice) gtag('consent', 'update', toConsentMode(choice))
  gtag('js', new Date())
  for (const id of ids) gtag('config', id)

  const loadScript = () => {
    const script = document.createElement('script')
    script.async = true
    script.src = `${GTAG_SRC}?id=${encodeURIComponent(ids[0])}`
    document.head.appendChild(script)
  }
  const loadWhenIdle = () => whenIdle(loadScript)
  if (document.readyState === 'complete') loadWhenIdle()
  else window.addEventListener('load', loadWhenIdle, { once: true })
}

export function updateGoogleConsent(choice: ConsentChoice): void {
  window.gtag?.('consent', 'update', toConsentMode(choice))
}

/**
 * Consent mode stops new cookies after `denied`, but old ones stay. Deletes them on
 * this host and on the domain that Google writes to (`.robopipe.io`).
 */
export function clearGoogleCookies(category: ConsentCategory): void {
  const domain = cookieDomain(location.hostname)
  for (const name of cookieNames()) {
    if (GOOGLE_COOKIES[category].test(name)) deleteCookie(name, domain)
  }
}

/** The only entry point for events. Does nothing without the Google tag. */
export const trackEvent = (event: string, params?: Record<string, string | number>): void => {
  window.gtag?.('event', event, params)
}

/**
 * Enhanced conversions for leads (issue #26). The server sends only the SHA-256 hex of the
 * email. Consent mode drops the data without `ad_user_data`. `form_submit` goes only to the
 * Google Ads tag and has no conversion action, so it only carries the hash.
 */
export function sendAdsUserData(userData: { sha256_email_address: string }): void {
  if (!window.gtag || !adsTagId) return
  try {
    window.gtag('set', 'user_data', userData)
    window.gtag('event', 'form_submit', { send_to: adsTagId })
  } catch {
    // Measurement never breaks the form.
  }
}
