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
    ['/cs/kontrola-etiket', 'Kontrola etiket'],
    ['/en/label-inspection', 'Label inspection'],
  ),
  doc('pages', ['/cs', 'Úvod'], ['/en', 'Home']),
  doc('pages', ['/cs/detekce-vad-na-vyrobni-lince', 'Detekce vad na výrobní lince'], null),
  doc('case-studies', ['/cs/case-studies/a', 'Studie A'], ['/en/case-studies/a', 'Study A']),
  doc('posts', null, ['/en/blog/p', 'Post']),
]

const text = buildLlmsTxt(docs, {
  siteName: 'Robopipe',
  descriptions: { cs: 'Česky.', en: 'English.' },
  contactEmail: 'info@example.com',
  phone: '+420 1',
  legalName: 'robopipe s.r.o.',
  companyId: '24111791',
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
      `- [Detekce vad na výrobní lince](${SERVER_URL}/cs/detekce-vad-na-vyrobni-lince): Detekce vad na výrobní lince popis`,
      `- [Kontrola etiket](${SERVER_URL}/cs/kontrola-etiket): Kontrola etiket popis`,
      `- [Label inspection](${SERVER_URL}/en/label-inspection)`,
    ])
  })

  it('has use case, blog and contact sections', () => {
    expect(text).toContain(
      `## Případové studie / Case studies\n- [Případové studie](${SERVER_URL}/cs/case-studies)\n- [Case studies](${SERVER_URL}/en/case-studies)\n- [Studie A](${SERVER_URL}/cs/case-studies/a)`,
    )
    expect(text).toContain(
      `## Blog\n- [Blog](${SERVER_URL}/cs/blog)\n- [Blog](${SERVER_URL}/en/blog)\n- [Post](${SERVER_URL}/en/blog/p)`,
    )
    expect(text).toContain(
      '## Kontakt / Contact\n- robopipe s.r.o., IČO 24111791\n- info@example.com, +420 1',
    )
  })

  it('leaves the company line out without company facts', () => {
    const bare = buildLlmsTxt(docs, { descriptions: {}, contactEmail: 'info@example.com' })
    expect(bare).toContain('## Kontakt / Contact\n- info@example.com\n')
    expect(bare).not.toContain('IČO')
  })
})
