import { writeCookie } from '@/lib/clientCookies'

/**
 * The Google Ads click ID from the landing URL (issue #26). Our own cookie, not Google's
 * `_gcl_aw`: its format is not a public interface. The cookie needs marketing consent
 * (`GOOGLE_COOKIES.marketing` in `consent.ts`).
 */

export const CLICK_COOKIE = 'rp_click'

/** 90 days, the same as the export window and the click-through conversion window. */
export const CLICK_MAX_AGE_SECONDS = 60 * 60 * 24 * 90

const CLICK_VERSION = 1

const CLICK_PARAMS = ['gclid', 'gbraid', 'wbraid'] as const

export type ClickIdType = (typeof CLICK_PARAMS)[number]

/** `at` is the ISO time of the landing. */
export type ClickId = { v: 1; type: ClickIdType; id: string; at: string }

/**
 * Google click IDs use only the base64url alphabet. Anything else (a NUL byte, a formula
 * character, a quote) never reaches the cookie, the database or the export (B1, B2).
 * Google keeps the case of the ID, so the code never changes the value.
 */
const VALID_ID = /^[A-Za-z0-9_-]{1,512}$/

/** First of gclid, gbraid, wbraid in this order. Value 1 to 512 chars of `A-Z`, `a-z`, `0-9`, `_` and `-`. */
export const clickIdFromSearch = (search: string, now: Date = new Date()): ClickId | null => {
  const params = new URLSearchParams(search)
  for (const type of CLICK_PARAMS) {
    const id = params.get(type)
    if (id === null) continue
    return VALID_ID.test(id) ? { v: CLICK_VERSION, type, id, at: now.toISOString() } : null
  }
  return null
}

export const serializeClickId = (click: ClickId): string => JSON.stringify(click)

/**
 * `at` comes from the visitor's clock and the server checks it with its own clock.
 * A clock that runs a little fast must not lose the click.
 */
const CLOCK_SKEW_MS = 60 * 60 * 1000

/** `null` when missing, broken, other `v`, `at` in the future (beyond clock skew) or older than 90 days. */
export const parseClickId = (raw: string | null | undefined, now: Date): ClickId | null => {
  if (!raw) return null
  try {
    const value: unknown = JSON.parse(raw)
    if (typeof value !== 'object' || value === null) return null
    const { v, type, id, at } = value as Record<string, unknown>
    if (v !== CLICK_VERSION) return null
    if (typeof type !== 'string' || !(CLICK_PARAMS as readonly string[]).includes(type)) return null
    if (typeof id !== 'string' || !VALID_ID.test(id)) return null
    if (typeof at !== 'string') return null
    const landed = Date.parse(at)
    if (Number.isNaN(landed)) return null
    const age = now.getTime() - landed
    if (age < -CLOCK_SKEW_MS || age > CLICK_MAX_AGE_SECONDS * 1000) return null
    // The database accepts only an ISO time, not every format that Date.parse reads (B3).
    return { v: CLICK_VERSION, type: type as ClickIdType, id, at: new Date(landed).toISOString() }
  } catch {
    return null
  }
}

/** Browser only. Call it only with marketing consent. */
export const persistClickId = (click: ClickId): void => {
  writeCookie(CLICK_COOKIE, serializeClickId(click), CLICK_MAX_AGE_SECONDS)
}
