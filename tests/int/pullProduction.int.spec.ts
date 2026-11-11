import { describe, expect, it } from 'vitest'

import {
  deferPageLinks,
  downloadCandidates,
  PENDING_LINK,
  parsePullArgs,
  readAll,
  restorePageLinks,
  stripMeta,
} from '@/seed/pullProduction'
import type { SeoGeoClient } from '@/seed/remoteClient'

/**
 * Pure parts of `pnpm pull:prod` (issue #8). The run against production into an
 * empty database is described in docs/specs/8-local-comments/implementation.md.
 */

describe('parsePullArgs', () => {
  it('needs exactly one --from URL', () => {
    expect(parsePullArgs(['--from=https://robopipe.io'])).toEqual({ from: 'https://robopipe.io' })
    expect(() => parsePullArgs([])).toThrow('--from is required.')
    expect(() => parsePullArgs(['--from=robopipe.io'])).toThrow('http or https URL')
    expect(() => parsePullArgs(['--from=https://a', '--from=https://b'])).toThrow('twice')
    expect(() => parsePullArgs(['--from=https://a', '--production'])).toThrow(
      'Unknown argument "--production"',
    )
  })
})

describe('stripMeta', () => {
  it('drops the fields Payload makes itself, and the file fields of media', () => {
    expect(stripMeta({ id: 1, title: 'T', createdAt: 'x', updatedAt: 'y' }, 'pages')).toEqual({
      id: 1,
      title: 'T',
    })
    expect(
      stripMeta(
        { id: 2, alt: 'A', focalX: 50, url: 'u', filename: 'f.jpg', sizes: {}, width: 1 },
        'media',
      ),
    ).toEqual({ id: 2, alt: 'A', focalX: 50 })
  })
})

describe('page links', () => {
  const layout = [
    {
      id: 'b1',
      blockType: 'hero',
      cta: { label: 'Ceník', type: 'internal', page: 7 },
      second: { label: 'Docs', type: 'external', url: 'https://docs.robopipe.io' },
    },
  ]

  it('first pass replaces every internal page link with a placeholder', () => {
    const deferred = deferPageLinks({ layout }) as { layout: typeof layout }
    expect(deferred.layout[0].cta).toEqual({
      label: 'Ceník',
      type: 'external',
      page: null,
      url: PENDING_LINK,
    })
    expect(deferred.layout[0].second).toEqual(layout[0].second)
    expect(layout[0].cta.type).toBe('internal') // input unchanged
  })

  it('second pass writes the original link and clears the placeholder URL', () => {
    const restored = restorePageLinks({ layout }) as { layout: typeof layout }
    expect(restored.layout[0].cta).toEqual({ label: 'Ceník', type: 'internal', page: 7, url: null })
    expect(restored.layout[0].second).toEqual(layout[0].second)
  })
})

describe('readAll', () => {
  it('reads every page of results without locale fallback', async () => {
    const calls: Record<string, unknown>[] = []
    const source = {
      find: async (args: Record<string, unknown>) => {
        calls.push(args)
        return args.page === 1
          ? { docs: [{ id: 1 }], hasNextPage: true }
          : { docs: [{ id: 2 }], hasNextPage: false }
      },
    } as unknown as SeoGeoClient
    expect(await readAll(source, 'faqs', 'en')).toEqual([{ id: 1 }, { id: 2 }])
    expect(calls[0]).toMatchObject({
      collection: 'faqs',
      locale: 'en',
      fallbackLocale: false,
      depth: 0,
      limit: 100,
      page: 1,
    })
  })
})

describe('downloadCandidates', () => {
  it('tries the original first, then the stored sizes from the largest', () => {
    expect(
      downloadCandidates({
        url: 'o.jpg',
        sizes: {
          thumbnail: { url: 't.jpg', width: 400 },
          hero: { url: 'h.jpg', width: 1600 },
          og: { url: null, width: 1200 },
        },
      }),
    ).toEqual(['o.jpg', 'h.jpg', 't.jpg'])
  })
})
