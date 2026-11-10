import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

/** Decisions G, H and I of Filip (product.md): seed copy about auto annotation. */
const dir = path.resolve('seed-assets/copy/seo-geo')
const read = (name: string) => readFileSync(path.join(dir, name), 'utf8')

const PAGES = {
  cs: ['landing-auto-annotation.cs.md', 'post-auto-annotation.cs.md'],
  en: ['landing-auto-annotation.md', 'post-auto-annotation.md'],
}
const faqs = JSON.parse(read('faqs.json')) as Record<
  string,
  Record<'cs' | 'en', { q: string; a: string }>
>
const aaFaqs = (locale: 'cs' | 'en') =>
  Object.entries(faqs)
    .filter(([key]) => key.startsWith('aa-'))
    .map(([, faq]) => `${faq[locale].q} ${faq[locale].a}`)

const ALL_COPY = [...PAGES.cs, ...PAGES.en, 'faqs.json']

describe('auto annotation copy', () => {
  it('has no [ověřit] mark and names no model provider or data location', () => {
    for (const name of ALL_COPY) {
      const text = read(name)
      expect(text, name).not.toContain('[ověřit]')
      expect(text, name).not.toMatch(/google|gemini|vertex|openai|cloud/i)
    }
  })

  it('names the Pro and Enterprise plans, not all customers', () => {
    const cs = [...PAGES.cs.map(read), ...aaFaqs('cs')].join('\n')
    const en = [...PAGES.en.map(read), ...aaFaqs('en')].join('\n')
    for (const name of PAGES.cs) expect(read(name), name).toMatch(/Pro a Enterprise/)
    for (const name of PAGES.en) expect(read(name), name).toMatch(/Pro and Enterprise/)
    expect(cs).not.toMatch(/všichni zákazníci/i)
    expect(en).not.toMatch(/all (robopipe studio )?customers/i)
    expect(faqs['aa-availability'].cs.a).toContain('Pro a Enterprise')
    expect(faqs['aa-availability'].en.a).toContain('Pro and Enterprise')
  })

  it('says that a person reviews and approves the proposed boxes', () => {
    for (const name of PAGES.cs)
      expect(read(name), name).toMatch(
        /zkontroluje, upraví a schválí|kontroluje, upravuje a schvaluje/,
      )
    for (const name of PAGES.en) expect(read(name), name).toMatch(/reviews, edits and approves/)
    expect(faqs['aa-approve'].cs.a).toContain('kontroluje člověk')
    expect(faqs['aa-approve'].en.a).toContain('A person always reviews')
  })

  it('offers an offline model or an on-premise deployment', () => {
    expect(faqs['aa-data'].cs.a).toMatch(/offline model.*on-premise/s)
    expect(faqs['aa-data'].en.a).toMatch(/offline model.*on-premise/s)
    for (const name of [...PAGES.cs, ...PAGES.en])
      expect(read(name), name).toMatch(/offline model.*on-premise/s)
  })
})
