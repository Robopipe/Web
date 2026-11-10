import { describe, expect, it } from 'vitest'

import type { IndexableDoc } from '@/lib/indexable'
import { buildLlmsTxt } from '@/lib/llmsTxt'
import { SERVER_URL } from '@/lib/paths'

const doc = (
  collection: IndexableDoc['collection'],
  cs: [string, string] | null,
  en: [string, string] | null,
): IndexableDoc => ({
  collection,
  updatedAt: '2026-11-10T00:00:00.000Z',
  locales: {
    ...(cs ? { cs: { path: cs[0], title: cs[1], description: `${cs[1]} popis` } } : {}),
    ...(en ? { en: { path: en[0], title: en[1] } } : {}),
  },
})

const docs: IndexableDoc[] = [
  doc(
    'pages',
    ['/cs/strojove-videni', 'Strojové vidění'],
    ['/en/machine-vision', 'Machine vision'],
  ),
  doc('pages', ['/cs', 'Úvod'], ['/en', 'Home']),
  doc('pages', ['/cs/ai-kontrola-kvality', 'AI kontrola kvality'], null),
  doc('case-studies', ['/cs/case-studies/a', 'Studie A'], ['/en/case-studies/a', 'Study A']),
  doc('posts', null, ['/en/blog/p', 'Post']),
]

const text = buildLlmsTxt(docs, {
  siteName: 'Robopipe',
  descriptions: { cs: 'Česky.', en: 'English.' },
  contactEmail: 'info@example.com',
  phone: '+420 1',
})

describe('buildLlmsTxt', () => {
  it('starts with the llmstxt.org title and summary', () => {
    expect(text.startsWith('# Robopipe\n\n> Česky.\n> English.\n')).toBe(true)
  })

  it('lists home first, then pages by Czech title, cs before en', () => {
    const pages = text.split('## Stránky / Pages\n')[1].split('\n\n')[0].split('\n')
    expect(pages).toEqual([
      `- [Úvod](${SERVER_URL}/cs): Úvod popis`,
      `- [Home](${SERVER_URL}/en)`,
      `- [AI kontrola kvality](${SERVER_URL}/cs/ai-kontrola-kvality): AI kontrola kvality popis`,
      `- [Strojové vidění](${SERVER_URL}/cs/strojove-videni): Strojové vidění popis`,
      `- [Machine vision](${SERVER_URL}/en/machine-vision)`,
    ])
  })

  it('has use case, blog and contact sections', () => {
    expect(text).toContain(
      `## Případy užití / Use cases\n- [Studie A](${SERVER_URL}/cs/case-studies/a)`,
    )
    expect(text).toContain(`## Blog\n- [Post](${SERVER_URL}/en/blog/p)`)
    expect(text).toContain('## Kontakt / Contact\n- info@example.com, +420 1')
  })
})
