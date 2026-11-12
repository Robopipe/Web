import { sql } from '@payloadcms/db-postgres'
import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { GET } from '@/app/api/google-ads/company-leads.csv/route'
import {
  CLICK_COOKIE,
  CLICK_MAX_AGE_SECONDS,
  clickIdFromSearch,
  parseClickId,
  serializeClickId,
  type ClickId,
} from '@/lib/clickId'
import { CONSENT_COOKIE, GOOGLE_COOKIES, createConsent, serializeConsent } from '@/lib/consent'
import {
  EXPORT_COLUMNS,
  attributionFromCookies,
  hashEmail,
  isGoogleAdsLead,
  toCsv,
  toExportRow,
} from '@/lib/googleAds'
import {
  FREE_EMAIL_DOMAINS,
  emailDomain,
  isBusinessEmail,
  isTestLead,
  normalizeEmail,
} from '@/lib/leadEmail'
import { createLeadWithAttribution } from '@/lib/leadStore'
import config from '@/payload.config'
import type { Lead, User } from '@/payload-types'

import { setExportLogin } from '../helpers/exportLogin'

/** Issue #26, docs/specs/26-offline-conversions/architecture.md chapter 13.1. */

const NOVAK_HASH = '0193ede04c0598c7eda49eabe318a1aa481ea93f2093691e807950a59f04d5d0'
const NOW = new Date('2026-11-12T09:14:03.456Z')
const DAY_MS = 24 * 60 * 60 * 1000

const click = (overrides: Partial<ClickId> = {}): ClickId => ({
  v: 1,
  type: 'gclid',
  id: 'Cj0K_abc-1',
  at: new Date(NOW.getTime() - DAY_MS).toISOString(),
  ...overrides,
})

const cookieJar =
  (values: Record<string, string>) =>
  (name: string): string | undefined =>
    values[name]

describe('leadEmail (criterion 4)', () => {
  it('a company domain and its subdomain are company emails', () => {
    expect(isBusinessEmail('novak@firma.cz')).toBe(true)
    expect(isBusinessEmail('novak@praha.firma.cz')).toBe(true)
  })

  it('no public mail service is a company email', () => {
    expect(FREE_EMAIL_DOMAINS.size).toBeGreaterThan(30)
    for (const domain of FREE_EMAIL_DOMAINS) {
      expect(isBusinessEmail(`novak@${domain}`), domain).toBe(false)
    }
    expect(isBusinessEmail('Novak@GMAIL.COM ')).toBe(false)
  })

  it('empty and invalid emails are not company emails', () => {
    for (const email of ['', 'bez-zavinace', '@firma.cz', 'novak@', 'novak@firma']) {
      expect(isBusinessEmail(email), email).toBe(false)
    }
  })

  it('normalizes like Google: trim, lowercase, no dots before @ for Gmail', () => {
    expect(normalizeEmail(' Jan.Novak@GMail.com ')).toBe('jannovak@gmail.com')
    expect(normalizeEmail('Jan.Novak@googlemail.com')).toBe('jannovak@googlemail.com')
    expect(normalizeEmail(' Jan.Novak@Firma.cz')).toBe('jan.novak@firma.cz')
    expect(emailDomain('a@B.Firma.CZ ')).toBe('b.firma.cz')
    expect(emailDomain('bez-zavinace')).toBe('')
  })

  it('test leads: our domains with subdomains, or a name that starts with TEST', () => {
    expect(isTestLead({ email: 'x@koala42.com', name: 'Jan' })).toBe(true)
    expect(isTestLead({ email: 'x@dev.robopipe.io', name: 'Jan' })).toBe(true)
    expect(isTestLead({ email: 'x@firma.cz', name: 'TEST Novák' })).toBe(true)
    expect(isTestLead({ email: 'x@firma.cz', name: '  TEST' })).toBe(true)
    expect(isTestLead({ email: 'x@firma.cz', name: 'Testová' })).toBe(false)
    expect(isTestLead({ email: 'x@firma.cz', name: 'test x' })).toBe(false)
    expect(isTestLead({ email: 'x@notrobopipe.io', name: 'Jan' })).toBe(false)
  })
})

