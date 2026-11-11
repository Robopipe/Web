import { getPayload, type Payload } from 'payload'
import { beforeAll, describe, expect, it } from 'vitest'

import config from '@/payload.config'
import { videoObjectLd, videosFromLayout } from '@/lib/jsonLd'
import { SERVER_URL } from '@/lib/paths'
import { isoDuration, youTubeEmbedUrl, youTubeId, youTubeWatchUrl } from '@/lib/youtube'
import type { Media, Page, Video } from '@/payload-types'
import {
  applyServiceVideo,
  parseServiceVideoArgs,
  readServiceVideoCopy,
  withVideoBeforeFaq,
} from '@/seed/serviceVideo'

/**
 * Issue #22: the explainer video on the service pages (docs/specs/22-service-video).
 * The Payload tests need a seeded local database (pnpm seed).
 */

const ID = '8PjTE75sGm4'

const video = (extra: Partial<Video> = {}): Video =>
  ({
    id: 1,
    title: 'Kamerová kontrola kvality',
    description: 'Kamera vyfotí každý kus.',
    url: `https://www.youtube.com/watch?v=${ID}`,
    thumbnail: { id: 7, url: '/api/media/file/thumb.jpg' } as Media,
    playLabel: 'Přehrát video',
    language: 'cs',
    uploadDate: '2026-11-11T12:00:00.000Z',
    duration: 50,
    updatedAt: '',
    createdAt: '',
    ...extra,
  }) as Video

type Block = NonNullable<Page['layout']>[number]

describe('youTubeId', () => {
  it.each([
    `https://www.youtube.com/watch?v=${ID}`,
    `https://www.youtube.com/watch?v=${ID}&t=10s`,
    `https://youtube.com/watch?feature=share&v=${ID}`,
    `https://m.youtube.com/watch?v=${ID}`,
    `https://youtu.be/${ID}`,
    `https://youtu.be/${ID}?si=abc`,
    `https://www.youtube.com/embed/${ID}`,
    `https://www.youtube.com/shorts/${ID}`,
    `https://www.youtube-nocookie.com/embed/${ID}?autoplay=1`,
    `  https://youtu.be/${ID}  `,
  ])('reads the ID from %s', (address) => {
    expect(youTubeId(address)).toBe(ID)
  })

  it.each([
    null,
    '',
    'not a url',
    `https://youtube.com.evil.example/watch?v=${ID}`,
    `https://vimeo.com/${ID}`,
    `ftp://www.youtube.com/watch?v=${ID}`,
    'https://www.youtube.com/watch?v=short',
    `https://www.youtube.com/watch?v=${ID}x`,
    'https://www.youtube.com/channel/UCvzgqIPVpI1DLVrt_moEEMg',
    'https://www.youtube.com/watch',
  ])('rejects %s', (address) => {
    expect(youTubeId(address)).toBeNull()
  })
})

describe('youTubeEmbedUrl', () => {
  it('uses youtube-nocookie with autoplay and the page language', () => {
    const url = new URL(youTubeEmbedUrl(ID, 'cs', 'cs'))
    expect(url.origin).toBe('https://www.youtube-nocookie.com')
    expect(url.pathname).toBe(`/embed/${ID}`)
    expect(Object.fromEntries(url.searchParams)).toEqual({
      autoplay: '1',
      hl: 'cs',
      cc_lang_pref: 'cs',
      rel: '0',
    })
  })

  it('turns captions on when the page language differs from the spoken one', () => {
    const url = new URL(youTubeEmbedUrl(ID, 'en', 'cs'))
    expect(url.searchParams.get('hl')).toBe('en')
    expect(url.searchParams.get('cc_lang_pref')).toBe('en')
    expect(url.searchParams.get('cc_load_policy')).toBe('1')
  })

  it('links the watch page', () => {
    expect(youTubeWatchUrl(ID)).toBe(`https://www.youtube.com/watch?v=${ID}`)
  })
})

