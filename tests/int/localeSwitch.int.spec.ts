import { describe, expect, it } from 'vitest'

import { localeSwitchHref, localeSwitchPaths } from '@/lib/paths'

const docs = [
  { collection: 'pages' as const, slugs: { cs: 'home', en: 'home' } },
  { collection: 'pages' as const, slugs: { cs: 'cenik', en: 'pricing' } },
  { collection: 'posts' as const, slugs: { cs: 'jen-cesky' } },
  { collection: 'case-studies' as const, slugs: { cs: 'crocodille', en: 'crocodille-en' } },
]

describe('localeSwitchPaths', () => {
  const cs = localeSwitchPaths('cs', docs)

  it('keys each page by its path in the current locale', () => {
    expect(cs['/cs/cenik']).toEqual({ cs: '/cs/cenik', en: '/en/pricing' })
    expect(cs['/cs']).toEqual({ cs: '/cs', en: '/en' })
    expect(cs['/cs/case-studies/crocodille']?.en).toBe('/en/case-studies/crocodille-en')
  })

  it('adds the section indexes', () => {
    expect(cs['/cs/blog']?.en).toBe('/en/blog')
    expect(cs['/cs/case-studies']?.en).toBe('/en/case-studies')
  })

  it('leaves out pages without a version in the current locale', () => {
    const en = localeSwitchPaths('en', docs)
    expect(Object.keys(en)).not.toContain('/en/blog/jen-cesky')
    expect(en['/en/pricing']?.cs).toBe('/cs/cenik')
  })
})

describe('localeSwitchHref', () => {
  const cs = localeSwitchPaths('cs', docs)

  it('links to the translated slug, not a swapped prefix', () => {
    expect(localeSwitchHref(cs, '/cs/cenik', 'en')).toBe('/en/pricing')
    expect(localeSwitchHref(cs, '/cs/cenik/', 'en')).toBe('/en/pricing')
  })

  it('links to the target homepage when the page has no translation', () => {
    expect(localeSwitchHref(cs, '/cs/blog/jen-cesky', 'en')).toBe('/en')
    expect(localeSwitchHref(cs, '/cs/neexistuje', 'en')).toBe('/en')
  })
})
