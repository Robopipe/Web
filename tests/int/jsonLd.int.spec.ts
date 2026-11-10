import { describe, expect, it } from 'vitest'

import {
  breadcrumbLd,
  faqPageLd,
  faqsFromLayout,
  organizationLd,
  serializeJsonLd,
  type FaqItem,
} from '@/lib/jsonLd'
import { SERVER_URL } from '@/lib/paths'
import type { Page, SiteSetting } from '@/payload-types'

const lexical = (children: unknown[]) =>
  ({
    root: { type: 'root', children, direction: null, format: '', indent: 0, version: 1 },
  }) as FaqItem['answer']

const text = (value: string, format = 0) => ({ type: 'text', text: value, format, version: 1 })

const faq = (id: number, question: string): FaqItem => ({
  id,
  question,
  answer: lexical([{ type: 'paragraph', version: 1, children: [text('Ano.')] }]),
})

describe('faqPageLd', () => {
  it('turns Lexical answers with links and bold into plain text', () => {
    const item: FaqItem = {
      id: 1,
      question: 'Vydrží kamera tlakové mytí?',
      answer: lexical([
        {
          type: 'paragraph',
          version: 1,
          children: [
            text('Ano, má krytí '),
            text('IP67', 1),
            text('. Viz '),
            { type: 'link', version: 1, fields: { url: '/cs' }, children: [text('ceník')] },
            text('.'),
          ],
        },
      ]),
    }
    const ld = faqPageLd([item])
    expect(ld).toMatchObject({
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'Vydrží kamera tlakové mytí?',
          acceptedAnswer: { '@type': 'Answer', text: 'Ano, má krytí IP67. Viz ceník.' },
        },
      ],
    })
  })

  it('returns null without FAQs', () => {
    expect(faqPageLd([])).toBeNull()
  })
})

describe('breadcrumbLd', () => {
  it('numbers positions from 1 with absolute URLs', () => {
    const ld = breadcrumbLd([
      { name: 'Úvod', path: '/cs' },
      { name: 'Případy užití', path: '/cs/case-studies' },
    ])
    expect(ld.itemListElement).toEqual([
      { '@type': 'ListItem', position: 1, name: 'Úvod', item: `${SERVER_URL}/cs` },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Případy užití',
        item: `${SERVER_URL}/cs/case-studies`,
      },
    ])
  })
})

describe('faqsFromLayout', () => {
  it('collects FAQs from faqAccordion and splitSection once each', () => {
    const layout = [
      { blockType: 'faqAccordion', faqs: [faq(1, 'A'), faq(2, 'B')] },
      { blockType: 'content', content: lexical([]) },
      { blockType: 'splitSection', faq: { faqs: [faq(2, 'B'), faq(3, 'C'), 4] } },
    ] as unknown as Page['layout']
    expect(faqsFromLayout(layout).map((f) => f.id)).toEqual([1, 2, 3])
  })
})

describe('serializeJsonLd', () => {
  it('escapes < so CMS text cannot close the script tag', () => {
    const out = serializeJsonLd({ '@type': 'Thing', name: '</script><script>alert(1)</script>' })
    expect(out).not.toContain('<')
    expect(JSON.parse(out).name).toBe('</script><script>alert(1)</script>')
  })
})

describe('organizationLd', () => {
  it('lists socials as sameAs and memberships as memberOf', () => {
    const ld = organizationLd({
      id: 1,
      siteName: 'Robopipe',
      contactEmail: 'info@example.com',
      contact: { phone: '+420 1', address: 'Ulice 1\nPraha' },
      socials: [{ platform: 'github', url: 'https://github.com/robopipe' }],
      memberships: [
        { name: 'Česká inovační platforma', url: 'https://innovationczechia.cz', logo: 5 },
      ],
    } as unknown as SiteSetting)
    expect(ld).toMatchObject({
      '@type': 'Organization',
      '@id': `${SERVER_URL}/#organization`,
      address: 'Ulice 1, Praha',
      sameAs: ['https://github.com/robopipe'],
      memberOf: [
        {
          '@type': 'Organization',
          name: 'Česká inovační platforma',
          url: 'https://innovationczechia.cz',
        },
      ],
    })
  })

  it('leaves out memberOf when there are no memberships', () => {
    const ld = organizationLd({ id: 1, siteName: 'Robopipe' } as SiteSetting)
    expect(ld).not.toHaveProperty('memberOf')
  })
})
