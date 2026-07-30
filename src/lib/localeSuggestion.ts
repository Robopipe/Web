import type { Locale } from '@/i18n/routing'

const GEO_COOKIE = 'geo-country'
const SUPPRESS_COOKIE = 'locale-suggest'
// Must match next-intl's default localeCookie name (src/i18n/routing.ts doesn't override it).
const LOCALE_COOKIE = 'NEXT_LOCALE'
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

/** Silences the suggestion prompt for a year and records the visitor's locale choice. */
export function commitLocaleChoice(locale: Locale): void {
  writeCookie(LOCALE_COOKIE, locale, ONE_YEAR_SECONDS)
  writeCookie(SUPPRESS_COOKIE, '1', ONE_YEAR_SECONDS)
}

/** Used by the footer switcher: an explicit manual switch silences the suggestion too. */
export function suppressLocaleSuggestion(): void {
  writeCookie(SUPPRESS_COOKIE, '1', ONE_YEAR_SECONDS)
}
