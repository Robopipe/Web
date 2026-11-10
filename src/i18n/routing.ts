import { defineRouting } from 'next-intl/routing'

export const locales = ['cs', 'en'] as const
export type Locale = (typeof locales)[number]

/**
 * The visitor's stored locale choice. Only an explicit choice writes it (footer
 * switcher, locale suggestion, src/lib/localeSuggestion.ts). src/proxy.ts reads
 * it for the root `/`.
 */
export const LOCALE_COOKIE = 'NEXT_LOCALE'

export const routing = defineRouting({
  locales,
  defaultLocale: 'cs',
  localePrefix: 'always',
  // next-intl would write NEXT_LOCALE on every visit, so one look at an English
  // page sent Czech visitors to /en from then on. See LOCALE_COOKIE above.
  localeCookie: false,
})
