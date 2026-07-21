import { revalidatePath } from 'next/cache'
import type { CollectionAfterChangeHook, CollectionAfterDeleteHook, GlobalAfterChangeHook } from 'payload'

/**
 * Coarse site-wide revalidation: any published content change regenerates all frontend routes.
 * On a marketing site the regeneration cost is trivial and this avoids per-collection
 * path bookkeeping across two locales and localized slugs.
 */
const revalidateSite = () => {
  try {
    revalidatePath('/', 'layout')
  } catch {
    // Outside a Next.js request context (seed script, payload CLI) there is no cache to revalidate.
  }
}

export const revalidateAfterChange: CollectionAfterChangeHook = ({ doc, req }) => {
  // Skip revalidation for autosaved drafts — only published changes affect the site.
  if ('_status' in doc && doc._status !== 'published') return doc
  if (req.context?.skipRevalidate) return doc
  revalidateSite()
  return doc
}

export const revalidateAfterDelete: CollectionAfterDeleteHook = ({ doc, req }) => {
  if (req.context?.skipRevalidate) return doc
  revalidateSite()
  return doc
}

export const revalidateGlobal: GlobalAfterChangeHook = ({ doc }) => {
  revalidateSite()
  return doc
}
