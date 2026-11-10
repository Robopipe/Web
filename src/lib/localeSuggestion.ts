import type { Locale } from '@/i18n/routing'

const GEO_COOKIE = 'geo-country'
const SUPPRESS_COOKIE = 'locale-suggest'
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365

function readCookie(name: string): string | undefined {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`))
  return match ? decodeURIComponent(match[1]) : undefined
}

function writeCookie(name: string, value: string, maxAgeSeconds: number): void {
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAgeSeconds}; samesite=lax`
}

/** CZ/SK visitors get the Czech suggestion; every other country gets English. */
export function suggestedLocale(): Locale | undefined {
  const country = readCookie(GEO_COOKIE)
  if (!country) return undefined
  return country === 'CZ' || country === 'SK' ? 'cs' : 'en'
}

export function isLocaleSuggestionSuppressed(): boolean {
  return readCookie(SUPPRESS_COOKIE) !== undefined
}

/**
 * Silences the suggestion prompt for a year. The root `/` follows Accept-Language
 * only (routing.localeCookie is off), so the chosen locale is not stored.
 */
export function commitLocaleChoice(): void {
  writeCookie(SUPPRESS_COOKIE, '1', ONE_YEAR_SECONDS)
}

/** Used by the footer switcher: an explicit manual switch silences the suggestion too. */
export function suppressLocaleSuggestion(): void {
  writeCookie(SUPPRESS_COOKIE, '1', ONE_YEAR_SECONDS)
}
