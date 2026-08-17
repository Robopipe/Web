import type { Payload } from 'payload'

type PexelsPhoto = {
  id: number
  photographer_id: number
  src: { large2x: string; large: string; original: string }
}

/** Encodes photo and photographer ids into the filename — see HERO_ID_PATTERN. */
const heroFilename = (topicId: number | string, photo: PexelsPhoto) =>
  `blog-topic-${topicId}-hero-pexels-${photo.id}-by-${photo.photographer_id}.jpg`

/**
 * Recovers photo id (1) and photographer id (2) from a filename written by
 * heroFilename. The photographer group is optional: filenames from before that
 * suffix existed still yield their photo id.
 */
const HERO_ID_PATTERN = /-hero-pexels-(\d+)(?:-by-(\d+))?\./

/**
 * Candidates to consider per search. Asking for one photo means every article
 * whose query lands in the same neighbourhood gets the same top-ranked hit, so
 * we take a pool and skip the ones already used.
 */
const CANDIDATE_COUNT = 40

/**
 * What previous generated heroes already used, read back out of the media
 * filenames so no separate bookkeeping can drift from the actual uploads.
 *
 * Photographers are tracked as well as photos: consecutive Pexels ids are
 * typically one photoshoot, so avoiding a repeat photographer is what stops two
 * articles getting near-identical frames of the same conveyor.
 */
const usedHeroes = async (payload: Payload): Promise<{ photos: Set<string>; photographers: Set<string> }> => {
  const existing = await payload.find({
    collection: 'media',
    where: { filename: { like: '-hero-pexels-' } },
    pagination: false,
    depth: 0,
  })
  const photos = new Set<string>()
  const photographers = new Set<string>()
  for (const doc of existing.docs) {
    const match = HERO_ID_PATTERN.exec(doc.filename ?? '')
    if (!match) continue
    photos.add(match[1])
    if (match[2]) photographers.add(match[2])
  }
  return { photos, photographers }
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
    `https://api.pexels.com/v1/search?query=${encodeURIComponent(args.query)}&orientation=landscape&per_page=${CANDIDATE_COUNT}&size=large`,
    { headers: { Authorization: apiKey } },
  )
  if (!search.ok) throw new Error(`Pexels search failed: ${search.status} ${await search.text()}`)
  const json = (await search.json()) as { photos?: PexelsPhoto[] }
  const candidates = json.photos ?? []
  if (candidates.length === 0) {
    args.payload.logger.warn(`Pexels found no photo for query "${args.query}" — skipping hero image.`)
    return null
  }

  // Best-ranked candidate from an unused photographer; then any unused photo;
  // then the top hit, since a duplicate beats no image at all.
  const used = await usedHeroes(args.payload)
  const unused = candidates.filter((candidate) => !used.photos.has(String(candidate.id)))
  const chosen = unused.find((candidate) => !used.photographers.has(String(candidate.photographer_id))) ?? unused[0]
  if (!chosen) {
    args.payload.logger.warn(
      `All ${candidates.length} Pexels candidates for query "${args.query}" are already in use — reusing the top hit.`,
    )
  }
  const photo = chosen ?? candidates[0]

  const imageRes = await fetch(photo.src.large2x ?? photo.src.large)
  if (!imageRes.ok) throw new Error(`Pexels image download failed: ${imageRes.status}`)
  const data = Buffer.from(await imageRes.arrayBuffer())

  const media = await args.payload.create({
    collection: 'media',
    locale: 'en',
    data: { alt: args.altEn },
    file: {
      data,
      name: heroFilename(args.topicId, photo),
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
