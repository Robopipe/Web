import fs from 'fs'
import { NextRequest } from 'next/server'
import path from 'path'
import { getPayload, type Payload, type PayloadRequest } from 'payload'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { GET as indexNowKeyFile } from '@/app/indexnow-key.txt/route'
import { indexNowAfterChange, indexNowUrls } from '@/hooks/indexNow'
import { blogPageRedirect } from '@/lib/blogPageRedirect'
import { blogPagePath, parseBlogPage } from '@/lib/blogPages'
import { latestUpdate, type IndexableDoc } from '@/lib/indexableDoc'
import {
  ENDPOINTS,
  indexNowBody,
  indexNowConfig,
  indexNowKey,
  loadIndexNowConfig,
  readIndexNowKey,
  KEY_PATH,
  submitToIndexNow,
} from '@/lib/indexNow'
import {
  caseStudyArticleLd,
  isSolutionPage,
  LOGO_PATH,
  organizationLd,
  ownPricingTable,
  productLd,
  serviceLd,
  type Pricing,
} from '@/lib/jsonLd'
import { buildLlmsTxt } from '@/lib/llmsTxt'
import { SERVER_URL } from '@/lib/paths'
import config from '@/payload.config'
import type { CaseStudy, Media, Page, SiteSetting } from '@/payload-types'

/** Issue #40: findings 3, 8, 9, 11, 12 and 13 of the SEO audit of 12. 11. 2026. */

const root = path.resolve(__dirname, '../..')
const media = (url: string) => ({ id: 9, url, sizes: { og: { url } } }) as unknown as Media

const tiers = [
  { name: 'Open source', price: 'Zdarma' },
  { name: 'Standard', price: '9 900 Kč', period: '/ kamera / měsíc' },
] as Pricing['tiers']

const pricingBlock = (source?: 'pricingPage') =>
  ({ blockType: 'pricingTable', source, tiers }) as unknown as NonNullable<Page['layout']>[number]

const page = (overrides: Partial<Page> = {}) =>
  ({
    id: 7,
    title: 'Zaměstnejte AI, která nikdy neodejde z linky',
    seo: { description: 'Popis stránky.' },
    layout: [],
    ...overrides,
  }) as Page

describe('Product JSON-LD (finding 8)', () => {
  it('uses the product name, the default image and offers with availability', () => {
    const ld = productLd({
      name: 'Robopipe',
      page: page(),
      path: '/cs/cenik',
      pricing: { path: '/cs/cenik', tiers },
      fallbackImage: media('/api/media/file/default-1200x630.jpg'),
    })
    expect(ld).toMatchObject({
      '@type': 'Product',
      name: 'Robopipe',
      image: `${SERVER_URL}/api/media/file/default-1200x630.jpg`,
      url: `${SERVER_URL}/cs/cenik`,
    })
    expect(ld.offers).toEqual([
      expect.objectContaining({
        name: 'Standard',
        price: '9900',
        availability: 'https://schema.org/InStock',
      }),
    ])
  })

  it('prefers the page image to the default image', () => {
    const ld = productLd({
      name: 'Robopipe',
      page: page({ seo: { image: media('https://cdn.example/own.jpg') } }),
      path: '/cs',
      fallbackImage: media('/default.jpg'),
    })
    expect(ld.image).toBe('https://cdn.example/own.jpg')
  })

  it('finds the pricing page by a pricing table with tiers of its own', () => {
    expect(ownPricingTable([pricingBlock()])).toBeDefined()
    expect(ownPricingTable([pricingBlock('pricingPage')])).toBeUndefined()
    expect(ownPricingTable(null)).toBeUndefined()
  })
})

