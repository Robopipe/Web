import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { clearGoogleCookies, initGoogleTag, trackEvent, updateGoogleConsent } from '@/lib/analytics'
import { cookieNames, readCookie, writeCookie } from '@/lib/clientCookies'
import {
  GOOGLE_COOKIES,
  cookieDomain,
  createConsent,
  deniedCategories,
  parseConsent,
  serializeConsent,
  toConsentMode,
} from '@/lib/consent'

const DENIED = {
  analytics_storage: 'denied',
  ad_storage: 'denied',
  ad_user_data: 'denied',
  ad_personalization: 'denied',
}

describe('parseConsent', () => {
  it('returns null for a missing value', () => {
    expect(parseConsent(undefined)).toBeNull()
    expect(parseConsent(null)).toBeNull()
    expect(parseConsent('')).toBeNull()
  })

  it('returns null for a broken value', () => {
    expect(parseConsent('{not json')).toBeNull()
    expect(parseConsent('"text"')).toBeNull()
    expect(parseConsent('null')).toBeNull()
    expect(parseConsent('{"v":1,"analytics":"yes","marketing":false,"at":"x"}')).toBeNull()
    expect(parseConsent('{"v":1,"analytics":true,"marketing":false}')).toBeNull()
  })

  it('returns null for another version', () => {
    expect(parseConsent('{"v":2,"analytics":true,"marketing":true,"at":"x"}')).toBeNull()
  })

  it('reads a valid value and drops unknown keys', () => {
    expect(
      parseConsent(
        '{"v":1,"analytics":true,"marketing":false,"at":"2026-11-11T10:00:00.000Z","x":1}',
      ),
    ).toEqual({ v: 1, analytics: true, marketing: false, at: '2026-11-11T10:00:00.000Z' })
  })

  it('is the inverse of serializeConsent', () => {
    for (const [analytics, marketing] of [
      [true, true],
      [true, false],
      [false, true],
      [false, false],
    ]) {
      const choice = createConsent(analytics, marketing, new Date('2026-11-11T10:00:00Z'))
      expect(parseConsent(serializeConsent(choice))).toEqual(choice)
    }
  })
})

describe('toConsentMode', () => {
  it('denies everything without a choice', () => {
    expect(toConsentMode(null)).toEqual(DENIED)
  })

  it('maps analytics only to analytics_storage', () => {
    expect(toConsentMode(createConsent(true, false))).toEqual({
      ...DENIED,
      analytics_storage: 'granted',
    })
  })

  it('maps marketing to the three ad values', () => {
    expect(toConsentMode(createConsent(false, true))).toEqual({
      analytics_storage: 'denied',
      ad_storage: 'granted',
      ad_user_data: 'granted',
      ad_personalization: 'granted',
    })
  })

  it('grants all four values for both categories', () => {
    expect(Object.values(toConsentMode(createConsent(true, true)))).toEqual(
      Array(4).fill('granted'),
    )
  })
})

describe('Google cookie helpers', () => {
  it('matches the Google cookies of each category', () => {
    for (const name of ['_ga', '_ga_ABC123', '_gid', '_gat', '_gat_UA-1']) {
      expect(GOOGLE_COOKIES.analytics.test(name)).toBe(true)
      expect(GOOGLE_COOKIES.marketing.test(name)).toBe(false)
    }
    for (const name of ['_gcl_au', '_gcl_aw']) {
      expect(GOOGLE_COOKIES.marketing.test(name)).toBe(true)
      expect(GOOGLE_COOKIES.analytics.test(name)).toBe(false)
    }
    for (const name of ['rp_consent', 'NEXT_LOCALE', '_gax', 'ga']) {
      expect(GOOGLE_COOKIES.analytics.test(name) || GOOGLE_COOKIES.marketing.test(name)).toBe(false)
    }
  })

  it('lists the categories a choice does not allow', () => {
    expect(deniedCategories(createConsent(false, false))).toEqual(['analytics', 'marketing'])
    expect(deniedCategories(createConsent(true, false))).toEqual(['marketing'])
    expect(deniedCategories(createConsent(true, true))).toEqual([])
  })

  it('finds the domain that Google writes cookies to', () => {
    expect(cookieDomain('robopipe.io')).toBe('.robopipe.io')
    expect(cookieDomain('www.robopipe.io')).toBe('.robopipe.io')
    expect(cookieDomain('localhost')).toBeUndefined()
    expect(cookieDomain('127.0.0.1')).toBeUndefined()
    expect(cookieDomain('::1')).toBeUndefined()
  })
})

