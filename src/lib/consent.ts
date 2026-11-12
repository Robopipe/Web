/**
 * The visitor's cookie choice (issue #21). Pure functions without React or the DOM.
 * The browser cookie `rp_consent` is the only store of the choice. Pages never read it on
 * the server. Only the lead form action reads it at submission (issue #26).
 */

export const CONSENT_COOKIE = 'rp_consent'

/** 180 days. Every save starts the period again. */
export const CONSENT_MAX_AGE_SECONDS = 60 * 60 * 24 * 180

const CONSENT_VERSION = 1

export type ConsentCategory = 'analytics' | 'marketing'

/** `at` is the ISO date of the choice. A new `v` asks every visitor again. */
export type ConsentChoice = { v: 1; analytics: boolean; marketing: boolean; at: string }

type ConsentValue = 'granted' | 'denied'

export type ConsentModeState = {
  analytics_storage: ConsentValue
  ad_storage: ConsentValue
  ad_user_data: ConsentValue
  ad_personalization: ConsentValue
}

export const createConsent = (
  analytics: boolean,
  marketing: boolean,
  at: Date = new Date(),
): ConsentChoice => ({ v: CONSENT_VERSION, analytics, marketing, at: at.toISOString() })

export const serializeConsent = (choice: ConsentChoice): string => JSON.stringify(choice)

/** `null` means there is no valid choice, so the banner shows. */
export const parseConsent = (raw: string | null | undefined): ConsentChoice | null => {
  if (!raw) return null
  try {
    const value: unknown = JSON.parse(raw)
    if (typeof value !== 'object' || value === null) return null
    const { v, analytics, marketing, at } = value as Record<string, unknown>
    if (v !== CONSENT_VERSION) return null
    if (typeof analytics !== 'boolean' || typeof marketing !== 'boolean') return null
    if (typeof at !== 'string') return null
    return { v: CONSENT_VERSION, analytics, marketing, at }
  } catch {
    return null
  }
}

/** Analytics controls `analytics_storage`. Marketing controls the three ad values. */
export const toConsentMode = (choice: ConsentChoice | null): ConsentModeState => {
  const analytics: ConsentValue = choice?.analytics ? 'granted' : 'denied'
  const marketing: ConsentValue = choice?.marketing ? 'granted' : 'denied'
  return {
    analytics_storage: analytics,
    ad_storage: marketing,
    ad_user_data: marketing,
    ad_personalization: marketing,
  }
}

/**
 * Cookies that Google tags set for each category: `_ga`, `_ga_*`, `_gid` and `_gat*` for
 * analytics, `_gcl_*` and `_gac_*` for marketing. GA4 linked with Google Ads stores the ad
 * click in `_gac_*`, and `ad_storage` controls it. Marketing also covers our own `rp_click`
 * (issue #26).
 */
export const GOOGLE_COOKIES: Record<ConsentCategory, RegExp> = {
  analytics: /^(_ga|_ga_.+|_gid|_gat.*)$/,
  marketing: /^(_gcl_.+|_gac_.+|rp_click)$/,
}

/**
 * Categories the choice does not allow. Their cookies must go on every save, not only
 * after a change from allowed: `_ga` lives 2 years, `rp_consent` only 180 days.
 */
export const deniedCategories = (choice: ConsentChoice): ConsentCategory[] =>
  (['analytics', 'marketing'] as const).filter((category) => !choice[category])

/**
 * The domain that Google tags write their cookies to: `.robopipe.io` for `robopipe.io`
 * and `www.robopipe.io`. Hosts without a dot and IP addresses have no such domain.
 */
export const cookieDomain = (hostname: string): string | undefined => {
  if (!hostname.includes('.') || /^[\d.]+$/.test(hostname) || hostname.includes(':')) {
    return undefined
  }
  return `.${hostname.split('.').slice(-2).join('.')}`
}