describe('hashEmail (criterion 3)', () => {
  it('hashes the normalized email as hex SHA-256', () => {
    expect(hashEmail('Novak@Firma.cz ')).toBe(NOVAK_HASH)
    expect(hashEmail('novak@firma.cz')).toBe(NOVAK_HASH)
    expect(hashEmail('Jan.Novak@gmail.com')).toBe(hashEmail('jannovak@gmail.com'))
  })
})

describe('clickId (criteria 1, 2)', () => {
  it('reads gclid, gbraid and wbraid, gclid first', () => {
    expect(clickIdFromSearch('?gclid=Abc_-1', NOW)).toEqual({
      v: 1,
      type: 'gclid',
      id: 'Abc_-1',
      at: NOW.toISOString(),
    })
    expect(clickIdFromSearch('?wbraid=W1', NOW)?.type).toBe('wbraid')
    expect(clickIdFromSearch('?gbraid=G1&gclid=C1', NOW)).toMatchObject({ type: 'gclid', id: 'C1' })
    expect(clickIdFromSearch('?utm_source=x', NOW)).toBeNull()
  })

  it('keeps the case of the ID and rejects bad values', () => {
    expect(clickIdFromSearch('?gclid=AbC', NOW)?.id).toBe('AbC')
    expect(clickIdFromSearch('?gclid=', NOW)).toBeNull()
    expect(clickIdFromSearch('?gclid=a%3Bb', NOW)).toBeNull()
    expect(clickIdFromSearch('?gclid=a%20b', NOW)).toBeNull()
    expect(clickIdFromSearch('?gclid=a%2Cb', NOW)).toBeNull()
    expect(clickIdFromSearch(`?gclid=${'a'.repeat(512)}`, NOW)?.id).toHaveLength(512)
    expect(clickIdFromSearch(`?gclid=${'a'.repeat(513)}`, NOW)).toBeNull()
  })

  it('parses a valid cookie and is the inverse of serialize', () => {
    const value = click()
    expect(parseClickId(serializeClickId(value), NOW)).toEqual(value)
  })

  it('rejects a broken, unknown, future or expired cookie', () => {
    expect(parseClickId(undefined, NOW)).toBeNull()
    expect(parseClickId('{broken', NOW)).toBeNull()
    expect(parseClickId('"text"', NOW)).toBeNull()
    expect(parseClickId(serializeClickId({ ...click(), v: 2 as 1 }), NOW)).toBeNull()
    expect(parseClickId(JSON.stringify({ ...click(), type: 'fbclid' }), NOW)).toBeNull()
    expect(parseClickId(JSON.stringify({ ...click(), id: 'a;b' }), NOW)).toBeNull()
    const future = new Date(NOW.getTime() + 2 * 60 * 60 * 1000).toISOString()
    expect(parseClickId(serializeClickId(click({ at: future })), NOW)).toBeNull()
    const expired = new Date(NOW.getTime() - CLICK_MAX_AGE_SECONDS * 1000 - 1000).toISOString()
    expect(parseClickId(serializeClickId(click({ at: expired })), NOW)).toBeNull()
    expect(parseClickId(serializeClickId(click({ at: 'yesterday' })), NOW)).toBeNull()
  })

  it('accepts a visitor clock a few minutes ahead of the server', () => {
    const ahead = new Date(NOW.getTime() + 5 * 60 * 1000).toISOString()
    expect(parseClickId(serializeClickId(click({ at: ahead })), NOW)).not.toBeNull()
  })

  it('rp_click is a marketing cookie (criterion 2)', () => {
    expect(GOOGLE_COOKIES.marketing.test(CLICK_COOKIE)).toBe(true)
    expect(GOOGLE_COOKIES.analytics.test(CLICK_COOKIE)).toBe(false)
  })
})