const clearAllCookies = () => {
  for (const name of cookieNames()) document.cookie = `${name}=; path=/; max-age=0`
}

/** `dataLayer` holds `arguments` objects. */
const commands = () =>
  (window.dataLayer ?? []).map((entry) => Array.from(entry as ArrayLike<unknown>))

describe('Google tag', () => {
  beforeEach(() => {
    delete window.gtag
    delete window.dataLayer
    document.head.querySelectorAll('script').forEach((script) => script.remove())
    clearAllCookies()
  })

  afterEach(() => {
    delete window.gtag
    delete window.dataLayer
  })

  it('queues default denied before config and loads the script once', () => {
    initGoogleTag({ analyticsId: 'G-TEST000000', adsId: 'AW-000000000' }, null)
    initGoogleTag({ analyticsId: 'G-TEST000000', adsId: 'AW-000000000' }, null)

    const queued = commands()
    expect(queued.map((command) => command.slice(0, 2))).toEqual([
      ['consent', 'default'],
      ['set', 'ads_data_redaction'],
      ['js', expect.any(Date)],
      ['config', 'G-TEST000000'],
      ['config', 'AW-000000000'],
    ])
    expect(queued[0][2]).toEqual(DENIED)
    // jsdom finishes loading before the tests run, so the script goes in at once.
    const scripts = document.head.querySelectorAll('script[src*="googletagmanager.com/gtag/js"]')
    expect(scripts).toHaveLength(1)
    expect(scripts[0].getAttribute('src')).toBe(
      'https://www.googletagmanager.com/gtag/js?id=G-TEST000000',
    )
  })

  it('applies a stored choice before config', () => {
    initGoogleTag({ adsId: 'AW-000000000' }, createConsent(true, false))
    const queued = commands()
    const update = queued.findIndex(([name, kind]) => name === 'consent' && kind === 'update')
    const config = queued.findIndex(([name]) => name === 'config')
    expect(update).toBeGreaterThan(0)
    expect(update).toBeLessThan(config)
    expect(queued[update][2]).toEqual({ ...DENIED, analytics_storage: 'granted' })
    expect(document.head.querySelector('script')?.getAttribute('src')).toContain('id=AW-000000000')
  })

  it('does nothing without an ID', () => {
    initGoogleTag({ analyticsId: '', adsId: null }, null)
    expect(window.gtag).toBeUndefined()
    expect(window.dataLayer).toBeUndefined()
    expect(document.head.querySelector('script')).toBeNull()
  })

  it('sends events and consent updates only when the tag exists', () => {
    trackEvent('generate_lead', { form_location: '/cs/kontakt' })
    updateGoogleConsent(createConsent(true, true))
    expect(window.dataLayer).toBeUndefined()

    initGoogleTag({ analyticsId: 'G-TEST000000' }, null)
    trackEvent('generate_lead', { form_location: '/cs/kontakt' })
    updateGoogleConsent(createConsent(true, true))
    expect(commands().slice(-2)).toEqual([
      ['event', 'generate_lead', { form_location: '/cs/kontakt' }],
      ['consent', 'update', Object.fromEntries(Object.keys(DENIED).map((key) => [key, 'granted']))],
    ])
  })

  it('deletes only the cookies of the revoked category', () => {
    for (const name of ['_ga', '_ga_ABC123', '_gid', '_gcl_au', 'rp_consent']) {
      document.cookie = `${name}=1; path=/`
    }
    clearGoogleCookies('analytics')
    expect(cookieNames().sort()).toEqual(['_gcl_au', 'rp_consent'])
    clearGoogleCookies('marketing')
    expect(cookieNames()).toEqual(['rp_consent'])
  })
})

describe('client cookies', () => {
  beforeEach(clearAllCookies)

  it('writes and reads an encoded value', () => {
    writeCookie('rp_consent', '{"v":1}', 60)
    expect(readCookie('rp_consent')).toBe('{"v":1}')
    expect(readCookie('missing')).toBeUndefined()
  })

  it('treats a value with broken percent encoding as missing', () => {
    document.cookie = 'rp_consent=%E0%A4%A; path=/'
    expect(readCookie('rp_consent')).toBeUndefined()
  })
})
