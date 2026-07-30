import type { Payload } from 'payload'

type PexelsPhoto = {
  id: number
  src: { large2x: string; large: string; original: string }
}

/**
 * Search Pexels for a hero photo, upload it into the Media collection
 * (Vercel Blob in production) with localized alt text, and return the media id.
 * Returns null when Pexels is not configured or finds nothing — heroImage is
 * optional on posts, so generation proceeds image-less.
 */
export const fetchHeroImage = async (args: {
  payload: Payload
  query: string
  altEn: string
  altCs: string
  /** Used for a collision-safe, descriptive filename in the shared Blob store. */
  topicId: number | string
}): Promise<number | null> => {
  const apiKey = process.env.PEXELS_API_KEY
  if (!apiKey) {
    args.payload.logger.warn('PEXELS_API_KEY not set — generated post will have no hero image.')
    return null
  }

  const search = await fetch(
    `https://api.pexels.com/v1/search?query=${encodeURIComponent(args.query)}&orientation=landscape&per_page=1&size=large`,
    { headers: { Authorization: apiKey } },
  )
  if (!search.ok) throw new Error(`Pexels search failed: ${search.status} ${await search.text()}`)
  const json = (await search.json()) as { photos?: PexelsPhoto[] }
  const photo = json.photos?.[0]
  if (!photo) {
    args.payload.logger.warn(`Pexels found no photo for query "${args.query}" — skipping hero image.`)
    return null
  }

  const imageRes = await fetch(photo.src.large2x ?? photo.src.large)
  if (!imageRes.ok) throw new Error(`Pexels image download failed: ${imageRes.status}`)
  const data = Buffer.from(await imageRes.arrayBuffer())

  const media = await args.payload.create({
    collection: 'media',
    locale: 'en',
    data: { alt: args.altEn },
    file: {
      data,
      name: `blog-topic-${args.topicId}-hero-pexels-${photo.id}.jpg`,
      mimetype: 'image/jpeg',
      size: data.length,
    },
  })
  await args.payload.update({
    collection: 'media',
    id: media.id,
    locale: 'cs',
    data: { alt: args.altCs },
  })
  return media.id
}