describe('attributionFromCookies (criterion 1)', () => {
  const consent = (analytics: boolean, marketing: boolean) =>
    serializeConsent(createConsent(analytics, marketing, NOW))

  it('without rp_consent: no consent, no click', () => {
    expect(
      attributionFromCookies(cookieJar({ [CLICK_COOKIE]: serializeClickId(click()) }), NOW),
    ).toEqual({ consentAnalytics: false, consentMarketing: false })
  })

  it('marketing denied: the click is not stored', () => {
    const get = cookieJar({
      [CONSENT_COOKIE]: consent(true, false),
      [CLICK_COOKIE]: serializeClickId(click()),
    })
    expect(attributionFromCookies(get, NOW)).toEqual({
      consentAnalytics: true,
      consentMarketing: false,
    })
  })

  it('marketing granted with a click', () => {
    const get = cookieJar({
      [CONSENT_COOKIE]: consent(false, true),
      [CLICK_COOKIE]: serializeClickId(click({ type: 'wbraid', id: 'W_1' })),
    })
    expect(attributionFromCookies(get, NOW)).toEqual({
      consentAnalytics: false,
      consentMarketing: true,
      wbraid: 'W_1',
      clickedAt: click().at,
    })
  })

  it('marketing granted without a click, and broken cookies', () => {
    expect(
      attributionFromCookies(cookieJar({ [CONSENT_COOKIE]: consent(true, true) }), NOW),
    ).toEqual({
      consentAnalytics: true,
      consentMarketing: true,
    })
    expect(
      attributionFromCookies(cookieJar({ [CONSENT_COOKIE]: '{', [CLICK_COOKIE]: '{' }), NOW),
    ).toEqual({ consentAnalytics: false, consentMarketing: false })
  })
})

describe('isGoogleAdsLead (criterion 6)', () => {
  const lead = (email: string, consentMarketing: boolean, name = 'Jan Novák', gclid?: string) => ({
    email,
    name,
    attribution: { consentAnalytics: false, consentMarketing, gclid },
  })

  it('company email with marketing consent, with or without a click', () => {
    expect(isGoogleAdsLead(lead('novak@firma.cz', true, 'Jan', 'C1'))).toBe(true)
    expect(isGoogleAdsLead(lead('novak@firma.cz', true))).toBe(true)
  })

  it('not Gmail, not without consent, not a test lead', () => {
    expect(isGoogleAdsLead(lead('novak@gmail.com', true, 'Jan', 'C1'))).toBe(false)
    expect(isGoogleAdsLead(lead('novak@firma.cz', false, 'Jan', 'C1'))).toBe(false)
    expect(isGoogleAdsLead({ email: 'novak@firma.cz', name: 'Jan', attribution: undefined })).toBe(
      false,
    )
    expect(isGoogleAdsLead(lead('x@koala42.com', true))).toBe(false)
    expect(isGoogleAdsLead(lead('novak@firma.cz', true, 'TEST Novák'))).toBe(false)
  })
})

describe('export format (criteria 5, 6, 9)', () => {
  const exportLead = {
    id: 412,
    email: 'Novak@Firma.cz',
    createdAt: '2026-11-12T09:14:03.456Z',
    attribution: { consentMarketing: true, gclid: 'Cj0KCQiA5rGuBhCnARIsAN11vgQ_example' },
  }

  it('writes the fixed header row and one row per lead', () => {
    const csv = toCsv([toExportRow(exportLead, 'Firemni poptavka (import)')])
    expect(csv).toBe(
      'Order ID,Conversion Name,Conversion Time,Google Click ID,GBRAID,WBRAID,Email,Ad User Data\n' +
        `lead-412,Firemni poptavka (import),2026-11-12T09:14:03Z,Cj0KCQiA5rGuBhCnARIsAN11vgQ_example,,,${NOVAK_HASH},Granted\n`,
    )
    expect(toCsv([])).toBe(`${EXPORT_COLUMNS.join(',')}\n`)
  })

  it('takes the conversion name from the argument and quotes special characters', () => {
    const row = toExportRow({ ...exportLead, attribution: {} }, 'Lead, "company"')
    expect(row['Conversion Name']).toBe('Lead, "company"')
    expect(row['Google Click ID']).toBe('')
    expect(toCsv([row]).split('\n')[1]).toContain(',"Lead, ""company""",')
  })

  it('Conversion Time is UTC with Z and without milliseconds', () => {
    const row = toExportRow({ ...exportLead, createdAt: '2026-03-29T01:30:00.999+02:00' }, 'x')
    expect(row['Conversion Time']).toBe('2026-03-28T23:30:00Z')
  })

  it('no column contains a readable email', () => {
    const row = toExportRow(exportLead, 'x')
    for (const value of Object.values(row)) expect(value).not.toContain('@')
  })
})