describe('isoDuration', () => {
  it.each([
    [50, 'PT50S'],
    [60, 'PT1M'],
    [125, 'PT2M5S'],
    [3600, 'PT1H'],
    [3661, 'PT1H1M1S'],
    [49.6, 'PT50S'],
  ])('%s s is %s', (seconds, iso) => {
    expect(isoDuration(seconds)).toBe(iso)
  })

  it.each([0, -5, Number.NaN, null, undefined])('%s gives null', (seconds) => {
    expect(isoDuration(seconds)).toBeNull()
  })
})

describe('videoObjectLd', () => {
  it('builds a VideoObject with absolute thumbnail, date, duration and YouTube URLs', () => {
    expect(videoObjectLd(video())).toEqual({
      '@context': 'https://schema.org',
      '@type': 'VideoObject',
      name: 'Kamerová kontrola kvality',
      description: 'Kamera vyfotí každý kus.',
      thumbnailUrl: `${SERVER_URL}/api/media/file/thumb.jpg`,
      uploadDate: '2026-11-11',
      duration: 'PT50S',
      embedUrl: `https://www.youtube.com/embed/${ID}`,
      url: `https://www.youtube.com/watch?v=${ID}`,
      inLanguage: 'cs-CZ',
      publisher: { '@id': `${SERVER_URL}/#organization` },
    })
  })

  it('keeps an absolute bucket URL of the thumbnail', () => {
    const thumbnail = { id: 7, url: 'https://storage.googleapis.com/b/thumb.jpg' } as Media
    expect(videoObjectLd(video({ thumbnail }))?.thumbnailUrl).toBe(thumbnail.url)
  })

  it('returns null without a populated thumbnail or with a wrong address', () => {
    expect(videoObjectLd(video({ thumbnail: 7 }))).toBeNull()
    expect(videoObjectLd(video({ url: 'https://vimeo.com/1' }))).toBeNull()
  })
})

describe('videosFromLayout', () => {
  it('lists each populated video once', () => {
    const layout = [
      { blockType: 'videoEmbed', video: video() },
      { blockType: 'faqAccordion', faqs: [] },
      { blockType: 'videoEmbed', video: video() },
      { blockType: 'videoEmbed', video: 2 },
    ] as unknown as Page['layout']
    expect(videosFromLayout(layout).map((v) => v.id)).toEqual([1])
    expect(videosFromLayout(null)).toEqual([])
  })
})

describe('withVideoBeforeFaq', () => {
  const block = { id: 'v', blockType: 'videoEmbed', video: 1 } as Block
  const layout = [
    { id: 'hero', blockType: 'hero' },
    { id: 'faq1', blockType: 'faqAccordion' },
    { id: 'faq2', blockType: 'faqAccordion' },
  ] as Block[]

  it('puts the video right before the first FAQ block', () => {
    expect(withVideoBeforeFaq(layout, block)?.map((b) => b.id)).toEqual([
      'hero',
      'v',
      'faq1',
      'faq2',
    ])
  })

  it('returns null without a FAQ block', () => {
    expect(withVideoBeforeFaq(layout.slice(0, 1), block)).toBeNull()
  })
})

describe('parseServiceVideoArgs', () => {
  it('reads the flags', () => {
    expect(parseServiceVideoArgs([])).toEqual({ dryRun: false, production: false })
    expect(parseServiceVideoArgs(['--dry-run', '--remote=https://robopipe.io'])).toEqual({
      dryRun: true,
      production: false,
      remote: 'https://robopipe.io',
    })
  })

  it.each([
    ['--dryrun'],
    ['--status=draft'],
    ['--dry-run=1'],
    ['--remote'],
    ['--dry-run', '--dry-run'],
  ])('stops on %s', (...args) => {
    expect(() => parseServiceVideoArgs(args)).toThrow(/Usage: pnpm seed:service-video/)
  })
})

