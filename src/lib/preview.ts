import type { PreviewCollection } from './paths'

type Props = {
  collection: PreviewCollection
  slug?: string | null
  locale?: string
}

/** URL for the draft-preview route handler; runs server-side in the admin, so the secret is available. */
export const generatePreviewPath = ({ collection, slug, locale = 'cs' }: Props): string => {
  const params = new URLSearchParams({
    collection,
    slug: slug ?? '',
    locale,
    secret: process.env.PREVIEW_SECRET || '',
  })
  return `/next/preview?${params.toString()}`
}
