import { defineRouting } from 'next-intl/routing'

export const locales = ['cs', 'en'] as const
export type Locale = (typeof locales)[number]

export const routing = defineRouting({
  locales,
  defaultLocale: 'cs',
  localePrefix: 'always',
  // The root `/` follows the browser's Accept-Language only. A stored NEXT_LOCALE
  // cookie sent Czech visitors to /en after any visit to an English page.
  localeCookie: false,
})