describe('export route with the Local API (criteria 5 to 9, 13)', () => {
  const USER = 'google-ads-int'
  const PASSWORD = 'int-test-password-0123456789abcdef'
  const MARK = `int26-${Date.now()}`
  const auth = { authorization: `Basic ${Buffer.from(`${USER}:${PASSWORD}`).toString('base64')}` }
  const url = 'http://localhost/api/google-ads/company-leads.csv'

  let payload: Payload
  let editor: User
  let conversionName: string
  const created: number[] = []
  let restoreLogin: (() => Promise<void>) | undefined

  const createLead = async (
    email: string,
    consentMarketing: boolean,
    extra: Partial<Lead> = {},
  ): Promise<Lead> => {
    const lead = await payload.create({
      collection: 'leads',
      data: {
        name: 'Jan Novák',
        email,
        message: MARK,
        locale: 'cs',
        attribution: { consentAnalytics: true, consentMarketing, gclid: `${MARK}-gclid` },
        ...extra,
      },
      overrideAccess: true,
      context: { skipRevalidate: true },
    })
    created.push(lead.id)
    return lead
  }

  const exportRows = async () => {
    const response = await GET(new Request(url, { headers: auth }))
    expect(response.status).toBe(200)
    const body = await response.text()
    return { body, rows: body.split('\n').filter((line) => line.includes(MARK)) }
  }

  beforeAll(async () => {
    payload = await getPayload({ config: await config })
    restoreLogin = await setExportLogin(payload, USER, PASSWORD)
    const settings = await payload.findGlobal({ slug: 'site-settings', depth: 0 })
    conversionName = settings.measurement.leadConversionName
    editor = await payload.create({
      collection: 'users',
      data: {
        name: 'Int Editor',
        email: `${MARK}@editor.test`,
        password: 'editor-password-123',
        role: 'editor',
      },
      overrideAccess: true,
    })

    await createLead(`novak.${MARK}@firma.cz`, true)
    await createLead(`novak.${MARK}@gmail.com`, true)
    await createLead(`bez.${MARK}@firma.cz`, false)
    await createLead(`test.${MARK}@koala42.com`, true)
    const old = await createLead(`stara.${MARK}@firma.cz`, true)
    // Payload sets createdAt on create, so the old lead is moved back with an update.
    await payload.update({
      collection: 'leads',
      id: old.id,
      data: { createdAt: new Date(Date.now() - 91 * DAY_MS).toISOString() },
      overrideAccess: true,
      context: { skipRevalidate: true },
    })
  })

  afterAll(async () => {
    await restoreLogin?.()
    if (!payload) return
    await payload.delete({
      collection: 'leads',
      where: { id: { in: created } },
      overrideAccess: true,
      context: { skipRevalidate: true },
    })
    if (editor) await payload.delete({ collection: 'users', id: editor.id, overrideAccess: true })
  })

  it('401 with WWW-Authenticate without login and with a wrong password', async () => {
    const none = await GET(new Request(url))
    expect(none.status).toBe(401)
    expect(none.headers.get('www-authenticate')).toMatch(/^Basic realm="google-ads-export"/)
    const wrong = `Basic ${Buffer.from(`${USER}:wrong`).toString('base64')}`
    expect((await GET(new Request(url, { headers: { authorization: wrong } }))).status).toBe(401)
  })

  it('exports exactly the recent company lead with consent', async () => {
    const response = await GET(new Request(url, { headers: auth }))
    expect(response.headers.get('content-type')).toBe('text/csv; charset=utf-8')
    expect(response.headers.get('cache-control')).toBe('no-store')
    const { body, rows } = await exportRows()
    expect(body.startsWith(`${EXPORT_COLUMNS.join(',')}\n`)).toBe(true)
    expect(rows).toHaveLength(1)
    const [orderId, name, , gclid, , , email, adUserData] = rows[0].split(',')
    expect(orderId).toBe(`lead-${created[0]}`)
    expect(name).toBe(conversionName)
    expect(gclid).toBe(`${MARK}-gclid`)
    expect(email).toBe(hashEmail(`novak.${MARK}@firma.cz`))
    expect(adUserData).toBe('Granted')
    expect(body).not.toContain('@')
  })

  it('a second run returns the same body, so Google Ads gets no second conversion', async () => {
    const first = await exportRows()
    const second = await exportRows()
    expect(second.body).toBe(first.body)
  })

  it('returns 500 when the conversion name is empty', async () => {
    // Bypass the `required` validation the same way a broken database row would.
    const db = payload.db as unknown as { drizzle: { execute: (q: unknown) => Promise<unknown> } }
    await db.drizzle.execute(sql`UPDATE site_settings SET measurement_lead_conversion_name = ''`)
    try {
      const response = await GET(new Request(url, { headers: auth }))
      expect(response.status).toBe(500)
      expect(await response.text()).toBe('Conversion name missing in site-settings.measurement')
    } finally {
      await db.drizzle.execute(
        sql`UPDATE site_settings SET measurement_lead_conversion_name = ${conversionName}`,
      )
    }
  })

  it('shows the virtual fields on read (criterion 13)', async () => {
    const [company, gmail, , test] = await Promise.all(
      created
        .slice(0, 4)
        .map((id) => payload.findByID({ collection: 'leads', id, overrideAccess: true })),
    )
    expect(company).toMatchObject({ businessEmail: true, testLead: false, googleAdsExport: true })
    expect(gmail).toMatchObject({ businessEmail: false, testLead: false, googleAdsExport: false })
    expect(test).toMatchObject({ businessEmail: true, testLead: true, googleAdsExport: false })
  })

  it('an editor cannot change the attribution (criterion 13)', async () => {
    const id = created[0]
    await payload.update({
      collection: 'leads',
      id,
      data: { status: 'contacted', attribution: { gclid: 'changed', consentMarketing: false } },
      user: editor,
      overrideAccess: false,
      context: { skipRevalidate: true },
    })
    const lead = await payload.findByID({ collection: 'leads', id, overrideAccess: true })
    expect(lead.status).toBe('contacted')
    expect(lead.attribution?.gclid).toBe(`${MARK}-gclid`)
    expect(lead.attribution?.consentMarketing).toBe(true)
  })
})

