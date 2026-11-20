import { getPayload, type Payload } from 'payload'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { CONSENT_COOKIE, GOOGLE_COOKIES, createConsent, serializeConsent } from '@/lib/consent'
import {
  REFERRER_MAX_LENGTH,
  SOURCE_COOKIE,
  SOURCE_MAX_AGE_SECONDS,
  UTM_MAX_LENGTH,
  appendPageSource,
  cleanReferrer,
  cleanUtmValue,
  isOwnHost,
  landingFromPage,
  leadSourceFields,
  parseLanding,
  serializeLanding,
  sourceFromForm,
  sourceFromPage,
} from '@/lib/leadSource'
import { createLeadWithAttribution } from '@/lib/leadStore'
import config from '@/payload.config'

/** Issue #61: utm values and the referrer with the lead. */

// submitLead reads the request headers and cookies. Each test sets its own.
const request = vi.hoisted(() => ({
  headers: {} as Record<string, string>,
  cookies: {} as Record<string, string>,
}))
vi.mock('next/headers', () => ({
  headers: async () => new Headers(request.headers),
  cookies: async () => ({
    get: (name: string) =>
      name in request.cookies ? { name, value: request.cookies[name] } : undefined,
  }),
}))

const OWN = ['robopipe.io']
const NOW = new Date('2026-11-20T09:00:00.000Z')
const DAY_MS = 24 * 60 * 60 * 1000

describe('utm values', () => {
  it('keeps letters with accents, digits and campaign punctuation', () => {
    expect(cleanUtmValue('google')).toBe('google')
    expect(cleanUtmValue('Podzim 2026 | Brno (CZ)')).toBe('Podzim 2026 | Brno (CZ)')
    expect(cleanUtmValue('jarní_kampaň-2026.v2')).toBe('jarní_kampaň-2026.v2')
  })

  it('drops control characters, quotes, angle brackets and semicolons', () => {
    expect(cleanUtmValue('a\u0000b\tc\nd')).toBe('ab c d')
    expect(cleanUtmValue('"><script>x;</script>')).toBe('scriptx/script')
    expect(cleanUtmValue("it's")).toBe('its')
  })

  it('never starts with a formula character', () => {
    expect(cleanUtmValue('=HYPERLINK("x")')).toBe('HYPERLINK(x)')
    expect(cleanUtmValue('+cmd')).toBe('cmd')
    expect(cleanUtmValue('-2+3')).toBe('2+3')
    expect(cleanUtmValue('@SUM(A1)')).toBe('SUM(A1)')
    expect(cleanUtmValue(' = =@x')).toBe('x')
  })

  it('cuts to 100 characters and leaves out empty or very long input', () => {
    expect(cleanUtmValue('č'.repeat(150))).toHaveLength(UTM_MAX_LENGTH)
    expect(cleanUtmValue('a'.repeat(5000))).toBeUndefined()
    expect(cleanUtmValue('   ')).toBeUndefined()
    expect(cleanUtmValue('"<>;')).toBeUndefined()
    expect(cleanUtmValue(42)).toBeUndefined()
    expect(cleanUtmValue(null)).toBeUndefined()
  })
})

describe('referrer', () => {
  it('keeps only origin and path of another site', () => {
    expect(cleanReferrer('https://www.google.com/search?q=robot&x=1#top', OWN)).toBe(
      'https://www.google.com/search',
    )
    expect(cleanReferrer('https://user:secret@forum.example.cz/t/123?token=abc', OWN)).toBe(
      'https://forum.example.cz/t/123',
    )
  })

  it('leaves out our own domain, also www and other subdomains', () => {
    expect(cleanReferrer('https://robopipe.io/cs/kontakt', OWN)).toBeUndefined()
    expect(cleanReferrer('https://www.robopipe.io/', OWN)).toBeUndefined()
    expect(cleanReferrer('http://localhost:3961/cs', ['localhost'])).toBeUndefined()
    expect(cleanReferrer('https://notrobopipe.io/', OWN)).toBe('https://notrobopipe.io/')
    expect(isOwnHost('ROBOPIPE.IO', ['www.robopipe.io:443'])).toBe(true)
  })

  it('leaves out other schemes, broken values and empty input', () => {
    expect(cleanReferrer('javascript:alert(1)', OWN)).toBeUndefined()
    expect(cleanReferrer('android-app://com.google.android.gm/', OWN)).toBeUndefined()
    expect(cleanReferrer('not a url', OWN)).toBeUndefined()
    expect(cleanReferrer('', OWN)).toBeUndefined()
    expect(cleanReferrer(undefined, OWN)).toBeUndefined()
  })

  it('a long path leaves only the origin', () => {
    const long = `https://example.com/${'a'.repeat(400)}`
    expect(cleanReferrer(long, OWN)).toBe('https://example.com')
    expect(cleanReferrer(`https://example.com/${'a'.repeat(200)}`, OWN)!.length).toBeLessThan(
      REFERRER_MAX_LENGTH,
    )
  })
})

