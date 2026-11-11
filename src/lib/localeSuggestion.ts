import { LOCALE_COOKIE, type Locale } from '@/i18n/routing'
import { readCookie, writeCookie } from '@/lib/clientCookies'

const GEO_COOKIE = 'geo-country'
const SUPPRESS_COOKIE = 'locale-suggest'
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365

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