describe('Service and Article JSON-LD (finding 8)', () => {
  it('marks the solution pages of site settings as a Service', () => {
    const settings = { solutions: [7, { id: 8 }] } as unknown as SiteSetting
    expect(isSolutionPage({ id: 7 }, settings)).toBe(true)
    expect(isSolutionPage({ id: 8 }, settings)).toBe(true)
    expect(isSolutionPage({ id: 9 }, settings)).toBe(false)
    expect(isSolutionPage({ id: 7 }, {} as SiteSetting)).toBe(false)

    const ld = serviceLd(page({ title: 'Kontrola etiket' }), '/cs/kontrola-etiket')
    expect(ld).toMatchObject({
      '@type': 'Service',
      name: 'Kontrola etiket',
      description: 'Popis stránky.',
      url: `${SERVER_URL}/cs/kontrola-etiket`,
      provider: { '@id': `${SERVER_URL}/#organization` },
    })
  })

  it('gives a case study an Article with dates, the organization as author and the language', () => {
    const caseStudy = {
      id: 1,
      title: 'V každé dóze přesně tolik kapslí',
      excerpt: 'Krátce.',
      heroImage: media('https://cdn.example/hero.jpg'),
      createdAt: '2026-11-01T10:00:00.000Z',
      updatedAt: '2026-11-05T10:00:00.000Z',
    } as unknown as CaseStudy
    const ld = caseStudyArticleLd(caseStudy, 'en', '/en/case-studies/a', 'Robopipe')
    expect(ld).toMatchObject({
      '@type': 'Article',
      headline: 'V každé dóze přesně tolik kapslí',
      description: 'Krátce.',
      datePublished: '2026-11-01T10:00:00.000Z',
      dateModified: '2026-11-05T10:00:00.000Z',
      image: 'https://cdn.example/hero.jpg',
      author: { '@type': 'Organization', name: 'Robopipe', url: SERVER_URL },
      inLanguage: 'en',
      url: `${SERVER_URL}/en/case-studies/a`,
    })
  })
})

describe('Organization logo (finding 8)', () => {
  it('points to a square PNG of at least 112 × 112 px in public/', () => {
    expect(organizationLd({ id: 1, siteName: 'Robopipe' } as SiteSetting).logo).toBe(
      `${SERVER_URL}${LOGO_PATH}`,
    )
    const png = fs.readFileSync(path.join(root, 'public', LOGO_PATH))
    expect(png.subarray(1, 4).toString()).toBe('PNG')
    const width = png.readUInt32BE(16)
    const height = png.readUInt32BE(20)
    expect(width).toBe(height)
    expect(width).toBeGreaterThanOrEqual(112)
  })
})

describe('IndexNow (finding 3)', () => {
  const key = 'a1b2c3d4e5f6a7b8'
  const prod = { NODE_ENV: 'production' }

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it('accepts only keys of 8 to 128 letters, digits and dashes', () => {
    expect(indexNowKey(key, {})).toBe(key)
    expect(indexNowKey(` ${key} `, {})).toBe(key)
    expect(indexNowKey(null, {})).toBeNull()
    expect(indexNowKey('short', {})).toBeNull()
    expect(indexNowKey('has/slash/12345', {})).toBeNull()
  })

  it('prefers the key from site settings and falls back to INDEXNOW_KEY when it is empty', () => {
    const envKey = 'env-key-12345678'
    expect(indexNowKey(key, { INDEXNOW_KEY: envKey })).toBe(key)
    expect(indexNowKey('', { INDEXNOW_KEY: envKey })).toBe(envKey)
    expect(indexNowKey('  ', { INDEXNOW_KEY: ` ${envKey} ` })).toBe(envKey)
    expect(indexNowKey(undefined, { INDEXNOW_KEY: envKey })).toBe(envKey)
    expect(indexNowKey(undefined, { INDEXNOW_KEY: 'short' })).toBeNull()
  })

  it('is on only for a production build of a public https site with a key', () => {
    expect(indexNowConfig(key, prod, 'https://robopipe.io')).toEqual({
      key,
      siteUrl: 'https://robopipe.io',
    })
    expect(indexNowConfig(null, prod, 'https://robopipe.io')).toBeNull()
    expect(indexNowConfig(key, { NODE_ENV: 'test' }, 'https://robopipe.io')).toBeNull()
    expect(indexNowConfig(key, { NODE_ENV: 'development' }, 'https://robopipe.io')).toBeNull()
    expect(indexNowConfig(key, prod, 'http://robopipe.io')).toBeNull()
    expect(indexNowConfig(key, prod, 'https://localhost:3000')).toBeNull()
    expect(indexNowConfig(key, prod, 'not a url')).toBeNull()
  })

  it('is off in this test run even with a key, so tests never reach the network', () => {
    expect(indexNowConfig(key)).toBeNull()
  })

  it('reads site settings only where it may notify', async () => {
    const findGlobal = vi.fn(async () => ({ verification: { indexNowKey: key } }))
    const payload = { findGlobal } as unknown as Payload
    expect(
      await loadIndexNowConfig(payload, { NODE_ENV: 'test' }, 'https://robopipe.io'),
    ).toBeNull()
    expect(findGlobal).not.toHaveBeenCalled()
    expect(await loadIndexNowConfig(payload, prod, 'https://robopipe.io')).toEqual({
      key,
      siteUrl: 'https://robopipe.io',
    })
    expect(findGlobal).toHaveBeenCalledWith(expect.objectContaining({ slug: 'site-settings' }))
  })

  it('sends one de-duplicated list of this host only, with the key location', () => {
    expect(
      indexNowBody(key, 'https://robopipe.io', [
        'https://robopipe.io/cs/blog/a',
        'https://robopipe.io/cs/blog/a',
        'https://evil.example/x',
        'not a url',
      ]),
    ).toEqual({
      host: 'robopipe.io',
      key,
      keyLocation: `https://robopipe.io${KEY_PATH}`,
      urlList: ['https://robopipe.io/cs/blog/a'],
    })
  })

  it('posts JSON to Bing and Seznam', async () => {
    const fetchImpl = vi.fn(async () => new Response(null, { status: 202 }))
    const results = await submitToIndexNow(['https://robopipe.io/cs'], {
      config: { key, siteUrl: 'https://robopipe.io' },
      fetchImpl,
    })
    expect(ENDPOINTS).toEqual([
      'https://www.bing.com/indexnow',
      'https://search.seznam.cz/indexnow',
    ])
    const calls = fetchImpl.mock.calls as unknown as [string, RequestInit][]
    expect(calls.map(([url]) => url)).toEqual(ENDPOINTS)
    const [, init] = calls[0]
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body as string).urlList).toEqual(['https://robopipe.io/cs'])
    expect(results).toEqual(ENDPOINTS.map((endpoint) => ({ endpoint, status: 202 })))
  })

  it('never throws when a search engine fails', async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error('ECONNRESET')
    })
    const results = await submitToIndexNow(['https://robopipe.io/cs'], {
      config: { key, siteUrl: 'https://robopipe.io' },
      fetchImpl,
    })
    expect(results.map((r) => r.error)).toEqual(['ECONNRESET', 'ECONNRESET'])
  })

  it('sends nothing without a config, also with the global fetch', async () => {
    const globalFetch = vi.spyOn(globalThis, 'fetch')
    expect(await submitToIndexNow(['https://robopipe.io/cs'], { config: null })).toEqual([])
    expect(globalFetch).not.toHaveBeenCalled()
  })
})