/** Tester findings, docs/specs/26-offline-conversions/test-report.md. They fail until fixed. */
describe('tester findings (test-report.md B1 to B3)', () => {
  it('B1: a click ID with a NUL byte never reaches the database (Postgres rejects 0x00)', () => {
    expect(clickIdFromSearch('?gclid=%00abc', NOW)).toBeNull()
    expect(clickIdFromSearch('?gclid=abc%00', NOW)).toBeNull()
    expect(parseClickId(serializeClickId(click({ id: '\u0000abc' })), NOW)).toBeNull()
    const attribution = attributionFromCookies(
      cookieJar({
        [CONSENT_COOKIE]: serializeConsent(createConsent(true, true)),
        [CLICK_COOKIE]: serializeClickId(click({ id: 'a\u0000b' })),
      }),
      NOW,
    )
    expect(JSON.stringify(attribution)).not.toContain('\\u0000')
  })

  it('B2: no export cell that comes from a click ID starts a spreadsheet formula', () => {
    for (const id of ['=1+1', '+SUM(A1)', '@SUM(A1)', '=HYPERLINK(1)']) {
      const fromUrl = clickIdFromSearch(`?gclid=${encodeURIComponent(id)}`, NOW)
      const row = toExportRow(
        {
          id: 1,
          email: 'novak@firma.cz',
          createdAt: NOW.toISOString(),
          attribution: { consentMarketing: true, gclid: fromUrl?.id ?? null },
        },
        'Firemni poptavka (import)',
      )
      for (const cell of toCsv([row]).split('\n')[1].split(',')) {
        expect(cell).not.toMatch(/^[=+@\t\r]/)
      }
    }
  })

  it('B3: clickedAt from the cookie is always an ISO time that Postgres accepts', () => {
    const landed = new Date(NOW.getTime() - 60 * 60 * 1000)
    for (const at of [landed.toString(), landed.toUTCString()]) {
      const parsed = parseClickId(serializeClickId(click({ at })), NOW)
      if (parsed) expect(parsed.at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/)
    }
  })
})

