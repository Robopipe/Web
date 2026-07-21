import { defineRouting } from 'next-intl/routing'

export const locales = ['cs', 'en'] as const
export type Locale = (typeof locales)[number]

export const routing = defineRouting({
  locales,
  defaultLocale: 'cs',
  localePrefix: 'always',
})
