import fs from 'node:fs'
import path from 'node:path'

import type { Locale } from '@/i18n/routing'
import { youTubeId } from '@/lib/youtube'
import type { Page, Video } from '@/payload-types'

import { parseRemoteUrl, type SeoGeoClient } from './remoteClient'
import { isUploadOf } from './seoGeo'

/**
 * Content for issue #22: the explainer video on the five service pages. One
 * `videos` document from seed-assets/copy/service-video.json and a `videoEmbed`
 * block before the FAQ block of each page. Run twice, it changes nothing the
 * second time. Pages are written from their published version and published.
 */

type Localized<T> = Record<Locale, T>
type VideoTexts = Pick<Video, 'title' | 'description' | 'playLabel'>

export type ServiceVideoCopy = {
  url: string
  language: Video['language']
  uploadDate: string
  duration: number
  thumbnail: { file: string; alt: Localized<string> }
  /** Czech slugs of the pages that show the video. */
  pages: string[]
} & Localized<VideoTexts>

export type ServiceVideoReport = {
  created: string[]
  updated: string[]
  unchanged: string[]
  skipped: string[]
}

type Block = NonNullable<Page['layout']>[number]

const ASSETS = path.resolve(process.cwd(), 'seed-assets')

export const readServiceVideoCopy = (): ServiceVideoCopy =>
  JSON.parse(fs.readFileSync(path.join(ASSETS, 'copy', 'service-video.json'), 'utf8'))

/** Block id of the video on a page. Block ids are unique across all pages. */
export const videoBlockId = (slug: string): string => `service-video-${slug}`

/**
 * The layout with `block` right before the first FAQ block, so the video sits
 * above the first question. Null when the page has no FAQ block.
 */
export const withVideoBeforeFaq = (layout: Block[], block: Block): Block[] | null => {
  const at = layout.findIndex((b) => b.blockType === 'faqAccordion')
  if (at === -1) return null
  return [...layout.slice(0, at), block, ...layout.slice(at)]
}

export const SERVICE_VIDEO_USAGE =
  'Usage: pnpm seed:service-video [--dry-run] [--production] [--remote=<URL>]'

export type ServiceVideoArgs = { dryRun: boolean; production: boolean; remote?: string }

/**
 * Reads the command line of seed:service-video. Any unknown argument stops the
 * run before it logs in or writes, so a typo such as --dryrun never writes.
 */
export const parseServiceVideoArgs = (args: string[]): ServiceVideoArgs => {
  const out: ServiceVideoArgs = { dryRun: false, production: false }
  const seen = new Set<string>()
  const fail = (message: string): never => {
    throw new Error(`${message}\n${SERVICE_VIDEO_USAGE}`)
  }
  for (const arg of args) {
    const [name, ...rest] = arg.split('=')
    const value = rest.length ? rest.join('=') : undefined
    if (seen.has(name)) fail(`${name} is given twice.`)
    seen.add(name)
    switch (name) {
      case '--dry-run':
      case '--production':
        if (value !== undefined) fail(`${name} takes no value, not "${arg}".`)
        if (name === '--dry-run') out.dryRun = true
        else out.production = true
        break
      case '--remote':
        if (!value) fail(`--remote needs a URL: --remote=https://robopipe.io, not "${arg}".`)
        parseRemoteUrl(value!)
        out.remote = value
        break
      default:
        fail(`Unknown argument "${arg}".`)
    }
  }
  return out
}

export const applyServiceVideo = async (
  client: SeoGeoClient,
  { dryRun = false }: { dryRun?: boolean } = {},
): Promise<ServiceVideoReport> => {
  const report: ServiceVideoReport = { created: [], updated: [], unchanged: [], skipped: [] }
  const write = !dryRun
  const copy = readServiceVideoCopy()
  if (!youTubeId(copy.url))
    throw new Error(`service-video.json: not a YouTube address: ${copy.url}`)

  /* ------------------------------ preview image ----------------------------- */

  const thumbnail = async (): Promise<number | undefined> => {
    const { file, alt } = copy.thumbnail
    // `like` also finds the files Payload renamed. isUploadOf keeps only those.
    const found = await client.find({
      collection: 'media',
      where: { filename: { like: path.parse(file).name } },
      limit: 100,
      depth: 0,
    })
    const existing = found.docs.find((doc) => isUploadOf(file, doc.filename))
    if (existing) {
      report.unchanged.push(`media ${file}`)
      return existing.id
    }
    report.created.push(`media ${file}`)
    if (!write) return undefined
    const doc = await client.create({
      collection: 'media',
      locale: 'cs',
      data: { alt: alt.cs },
      filePath: path.join(ASSETS, 'img', file),
    })
    await client.update({ collection: 'media', id: doc.id, locale: 'en', data: { alt: alt.en } })
    return doc.id
  }

  /* ---------------------------------- video --------------------------------- */

  // The address identifies the video. An existing document keeps the texts set in the admin.
  const found = await client.find({
    collection: 'videos',
    where: { url: { equals: copy.url } },
    limit: 1,
    depth: 0,
  })
  let videoId: number | undefined = found.docs[0]?.id
  if (videoId) {
    report.unchanged.push(`video ${copy.url}`)
  } else {
    const image = await thumbnail()
    report.created.push(`video ${copy.url}`)
    if (write) {
      const doc = await client.create({
        collection: 'videos',
        locale: 'cs',
        data: {
          ...copy.cs,
          url: copy.url,
          language: copy.language,
          uploadDate: copy.uploadDate,
          duration: copy.duration,
          thumbnail: image!,
        },
      })
      await client.update({ collection: 'videos', id: doc.id, locale: 'en', data: copy.en })
      videoId = doc.id
    }
  }

  /* ---------------------------------- pages --------------------------------- */

  for (const slug of copy.pages) {
    const label = `page ${slug}`
    const { docs } = await client.find({
      collection: 'pages',
      where: { slug: { equals: slug } },
      locale: 'cs',
      draft: false,
      limit: 1,
      depth: 0,
    })
    const published = docs[0]
    if (!published || published._status !== 'published') {
      report.skipped.push(`${label} (no published version)`)
      continue
    }
    // Publishing from the published version would drop newer draft changes.
    const latest = await client.findByID({
      collection: 'pages',
      id: published.id,
      locale: 'cs',
      draft: true,
      depth: 0,
    })
    if (latest._status === 'draft') {
      report.skipped.push(`${label} (unpublished draft: publish or discard it, then run again)`)
      continue
    }
    const layout = published.layout ?? []
    // Any video block counts: an editor may have chosen another video.
    if (layout.some((block) => block.blockType === 'videoEmbed')) {
      report.unchanged.push(label)
      continue
    }
    const next = withVideoBeforeFaq(layout, {
      id: videoBlockId(slug),
      blockType: 'videoEmbed',
      video: videoId ?? 0,
    })
    if (!next) {
      report.skipped.push(`${label} (no FAQ block)`)
      continue
    }
    report.updated.push(`${label} (video before FAQ)`)
    if (write) {
      // The layout is not localized and the new block has no localized field.
      // Payload keeps the English values of the other blocks by block id.
      await client.update({
        collection: 'pages',
        id: published.id,
        locale: 'cs',
        data: { layout: next, _status: 'published' },
      })
    }
  }

  return report
}
