import { hasLocale } from 'next-intl'
import { notFound } from 'next/navigation'

import { routing } from '@/i18n/routing'

/**
 * Route params with a checked locale. An unknown first segment such as
 * "foo.txt" answers 404 before any Payload query rejects it with a 500.
 */
export const checkedParams = async <P extends { locale: string }>(
  params: Promise<P>,
): Promise<P> => {
  const resolved = await params
  if (!hasLocale(routing.locales, resolved.locale)) notFound()
  return resolved
}
