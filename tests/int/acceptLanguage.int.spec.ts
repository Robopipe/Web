import { describe, expect, it } from 'vitest'

import { localeFromAcceptLanguage } from '@/lib/acceptLanguage'

describe('localeFromAcceptLanguage', () => {
  it('sends a Slovak Chrome with an English fallback to cs (tester T1)', () => {
    expect(localeFromAcceptLanguage('sk-SK,sk;q=0.9,en-US;q=0.8,en;q=0.7')).toBe('cs')
    expect(localeFromAcceptLanguage('sk-SK,en;q=0.5')).toBe('cs')
  })

  it('follows q values, then the order in the header', () => {
    expect(localeFromAcceptLanguage('en;q=0.4,cs;q=0.8')).toBe('cs')
    expect(localeFromAcceptLanguage('cs-CZ,cs;q=0.9,en;q=0.8')).toBe('cs')
    expect(localeFromAcceptLanguage('en-GB,cs')).toBe('en')
  })

  it('skips languages the site does not serve and q=0', () => {
    expect(localeFromAcceptLanguage('de-DE,de;q=0.9,en;q=0.5')).toBe('en')
    expect(localeFromAcceptLanguage('cs;q=0,en;q=0.1')).toBe('en')
  })

  it('gives undefined without a served language', () => {
    expect(localeFromAcceptLanguage('de,fr;q=0.8')).toBeUndefined()
    expect(localeFromAcceptLanguage('')).toBeUndefined()
    expect(localeFromAcceptLanguage(null)).toBeUndefined()
    expect(localeFromAcceptLanguage('*')).toBeUndefined()
  })
})