/** Round 2 fixes, docs/specs/26-offline-conversions/implementation.md chapter "Kolo 2". */
describe('round 2 (B1, B2, B5)', () => {
  it('B5: common public mail services from the tester report and their national variants', () => {
    const tester = ['t-online.de', 'hotmail.de', 'hotmail.co.uk', 'yahoo.co.uk', 'o2active.cz']
    const more = ['atlas.sk', 'post.sk', 'mail.ru', 'yandex.ru', 'zoho.com', 'tutanota.com']
    const variants = ['outlook.de', 'live.cz', 'gmx.at', 'web.de', 'proton.me', 'tuta.com']
    for (const domain of [...tester, ...more, ...variants]) {
      expect(FREE_EMAIL_DOMAINS.has(domain), domain).toBe(true)
      expect(isBusinessEmail(`Novak@${domain.toUpperCase()}`), domain).toBe(false)
    }
    // A company domain that only contains a public domain name stays a company email.
    expect(isBusinessEmail('novak@gmail.com.firma.cz')).toBe(true)
    expect(isBusinessEmail('novak@mail.ru-firma.cz')).toBe(true)
  })

  it('B1: only the base64url alphabet is a click ID', () => {
    expect(clickIdFromSearch('?gclid=Cj0KCQiA-abc_DEF123', NOW)?.id).toBe('Cj0KCQiA-abc_DEF123')
    for (const bad of ['%00abc', 'a%01b', 'a%7Fb', '%3D1', 'a.b', 'a%27b', 'a%C3%A1b']) {
      expect(clickIdFromSearch(`?gclid=${bad}`, NOW), bad).toBeNull()
    }
  })

  it('B2: the formula guard prefixes only cells that start a formula', () => {
    const row = toExportRow(
      {
        id: 7,
        email: 'novak@firma.cz',
        createdAt: NOW.toISOString(),
        attribution: { consentMarketing: true, gclid: 'Cj0KCQiA-abc_DEF123' },
      },
      'Firemni poptavka (import)',
    )
    expect(toCsv([row]).split('\n')[1]).toBe(
      `lead-7,Firemni poptavka (import),2026-11-12T09:14:03Z,Cj0KCQiA-abc_DEF123,,,${NOVAK_HASH},Granted`,
    )
    const formula = toCsv([{ ...row, GBRAID: '-1+1', WBRAID: '=1,2' }]).split('\n')[1]
    expect(formula).toContain(`,'-1+1,"'=1,2",`)
  })
})

describe('createLeadWithAttribution (criterion 11, B1)', () => {
  const MARK = `int26-store-${Date.now()}`
  let payload: Payload
  const created: number[] = []
  const data = {
    name: 'Jan Novák',
    email: `novak.${MARK}@firma.cz`,
    message: MARK,
    locale: 'cs' as const,
  }

  beforeAll(async () => {
    payload = await getPayload({ config: await config })
  })

  afterAll(async () => {
    if (!payload || created.length === 0) return
    await payload.delete({
      collection: 'leads',
      where: { id: { in: created } },
      overrideAccess: true,
      context: { skipRevalidate: true },
    })
  })

  it('stores the lead with the attribution when the database accepts it', async () => {
    const lead = await createLeadWithAttribution(payload, data, {
      consentAnalytics: true,
      consentMarketing: true,
      gclid: `${MARK}-gclid`,
    })
    created.push(lead.id)
    expect(lead.attribution?.gclid).toBe(`${MARK}-gclid`)
    expect(lead.attribution?.consentMarketing).toBe(true)
  })

  it('stores the lead without the attribution when the database rejects the attribution', async () => {
    // A value that passes no parser but that Postgres rejects: the last guard must still hold.
    const lead = await createLeadWithAttribution(payload, data, {
      consentAnalytics: true,
      consentMarketing: true,
      gclid: 'a\u0000b',
      clickedAt: 'Wed Nov 11 2026 23:41:27 GMT+0100 (Central European Standard Time)',
    })
    created.push(lead.id)
    const stored = await payload.findByID({
      collection: 'leads',
      id: lead.id,
      overrideAccess: true,
    })
    expect(stored.message).toBe(MARK)
    expect(stored.attribution?.gclid ?? null).toBeNull()
    expect(stored.attribution?.consentMarketing ?? false).toBe(false)
    expect(isGoogleAdsLead(stored)).toBe(false)
  })
})