describe('applyServiceVideo with Payload', () => {
  let payload: Payload
  const copy = readServiceVideoCopy()

  const published = async (slug: string) =>
    (
      await payload.find({
        collection: 'pages',
        where: { slug: { equals: slug } },
        locale: 'cs',
        draft: false,
        depth: 0,
        limit: 1,
      })
    ).docs[0]

  /** Publishes the layout without its video block, as production is before the script. */
  const removeVideo = async (slug: string) => {
    const page = await published(slug)
    await payload.update({
      collection: 'pages',
      id: page.id,
      locale: 'cs',
      data: {
        layout: (page.layout ?? []).filter((b) => b.blockType !== 'videoEmbed'),
        _status: 'published',
      },
    })
  }

  beforeAll(async () => {
    payload = await getPayload({ config: await config })
    await applyServiceVideo(payload)
  }, 120_000)

  it('creates one video with Czech and English texts', async () => {
    const found = await payload.find({
      collection: 'videos',
      where: { url: { equals: copy.url } },
      locale: 'all',
      depth: 0,
    })
    expect(found.totalDocs).toBe(1)
    const doc = found.docs[0] as unknown as Record<string, Record<string, string>>
    expect(doc.title).toEqual({ cs: copy.cs.title, en: copy.en.title })
    expect(doc.playLabel).toEqual({ cs: copy.cs.playLabel, en: copy.en.playLabel })
  })

  it('shows the video right before the FAQs on the five service pages, in both locales', async () => {
    const enSlugs: string[] = []
    for (const slug of copy.pages) {
      const page = await published(slug)
      const types = (page.layout ?? []).map((b) => b.blockType)
      const at = types.indexOf('videoEmbed')
      expect(at, slug).toBeGreaterThan(-1)
      expect(types[at + 1], slug).toBe('faqAccordion')
      expect(
        types.filter((t) => t === 'videoEmbed'),
        slug,
      ).toHaveLength(1)
      const en = await payload.findByID({
        collection: 'pages',
        id: page.id,
        locale: 'en',
        depth: 0,
      })
      expect(en.layout?.map((b) => b.blockType)).toEqual(types)
      enSlugs.push(en.slug!)
    }
    expect(enSlugs).toEqual([
      'camera-quality-inspection',
      'defect-detection',
      'camera-part-counting',
      'label-inspection',
      'packaging-completeness-inspection',
    ])
  })

  it('leaves the home and contact pages without a video', async () => {
    for (const slug of ['home', 'kontakt']) {
      const page = await published(slug)
      expect(
        page.layout?.some((b) => b.blockType === 'videoEmbed'),
        slug,
      ).toBe(false)
    }
  })

  it('adds a missing video without changing the English texts of the page', async () => {
    const slug = copy.pages[1]
    await removeVideo(slug)
    const { id } = await published(slug)
    const english = () =>
      payload.findByID({ collection: 'pages', id, locale: 'en', draft: false, depth: 0 })
    const before = await english()

    const report = await applyServiceVideo(payload)
    expect(report.updated).toEqual([`page ${slug} (video before FAQ)`])

    const after = await english()
    expect(after._status).toBe('published')
    expect(after.title).toBe(before.title)
    expect(after.layout?.filter((b) => b.blockType !== 'videoEmbed')).toEqual(before.layout)
  })

  it('changes nothing on a second run, also not in a dry run', async () => {
    const dry = await applyServiceVideo(payload, { dryRun: true })
    const real = await applyServiceVideo(payload)
    for (const report of [dry, real]) {
      expect(report.created).toEqual([])
      expect(report.updated).toEqual([])
      expect(report.skipped).toEqual([])
      expect(report.unchanged).toHaveLength(copy.pages.length + 1)
    }
  })

  it('skips a page with an unpublished draft, so the draft is not published', async () => {
    const slug = copy.pages[2]
    await removeVideo(slug)
    const page = await published(slug)
    await payload.update({
      collection: 'pages',
      id: page.id,
      locale: 'cs',
      draft: true,
      data: { title: `${page.title} (koncept)`, _status: 'draft' },
    })
    try {
      const dry = await applyServiceVideo(payload, { dryRun: true })
      expect(dry.skipped).toEqual([
        `page ${slug} (unpublished draft: publish or discard it, then run again)`,
      ])
      expect((await published(slug)).layout?.some((b) => b.blockType === 'videoEmbed')).toBe(false)
    } finally {
      // Back to the published title, then the script adds the video again.
      await payload.update({
        collection: 'pages',
        id: page.id,
        locale: 'cs',
        data: { title: page.title, _status: 'published' },
      })
      await applyServiceVideo(payload)
    }
    expect((await published(slug)).layout?.some((b) => b.blockType === 'videoEmbed')).toBe(true)
  })
})