describe('IndexNow key in site settings (finding 3)', () => {
  const key = 'a1b2c3d4e5f6a7b8'
  let payload: Payload
  let saved: string | null | undefined

  const setKey = (indexNowKey: string | null) =>
    payload.updateGlobal({
      slug: 'site-settings',
      data: { verification: { indexNowKey } },
    })

  const keyFile = async () => {
    const response = await indexNowKeyFile()
    return { status: response.status, body: await response.text() }
  }

  beforeAll(async () => {
    payload = await getPayload({ config: await config })
    const settings = await payload.findGlobal({ slug: 'site-settings', depth: 0 })
    saved = settings.verification?.indexNowKey
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  afterAll(async () => {
    await setKey(saved ?? null)
  })

  it('serves no key file while the field and INDEXNOW_KEY are empty', async () => {
    vi.stubEnv('INDEXNOW_KEY', '')
    await setKey(null)
    expect(await readIndexNowKey(payload)).toBeNull()
    expect((await keyFile()).status).toBe(404)
  })

  it('serves the key from site settings and a changed key on the next request', async () => {
    await setKey(key)
    expect(await keyFile()).toEqual({ status: 200, body: key })
    await setKey('new-key-87654321')
    expect(await keyFile()).toEqual({ status: 200, body: 'new-key-87654321' })
  })

  it('falls back to INDEXNOW_KEY only while the field is empty', async () => {
    vi.stubEnv('INDEXNOW_KEY', 'env-key-12345678')
    await setKey(key)
    expect(await readIndexNowKey(payload)).toBe(key)
    await setKey(null)
    expect(await keyFile()).toEqual({ status: 200, body: 'env-key-12345678' })
  })

  it('rejects a key that IndexNow does not accept', async () => {
    await expect(setKey('short')).rejects.toThrow()
    await expect(setKey('has/slash/12345')).rejects.toThrow()
    await expect(setKey('x'.repeat(129))).rejects.toThrow()
  })
})

describe('IndexNow hook (finding 3)', () => {
  const config = { key: 'a1b2c3d4e5f6a7b8', siteUrl: 'https://robopipe.io' }
  const allLocales = {
    id: 3,
    slug: { cs: 'od-snimku', en: 'capture' },
    title: { cs: 'Od snímku', en: 'Capture' },
    updatedAt: '2026-11-12T10:00:00.000Z',
  }

  const fakeReq = (findByID: () => Promise<unknown>) =>
    ({
      locale: 'cs',
      fallbackLocale: 'en',
      query: { depth: 2 },
      payload: { findByID: vi.fn(findByID), logger: { info: vi.fn(), warn: vi.fn() } },
    }) as unknown as PayloadRequest

  const run = (hook: ReturnType<typeof indexNowAfterChange>, doc: object, req: PayloadRequest) =>
    hook({ doc, req, collection: {} as never, context: {}, operation: 'update' } as never)

  it('lists the post URLs and the blog listing in every locale', () => {
    const doc: IndexableDoc = {
      collection: 'posts',
      updatedAt: '2026-11-12T10:00:00.000Z',
      locales: {
        cs: { path: '/cs/blog/od-snimku', title: 'Od snímku' },
        en: { path: '/en/blog/capture', title: 'Capture' },
      },
    }
    expect(indexNowUrls(doc)).toEqual([
      `${SERVER_URL}/cs/blog/od-snimku`,
      `${SERVER_URL}/cs/blog`,
      `${SERVER_URL}/en/blog/capture`,
      `${SERVER_URL}/en/blog`,
    ])
  })

  it('submits a published post and leaves the request locale as it was', async () => {
    const submit = vi.fn(async () => [])
    const req = fakeReq(async () => allLocales)
    const hook = indexNowAfterChange('posts', { config: async () => config, submit })
    const doc = { id: 3, _status: 'published' }
    expect(await run(hook, doc, req)).toBe(doc)
    expect(submit).toHaveBeenCalledWith(
      [
        `${SERVER_URL}/cs/blog/od-snimku`,
        `${SERVER_URL}/cs/blog`,
        `${SERVER_URL}/en/blog/capture`,
        `${SERVER_URL}/en/blog`,
      ],
      { config },
    )
    expect(req.payload.findByID).toHaveBeenCalledWith(
      expect.objectContaining({ collection: 'posts', id: 3, locale: 'all', req }),
    )
    expect([req.locale, req.fallbackLocale, req.query.depth]).toEqual(['cs', 'en', 2])
  })

  it('sends nothing for drafts, noIndex documents or without a config', async () => {
    const submit = vi.fn(async () => [])
    const published = { id: 3, _status: 'published' }
    await run(
      indexNowAfterChange('posts', { config: async () => config, submit }),
      { id: 3, _status: 'draft' },
      fakeReq(async () => allLocales),
    )
    await run(
      indexNowAfterChange('pages', { config: async () => config, submit }),
      published,
      fakeReq(async () => ({ ...allLocales, seo: { noIndex: true } })),
    )
    await run(
      indexNowAfterChange('pages', { config: async () => null, submit }),
      published,
      fakeReq(async () => allLocales),
    )
    expect(submit).not.toHaveBeenCalled()
  })

  it('never fails the save when the lookup fails', async () => {
    const submit = vi.fn(async () => [])
    const req = fakeReq(async () => {
      throw new Error('Not Found')
    })
    const doc = { id: 3, _status: 'published' }
    const hook = indexNowAfterChange('pages', { config: async () => config, submit })
    await expect(run(hook, doc, req)).resolves.toBe(doc)
    expect(req.payload.logger.warn).toHaveBeenCalled()
    expect(req.locale).toBe('cs')
  })

  it('never fails the save when site settings cannot be read', async () => {
    const submit = vi.fn(async () => [])
    const req = fakeReq(async () => allLocales)
    const doc = { id: 3, _status: 'published' }
    const config = async () => {
      throw new Error('connection refused')
    }
    await expect(run(indexNowAfterChange('posts', { config, submit }), doc, req)).resolves.toBe(doc)
    expect(submit).not.toHaveBeenCalled()
    expect(req.payload.logger.warn).toHaveBeenCalled()
  })
})

describe('Blog listing pages (finding 9)', () => {
  it('keeps page 1 at /blog and puts later pages under /blog/page/<n>', () => {
    expect(blogPagePath('cs', 1)).toBe('/cs/blog')
    expect(blogPagePath('en', 2)).toBe('/en/blog/page/2')
  })

  it('accepts only the canonical form of a page number', () => {
    expect(parseBlogPage('2')).toBe(2)
    expect(parseBlogPage('12')).toBe(12)
    for (const bad of ['0', '02', '2.0', '-1', 'abc', '', null, undefined, '1234567']) {
      expect(parseBlogPage(bad)).toBeNull()
    }
  })

  it('redirects the old ?page=<n> with 301 and keeps other parameters', () => {
    const redirect = (url: string) => {
      const response = blogPageRedirect(new NextRequest(url))
      return response && [response.status, response.headers.get('location')]
    }
    expect(redirect('https://robopipe.io/cs/blog?page=2')).toEqual([
      301,
      'https://robopipe.io/cs/blog/page/2',
    ])
    expect(redirect('https://robopipe.io/en/blog/?page=1&utm_source=x')).toEqual([
      301,
      'https://robopipe.io/en/blog?utm_source=x',
    ])
    expect(redirect('https://robopipe.io/cs/blog?page=xyz')).toEqual([
      301,
      'https://robopipe.io/cs/blog',
    ])
    expect(redirect('https://robopipe.io/cs/blog')).toBeUndefined()
    expect(redirect('https://robopipe.io/cs/blog/clanek?page=2')).toBeUndefined()
  })

  it('reads no searchParams on the listing, so it stays static', () => {
    const source = fs.readFileSync(
      path.join(root, 'src/app/(frontend)/[locale]/blog/page.tsx'),
      'utf8',
    )
    expect(source).not.toMatch(/searchParams|headers\(|cookies\(/)
  })
})

describe('Sitemap and llms.txt (finding 11)', () => {
  const doc = (collection: IndexableDoc['collection'], updatedAt: string, cs = true) =>
    ({
      collection,
      updatedAt,
      locales: {
        ...(cs ? { cs: { path: '/cs/x', title: 'x' } } : {}),
        en: { path: '/en/x', title: 'x' },
      },
    }) as IndexableDoc

  it('dates a section index by its newest document in that locale', () => {
    const docs = [
      doc('posts', '2026-11-01T00:00:00.000Z'),
      doc('posts', '2026-11-10T00:00:00.000Z', false),
      doc('case-studies', '2026-11-11T00:00:00.000Z'),
    ]
    expect(latestUpdate(docs, 'posts', 'cs')).toBe('2026-11-01T00:00:00.000Z')
    expect(latestUpdate(docs, 'posts', 'en')).toBe('2026-11-10T00:00:00.000Z')
    expect(latestUpdate([], 'posts', 'cs')).toBeUndefined()
  })

  it('starts llms.txt with company facts: founding, office, parent, code, docs', () => {
    const text = buildLlmsTxt([], {
      siteName: 'Robopipe',
      descriptions: {},
      legalName: 'robopipe s.r.o.',
      address: 'robopipe s.r.o.\nSokolovská 81/55\n186 00 Praha 8 - Karlín\nCzech Republic',
      socials: ['https://www.linkedin.com/company/robopipe', 'https://github.com/robopipe'],
    })
    expect(text).toContain(
      [
        '## O firmě / About',
        '- Založeno / Founded: 2025-12-31',
        '- Kancelář / Office: Sokolovská 81/55, 186 00 Praha 8 - Karlín, Czech Republic',
        '- Mateřská firma / Parent company: KOALA42',
        '- Tým / Team: 5',
        '- Otevřený zdrojový kód / Open source: https://github.com/robopipe',
        '- Dokumentace / Documentation: https://docs.robopipe.io',
      ].join('\n'),
    )
  })
})

describe('Code-side details of findings 12 and 13', () => {
  const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8')

  it('keeps small grey text at 4.5:1 or more on white', () => {
    const css = read('src/app/(frontend)/styles.css')
    expect(css).not.toContain('text-38')
    const alpha = Number(css.match(/--color-text-55: rgba\(0, 0, 0, ([\d.]+)\)/)?.[1])
    const channel = (1 - alpha) * 255
    const linear = ((channel / 255 + 0.055) / 1.055) ** 2.4
    expect((1 + 0.05) / (linear + 0.05)).toBeGreaterThanOrEqual(4.5)
  })

  it('answers /apple-touch-icon.png and caches the icons for a day', () => {
    const config = read('next.config.ts')
    expect(config).toContain("{ source: '/apple-touch-icon.png', destination: '/apple-icon.png' }")
    expect(config).toContain('public, max-age=86400')
    expect(fs.existsSync(path.join(root, 'src/app/apple-icon.png'))).toBe(true)
  })
})

describe('Office address only (Filip, 12. 11. 2026)', () => {
  it('names the registered office Plynární nowhere in the code or public files', () => {
    const hits: string[] = []
    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name)
        if (entry.isDirectory()) walk(full)
        else if (/\.(tsx?|json|txt|svg|md)$/.test(entry.name)) {
          if (fs.readFileSync(full, 'utf8').includes('Plynární')) hits.push(full)
        }
      }
    }
    walk(path.join(root, 'src'))
    walk(path.join(root, 'public'))
    expect(hits).toEqual([])
  })
})