describe('first landing cookie rp_source', () => {
  const search = '?utm_source=linkedin&utm_medium=social&utm_campaign=podzim&gclid=abc'

  it('a landing with utm or a referrer makes a cookie value, a plain visit does not', () => {
    expect(landingFromPage(search, '', OWN, NOW)).toEqual({
      v: 1,
      utm_source: 'linkedin',
      utm_medium: 'social',
      utm_campaign: 'podzim',
      at: NOW.toISOString(),
    })
    expect(landingFromPage('', 'https://www.seznam.cz/', OWN, NOW)).toEqual({
      v: 1,
      referrer: 'https://www.seznam.cz/',
      at: NOW.toISOString(),
    })
    expect(landingFromPage('?tier=pro', 'https://robopipe.io/cs', OWN, NOW)).toBeNull()
  })

  it('serialize and parse agree', () => {
    const landing = landingFromPage(search, 'https://www.google.com/', OWN, NOW)!
    expect(parseLanding(serializeLanding(landing), OWN, NOW)).toEqual(landing)
  })

  it('a broken, foreign, old or future cookie gives no landing', () => {
    const at = (time: number) =>
      JSON.stringify({ v: 1, utm_source: 'x', at: new Date(time).toISOString() })
    expect(parseLanding(undefined, OWN, NOW)).toBeNull()
    expect(parseLanding('{', OWN, NOW)).toBeNull()
    expect(parseLanding('[]', OWN, NOW)).toBeNull()
    expect(
      parseLanding(JSON.stringify({ v: 2, utm_source: 'x', at: NOW.toISOString() }), OWN, NOW),
    ).toBeNull()
    expect(parseLanding(at(NOW.getTime() - SOURCE_MAX_AGE_SECONDS * 1000 - 1), OWN, NOW)).toBeNull()
    expect(parseLanding(at(NOW.getTime() + 2 * 60 * 60 * 1000), OWN, NOW)).toBeNull()
    expect(parseLanding(at(NOW.getTime() - 89 * DAY_MS), OWN, NOW)).not.toBeNull()
  })

  it('a hand-made cookie never brings a bad value back', () => {
    const raw = JSON.stringify({
      v: 1,
      utm_source: '=cmd|"/c calc"!A1',
      utm_medium: { nested: true },
      referrer: 'https://robopipe.io/cs?email=a@b.cz',
      at: NOW.toISOString(),
    })
    expect(parseLanding(raw, OWN, NOW)).toEqual({
      v: 1,
      utm_source: 'cmd|/c calc!A1',
      at: NOW.toISOString(),
    })
    const onlyJunk = JSON.stringify({ v: 1, utm_source: '";<>', at: NOW.toISOString() })
    expect(parseLanding(onlyJunk, OWN, NOW)).toBeNull()
  })

  it('analytics consent covers rp_source, marketing does not', () => {
    expect(GOOGLE_COOKIES.analytics.test(SOURCE_COOKIE)).toBe(true)
    expect(GOOGLE_COOKIES.marketing.test(SOURCE_COOKIE)).toBe(false)
  })
})

describe('priority', () => {
  const formPage = sourceFromPage('?utm_source=newsletter', 'https://mail.example.com/', OWN)
  const landing = landingFromPage('?utm_source=linkedin&utm_campaign=podzim', '', OWN, NOW)

  it('a valid first landing wins as a whole, nothing mixes in from the form page', () => {
    expect(leadSourceFields(landing, formPage)).toEqual({
      utmSource: 'linkedin',
      utmCampaign: 'podzim',
      sourceFrom: 'landing',
      landedAt: NOW.toISOString(),
    })
  })

  it('without a landing the form page is the fallback', () => {
    expect(leadSourceFields(null, formPage)).toEqual({
      utmSource: 'newsletter',
      referrer: 'https://mail.example.com/',
      sourceFrom: 'formPage',
    })
  })

  it('no source gives no fields', () => {
    expect(leadSourceFields(null, {})).toEqual({})
  })
})

describe('form fields', () => {
  it('appendPageSource adds only clean values, the server cleans them again', () => {
    const data = new FormData()
    appendPageSource(
      data,
      '?utm_source=%3Dbad&utm_term=robot+arm&utm_content=',
      'https://www.google.com/search?q=x',
      OWN,
    )
    expect(Object.fromEntries(data)).toEqual({
      utm_source: 'bad',
      utm_term: 'robot arm',
      referrer: 'https://www.google.com/search',
    })
    const tampered = new Map<string, string>([
      ['utm_source', '=1+1'],
      ['referrer', 'https://robopipe.io/x'],
    ])
    expect(sourceFromForm((name) => tampered.get(name) ?? null, OWN)).toEqual({ utm_source: '1+1' })
  })
})

