import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { GET } from '@/app/api/google-ads/company-leads.csv/route'
import { CLICK_COOKIE, clickIdFromSearch, parseClickId, serializeClickId } from '@/lib/clickId'
import { CONSENT_COOKIE, createConsent, serializeConsent } from '@/lib/consent'
import {
  EXPORT_COLUMNS,
  attributionFromCookies,
  isGoogleAdsLead,
  toCsv,
  toExportRow,
} from '@/lib/googleAds'
import { createLeadWithAttribution } from '@/lib/leadStore'
import config from '@/payload.config'

import { setExportLogin } from '../helpers/exportLogin'

/**
 * Tester round 2 for issue #26 (test-report.md, chapter "Kolo 2"). Tries to get around the
 * fixes for B1 to B3 and checks the fallback save in `createLeadWithAttribution`.
 */

const NOW = new Date()
const HOUR_MS = 60 * 60 * 1000
const FORMULA_START = ['=', '+', '-', '@', '\t', '\r']

/** Click IDs that Postgres, a spreadsheet or Google must never get. */
const BAD_IDS: Record<string, string> = {
  nul: '\u0000abc',
  control: 'a\u0001b',
  delete: 'a\u007fb',
  escape: 'a\u001b[0m',
  'non-ASCII': 'Cj0Káb',
  'fullwidth equals': '\uff1d1+1',
  'zero width space': 'Cj0K\u200bX',
  'right-to-left override': 'Cj0K\u202eX',
  space: 'a b',
  quote: "a'b",
  formula: '=1+1',
  'too long (513)': 'A'.repeat(513),
  empty: '',
}

const cookies = (values: Record<string, string>) => (name: string) => values[name]

const marketingCookies = (click: Record<string, unknown>) =>
  cookies({
    [CONSENT_COOKIE]: serializeConsent(createConsent(true, true, NOW)),
    [CLICK_COOKIE]: JSON.stringify(click),
  })

describe('tester round 2: click ID input (B1)', () => {
  it('the landing URL never turns a bad value into a click ID', () => {
    for (const [label, id] of Object.entries(BAD_IDS)) {
      expect(clickIdFromSearch(`?gclid=${encodeURIComponent(id)}`, NOW), label).toBeNull()
      expect(clickIdFromSearch(`?wbraid=${encodeURIComponent(id)}`, NOW), label).toBeNull()
    }
    // `+` in a query is a space after decoding.
    expect(clickIdFromSearch('?gclid=Cj0K+X', NOW)).toBeNull()
    expect(clickIdFromSearch(`?gclid=${'A'.repeat(512)}`, NOW)?.id).toHaveLength(512)
  })

  it('a hand-made rp_click cookie never brings a bad value back', () => {
    for (const [label, id] of Object.entries(BAD_IDS)) {
      const raw = JSON.stringify({ v: 1, type: 'gclid', id, at: NOW.toISOString() })
      expect(parseClickId(raw, NOW), label).toBeNull()
    }
    for (const type of ['GCLID', 'gclid ', 'dclid', '__proto__']) {
      expect(
        parseClickId(JSON.stringify({ v: 1, type, id: 'Cj0K', at: NOW.toISOString() }), NOW),
        type,
      ).toBeNull()
    }
  })

  it('a bad click ID drops only the ID: consent stays and the lead still counts (scenario 4)', () => {
    const attribution = attributionFromCookies(
      marketingCookies({ v: 1, type: 'gclid', id: '\u0000abc', at: NOW.toISOString() }),
      NOW,
    )
    expect(attribution).toEqual({ consentAnalytics: true, consentMarketing: true })
  })
})

