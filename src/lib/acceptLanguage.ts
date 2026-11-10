import type { Locale } from '@/i18n/routing'

/** Browser languages the site serves, by primary subtag. Slovak readers get Czech. */
const LOCALE_BY_LANGUAGE: Record<string, Locale> = { cs: 'cs', sk: 'cs', en: 'en' }

/**
 * The site locale for an Accept-Language header: the first language in order
 * of preference (q value, then position) that the site serves. Regions count
 * as their language, so "sk-SK,sk;q=0.9,en;q=0.7" gives cs, not en.
 * Returns undefined when the header names no served language.
 */
export const localeFromAcceptLanguage = (header: string | null | undefined): Locale | undefined =>
  (header ?? '')
    .split(',')
    .map((part, index) => {
      const [tag, ...params] = part.trim().split(';')
      const q = params.map((p) => p.trim()).find((p) => p.startsWith('q='))
      return { language: tag.split('-')[0].toLowerCase(), q: q ? Number(q.slice(2)) : 1, index }
    })
    .filter(({ q }) => q > 0)
    .sort((a, b) => b.q - a.q || a.index - b.index)
    .map(({ language }) => LOCALE_BY_LANGUAGE[language])
    .find(Boolean)
