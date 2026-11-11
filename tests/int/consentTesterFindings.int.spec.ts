import { afterEach, describe, expect, it } from 'vitest'

import { clearGoogleCookies } from '@/lib/analytics'
import { cookieNames, readCookie } from '@/lib/clientCookies'

/**
 * Tester findings for issue #21 (docs/specs/21-google-measurement/test-report.md).
 * They fail until the bugs are fixed.
 */

afterEach(() => {
  for (const name of cookieNames()) document.cookie = `${name}=; path=/; max-age=0`
})

describe('readCookie with a broken value', () => {
  it('returns no value instead of throwing on a malformed percent sequence', () => {
    document.cookie = 'rp_consent=%E0%A4%A; path=/'
    expect(() => readCookie('rp_consent')).not.toThrow()
  })
})

describe('clearGoogleCookies covers every Google cookie', () => {
  it('deletes _gac_* (Google Ads click data that GA4 stores when Ads is linked)', () => {
    document.cookie = '_gac_gb_123=1; path=/'
    document.cookie = '_gac_UA-1=1; path=/'
    clearGoogleCookies('analytics')
    clearGoogleCookies('marketing')
    expect(cookieNames()).toEqual([])
  })
})