describe('tester round 2: export cells (B2)', () => {
  const row = toExportRow(
    {
      id: 9,
      email: 'novak@firma.cz',
      createdAt: NOW.toISOString(),
      attribution: {
        consentMarketing: true,
        gclid: 'Cj0KCQiA-abc_DEF123_BwE',
        gbraid: '0AAAAAo-abc_DEF',
        wbraid: 'ClkKCQiA_x-1',
      },
    },
    { name: 'Firemni poptavka (import)', value: 5000, currency: 'CZK' },
  )

  it('real click IDs leave the export unchanged', () => {
    const line = toCsv([row]).split('\n')[1]
    expect(line).toContain(',Cj0KCQiA-abc_DEF123_BwE,0AAAAAo-abc_DEF,ClkKCQiA_x-1,')
    expect(line).not.toContain("'")
  })

  it('no cell starts a formula, also in the conversion name and with quoting', () => {
    for (const start of FORMULA_START) {
      const csv = toCsv([{ ...row, 'Conversion Name': `${start}HYPERLINK("x","y"),1` }])
      const cell = csv.split('\n').slice(1).join('\n').split(',')[1]
      expect(cell.replace(/^"/, '')[0], JSON.stringify(start)).toBe("'")
    }
  })
})

describe('tester round 2: landing time (B3)', () => {
  let payload: Payload
  const created: number[] = []
  const MARK = `int26-r2-at-${Date.now()}`
  const landed = new Date(NOW.getTime() - 3 * HOUR_MS)

  beforeAll(async () => {
    payload = await getPayload({ config: await config })
  })

  afterAll(async () => {
    if (created.length === 0) return
    await payload.delete({
      collection: 'leads',
      where: { id: { in: created } },
      overrideAccess: true,
      context: { skipRevalidate: true },
    })
  })

  const formats: Record<string, string> = {
    'Date.toString': landed.toString(),
    'Date.toUTCString': landed.toUTCString(),
    'date only': landed.toISOString().slice(0, 10),
    'space instead of T': landed.toISOString().replace('T', ' ').replace('Z', ''),
    'offset +14:00': new Date(landed.getTime() + 14 * HOUR_MS).toISOString().replace('Z', '+14:00'),
    'English month': landed.toUTCString().slice(5, 16),
  }

  it.each(Object.entries(formats))(
    'a lead with `at` as %s is stored with an ISO time',
    async (_label, at) => {
      const attribution = attributionFromCookies(
        marketingCookies({ v: 1, type: 'gclid', id: 'Cj0K_r2', at }),
        NOW,
      )
      const lead = await createLeadWithAttribution(
        payload,
        { name: 'Jan Novák', email: `novak.${MARK}@firma.cz`, message: MARK, locale: 'cs' },
        attribution,
      )
      created.push(lead.id)
      expect(lead.attribution?.consentMarketing).toBe(true)
      expect(attribution.clickedAt).toMatch(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/)
      expect(lead.attribution?.gclid).toBe('Cj0K_r2')
      expect(new Date(lead.attribution!.clickedAt!).toISOString()).toBe(attribution.clickedAt)
    },
  )

  it('serializeClickId and parseClickId agree after the ISO change', () => {
    const click = { v: 1 as const, type: 'gbraid' as const, id: 'G_1', at: landed.toISOString() }
    expect(parseClickId(serializeClickId(click), NOW)).toEqual(click)
  })
})

describe('tester round 2: fallback save (criterion 11)', () => {
  const USER = 'google-ads-int-r2'
  const PASSWORD = 'int-test-password-r2-0123456789abcdef'
  const MARK = `int26-r2-store-${Date.now()}`
  const auth = { authorization: `Basic ${Buffer.from(`${USER}:${PASSWORD}`).toString('base64')}` }
  let restoreLogin: (() => Promise<void>) | undefined
  let payload: Payload
  const created: number[] = []

  const countMarked = async () =>
    (
      await payload.count({
        collection: 'leads',
        where: { message: { contains: MARK } },
        overrideAccess: true,
      })
    ).totalDocs

  beforeAll(async () => {
    payload = await getPayload({ config: await config })
    restoreLogin = await setExportLogin(payload, USER, PASSWORD)
  })

  afterAll(async () => {
    await restoreLogin?.()
    await payload.delete({
      collection: 'leads',
      where: { message: { contains: MARK } },
      overrideAccess: true,
      context: { skipRevalidate: true },
    })
  })

  it('a lead saved without attribution gets no hash and is not in the export', async () => {
    const before = await countMarked()
    const stored = await createLeadWithAttribution(
      payload,
      {
        name: 'Jan Novák',
        email: `fallback.${MARK}@firma.cz`,
        message: `${MARK} fallback`,
        locale: 'cs',
      },
      { consentAnalytics: true, consentMarketing: true, gbraid: 'x\u0000y' },
    )
    created.push(stored.id)
    // Exactly one row: the failed first insert left nothing behind.
    expect(await countMarked()).toBe(before + 1)
    // submitLead decides the hash with the returned lead.
    expect(stored.attribution?.consentMarketing ?? false).toBe(false)
    expect(isGoogleAdsLead(stored)).toBe(false)
    const read = await payload.findByID({
      collection: 'leads',
      id: stored.id,
      overrideAccess: true,
    })
    expect(read.googleAdsExport ?? false).toBe(false)
    expect(read.attribution?.gbraid ?? null).toBeNull()

    const response = await GET(
      new Request('http://localhost/api/google-ads/company-leads.csv', { headers: auth }),
    )
    expect(response.status).toBe(200)
    const body = await response.text()
    expect(body.split('\n')[0]).toBe(EXPORT_COLUMNS.join(','))
    expect(body).not.toContain(`lead-${stored.id},`)
  })

  it('an error outside the attribution still fails once, with no lead and no copy', async () => {
    const before = await countMarked()
    await expect(
      createLeadWithAttribution(
        payload,
        {
          name: 'Jan Novák',
          email: `nul.${MARK}@firma.cz`,
          message: `${MARK} a\u0000b`,
          locale: 'cs',
        },
        { consentAnalytics: true, consentMarketing: true, gclid: 'Cj0K_ok' },
      ),
    ).rejects.toThrow()
    expect(await countMarked()).toBe(before)
  })
})
