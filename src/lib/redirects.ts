import { notFound, permanentRedirect, redirect } from 'next/navigation'

import type { Locale } from '@/i18n/routing'

import { pathFor, type PreviewCollection } from './paths'
import { getRedirect, getTranslatedSlug } from './queries'

/**
 * For a missing document: follow the first matching entry in the `redirects`
 * collection, else 404. Paths are tried in order, so pass the most specific first.
 */
export const redirectOrNotFound = async (paths: string[]): Promise<never> => {
  for (const path of paths) {
    const redirectDoc = await getRedirect(path)
    if (redirectDoc) {
      if (redirectDoc.permanent) permanentRedirect(redirectDoc.to)
      redirect(redirectDoc.to)
    }
  }
  notFound()
}

/**
 * For a missing document: when `slug` is the slug of a published document in the
 * other locale, answer a permanent redirect (308) to its slug in `locale`.
 * Otherwise return, so the caller can try its other fallbacks.
 */
export const redirectTranslatedSlug = async (
  collection: PreviewCollection,
  slug: string,
  locale: Locale,
): Promise<void> => {
  const translated = await getTranslatedSlug(collection, slug, locale)
  if (translated) permanentRedirect(pathFor(collection, translated, locale))
}