describe('submitLead stores the source', () => {
  const MARK = `int61-${Date.now()}`
  let payload: Payload
  let ip = 10

  const submit = async (fields: Record<string, string>, cookies: Record<string, string> = {}) => {
    request.headers = { 'x-forwarded-for': `198.51.100.${ip++}`, host: 'robopipe.io' }
    request.cookies = cookies
    const { submitLead } = await import('@/actions/submitLead')
    const form = new FormData()
    form.set('name', `TEST utm ${MARK}`)
    form.set('email', `test.${MARK}@koala42.com`)
    form.set('phone', '+420 777 000 061')
    form.set('message', `Testovací poptávka ${MARK} ${ip}`)
    form.set('locale', 'cs')
    for (const [name, value] of Object.entries(fields)) form.set(name, value)
    const state = await submitLead({ status: 'idle' }, form)
    expect(state.status).toBe('success')
    const { docs } = await payload.find({
      collection: 'leads',
      where: { message: { equals: `Testovací poptávka ${MARK} ${ip}` } },
      overrideAccess: true,
      depth: 0,
    })
    expect(docs).toHaveLength(1)
    return docs[0]
  }

  const analyticsConsent = serializeConsent(createConsent(true, false))

  beforeAll(async () => {
    payload = await getPayload({ config: await config })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  afterAll(async () => {
    await payload.delete({
      collection: 'leads',
      where: { message: { contains: MARK } },
      overrideAccess: true,
      context: { skipRevalidate: true },
    })
  })

  it('without consent: the form page values, no cookie read', async () => {
    const lead = await submit(
      { utm_source: 'google', utm_medium: 'cpc', referrer: 'https://www.google.com/' },
      { [SOURCE_COOKIE]: serializeLanding(landingFromPage('?utm_source=linkedin', '', OWN)!) },
    )
    expect(lead.testLead).toBe(true)
    expect(lead.attribution).toMatchObject({
      consentAnalytics: false,
      utmSource: 'google',
      utmMedium: 'cpc',
      referrer: 'https://www.google.com/',
      sourceFrom: 'formPage',
      landedAt: null,
    })
  })

  it('with analytics consent: the first landing wins over the form page', async () => {
    const landing = landingFromPage('?utm_source=linkedin&utm_campaign=podzim', '', OWN)!
    const lead = await submit(
      { utm_source: 'newsletter' },
      { [CONSENT_COOKIE]: analyticsConsent, [SOURCE_COOKIE]: serializeLanding(landing) },
    )
    expect(lead.attribution).toMatchObject({
      consentAnalytics: true,
      utmSource: 'linkedin',
      utmCampaign: 'podzim',
      utmMedium: null,
      sourceFrom: 'landing',
      landedAt: landing.at,
    })
  })

  it('a broken cookie and bad form values never stop the lead', async () => {
    const lead = await submit(
      { utm_source: '";<>', referrer: 'https://robopipe.io/cs?x=1', utm_term: 'x'.repeat(5000) },
      { [CONSENT_COOKIE]: analyticsConsent, [SOURCE_COOKIE]: '{"v":1,' },
    )
    expect(lead.attribution).toMatchObject({
      consentAnalytics: true,
      utmSource: null,
      utmTerm: null,
      referrer: null,
      sourceFrom: null,
    })
  })

  it('the notification email lists the source', async () => {
    const findGlobal = payload.findGlobal.bind(payload)
    vi.spyOn(payload, 'findGlobal').mockImplementation((async (
      args: Parameters<Payload['findGlobal']>[0],
    ) => ({
      ...(await findGlobal(args)),
      leadNotificationEmail: 'sales@example.com',
    })) as Payload['findGlobal'])
    const sendEmail = vi.spyOn(payload, 'sendEmail').mockResolvedValue(undefined)
    await submit({
      utm_source: 'google',
      utm_campaign: 'brand',
      referrer: 'https://www.google.com/',
    })
    const text = (sendEmail.mock.calls[0][0] as { text: string }).text
    expect(text).toContain('utm_source: google')
    expect(text).toContain('utm_campaign: brand')
    expect(text).toContain('Referrer: https://www.google.com/')
    expect(text).toContain('Source from: form page')
  })

  it('the database limit drops only the attribution, the lead stays', async () => {
    const stored = await createLeadWithAttribution(
      payload,
      {
        name: `TEST utm ${MARK}`,
        email: `test.${MARK}@koala42.com`,
        message: `Testovací poptávka ${MARK} limit`,
        locale: 'cs',
      },
      {
        consentAnalytics: true,
        consentMarketing: false,
        utmSource: 'x'.repeat(UTM_MAX_LENGTH + 1),
      },
    )
    expect(stored.id).toBeDefined()
    expect(stored.attribution?.utmSource ?? null).toBeNull()
  })
})
