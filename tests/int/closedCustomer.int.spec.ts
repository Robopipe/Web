import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { GET } from '@/app/api/google-ads/company-leads.csv/route'
import {
  closedAtOnChange,
  conversionActions,
  EXPORT_COLUMNS,
  toClosedExportRow,
  toCsv,
  toExportRows,
  type ExportLead,
} from '@/lib/googleAds'
import config from '@/payload.config'
import type { Lead } from '@/payload-types'

import { setExportLogin } from '../helpers/exportLogin'

const LEAD_ACTION = { name: 'Firemni poptavka (import)', value: 5000, currency: 'CZK' }
const CLOSED_ACTION = { name: 'Uzavreny zakaznik', value: 25000, currency: 'CZK' }
const ACTIONS = { lead: LEAD_ACTION, closed: CLOSED_ACTION }
const DEFAULT_MEASUREMENT = {
  leadConversionName: 'Firemni poptavka (import)',
  leadConversionValue: 5000,
  closedCustomerConversionName: 'Uzavreny zakaznik',
  closedCustomerConversionValue: 25000,
  conversionCurrency: 'CZK',
}

const column = (name: (typeof EXPORT_COLUMNS)[number]) => EXPORT_COLUMNS.indexOf(name)

const baseLead: ExportLead & Pick<Lead, 'name'> = {
  id: 7,
  name: 'Jan Novák',
  email: 'novak@firma.cz',
  createdAt: '2026-11-12T09:14:03.000Z',
  attribution: { consentAnalytics: true, consentMarketing: true, gclid: 'Cj0KCQiA-abc' },
}

describe('issue #43: closedAt hook', () => {
  const now = new Date('2026-11-13T08:00:00.000Z')

  it('the first tick sets the time', () => {
    expect(closedAtOnChange(undefined, { closedCustomer: true }, now)).toBe(now.toISOString())
    expect(closedAtOnChange(null, { closedCustomer: true }, now)).toBe(now.toISOString())
  })

  it('a later save, an untick or a second tick keeps the first time', () => {
    const first = '2026-11-01T10:00:00.000Z'
    expect(closedAtOnChange(first, { closedCustomer: true }, now)).toBe(first)
    expect(closedAtOnChange(first, { closedCustomer: false }, now)).toBe(first)
  })

  it('no tick gives no time', () => {
    expect(closedAtOnChange(undefined, { closedCustomer: false }, now)).toBeUndefined()
    expect(closedAtOnChange(null, {}, now)).toBeNull()
  })
})

describe('issue #43: conversion actions from site-settings', () => {
  it('reads both names and values with one currency', () => {
    expect(conversionActions(DEFAULT_MEASUREMENT)).toEqual(ACTIONS)
    expect(
      conversionActions({ ...DEFAULT_MEASUREMENT, conversionCurrency: ' eur ' })?.closed,
    ).toEqual({ ...CLOSED_ACTION, currency: 'EUR' })
  })

  it('a missing name, value or currency gives null (the route answers 500)', () => {
    expect(conversionActions(undefined)).toBeNull()
    for (const broken of [
      { leadConversionName: ' ' },
      { closedCustomerConversionName: '' },
      { leadConversionValue: null },
      { closedCustomerConversionValue: -1 },
      { closedCustomerConversionValue: Number.NaN },
      { conversionCurrency: '' },
      { conversionCurrency: 'Kč' },
    ]) {
      expect(
        conversionActions({ ...DEFAULT_MEASUREMENT, ...broken }),
        JSON.stringify(broken),
      ).toBeNull()
    }
  })
})

describe('issue #43: export rows', () => {
  const closedAt = '2026-11-20T15:30:45.123Z'
  const closedLead = { ...baseLead, closedCustomer: true, closedAt }

  it('a lead with a gclid and no tick gives one row with the lead value', () => {
    const rows = toExportRows([baseLead], ACTIONS)
    expect(rows).toHaveLength(1)
    expect(rows[0]['Conversion Name']).toBe('Firemni poptavka (import)')
    expect(rows[0]['Conversion Value']).toBe('5000')
    expect(rows[0]['Conversion Currency']).toBe('CZK')
    expect(rows[0]['Conversion Time']).toBe('2026-11-12T09:14:03Z')
  })

  it('a ticked lead with a gclid gives two rows, the second at the close time, sum 30 000', () => {
    const rows = toExportRows([closedLead], ACTIONS)
    expect(rows.map((row) => row['Order ID'])).toEqual(['lead-7', 'lead-7-closed'])
    expect(rows[1]).toMatchObject({
      'Conversion Name': 'Uzavreny zakaznik',
      'Conversion Time': '2026-11-20T15:30:45Z',
      'Google Click ID': 'Cj0KCQiA-abc',
      'Conversion Value': '25000',
      'Conversion Currency': 'CZK',
    })
    // The lead row keeps its value and time: no restatement of the first conversion.
    expect(rows[0]['Conversion Value']).toBe('5000')
    expect(rows[0]['Conversion Time']).toBe('2026-11-12T09:14:03Z')
    expect(rows.reduce((sum, row) => sum + Number(row['Conversion Value']), 0)).toBe(30000)
  })

  it('no closed row without a tick, without a close time or without a gclid', () => {
    expect(toClosedExportRow({ ...closedLead, closedCustomer: false }, CLOSED_ACTION)).toBeNull()
    expect(toClosedExportRow({ ...closedLead, closedAt: null }, CLOSED_ACTION)).toBeNull()
    const braidOnly = { consentAnalytics: true, consentMarketing: true, gbraid: '0AAAA-x' }
    expect(toClosedExportRow({ ...closedLead, attribution: braidOnly }, CLOSED_ACTION)).toBeNull()
    expect(toExportRows([{ ...closedLead, attribution: braidOnly }], ACTIONS)).toHaveLength(1)
  })

  it('a ticked lead that fails the #26 rule gives no row at all', () => {
    const noConsent = {
      ...closedLead,
      attribution: { ...closedLead.attribution, consentMarketing: false },
    }
    expect(toExportRows([noConsent], ACTIONS)).toEqual([])
    expect(toExportRows([{ ...closedLead, email: 'novak@gmail.com' }], ACTIONS)).toEqual([])
  })

  it('the CSV has the value and currency columns at the end', () => {
    const lines = toCsv(toExportRows([closedLead], ACTIONS)).split('\n')
    expect(lines[0].endsWith(',Ad User Data,Conversion Value,Conversion Currency')).toBe(true)
    expect(lines[2].startsWith('lead-7-closed,Uzavreny zakaznik,2026-11-20T15:30:45Z,')).toBe(true)
    expect(lines[2].endsWith(',Granted,25000,CZK')).toBe(true)
  })
})

describe('issue #43: export route with the Local API', () => {
  const USER = 'google-ads-int43'
  const PASSWORD = 'int43-test-password-0123456789abcdef'
  const MARK = `int43-${Date.now()}`
  const auth = { authorization: `Basic ${Buffer.from(`${USER}:${PASSWORD}`).toString('base64')}` }
  const url = 'http://localhost/api/google-ads/company-leads.csv'

  let payload: Payload
  let restoreLogin: (() => Promise<void>) | undefined
  const created: number[] = []

  const createLead = async (local: string, gclid?: string): Promise<Lead> => {
    const lead = await payload.create({
      collection: 'leads',
      data: {
        name: 'Jan Novák',
        email: `${local}.${MARK}@firma.cz`,
        message: MARK,
        locale: 'cs',
        attribution: {
          consentAnalytics: true,
          consentMarketing: true,
          ...(gclid ? { gclid } : {}),
        },
      },
      overrideAccess: true,
      context: { skipRevalidate: true },
    })
    created.push(lead.id)
    return lead
  }

  const setClosed = (id: number, closedCustomer: boolean) =>
    payload.update({
      collection: 'leads',
      id,
      data: { closedCustomer },
      overrideAccess: true,
      context: { skipRevalidate: true },
    })

  const rowsOf = async (id: number) => {
    const response = await GET(new Request(url, { headers: auth }))
    expect(response.status).toBe(200)
    const body = await response.text()
    return body
      .split('\n')
      .filter((line) => line.startsWith(`lead-${id},`) || line.startsWith(`lead-${id}-closed,`))
      .map((line) => line.split(','))
  }

  beforeAll(async () => {
    payload = await getPayload({ config: await config })
    restoreLogin = await setExportLogin(payload, USER, PASSWORD)
  })

  afterAll(async () => {
    await restoreLogin?.()
    if (!payload || created.length === 0) return
    await payload.delete({
      collection: 'leads',
      where: { id: { in: created } },
      overrideAccess: true,
      context: { skipRevalidate: true },
    })
  })

  it('site-settings has the default values after the migration', async () => {
    const settings = await payload.findGlobal({ slug: 'site-settings', depth: 0 })
    expect(settings.measurement).toMatchObject({
      leadConversionValue: 5000,
      closedCustomerConversionName: 'Uzavreny zakaznik',
      closedCustomerConversionValue: 25000,
      conversionCurrency: 'CZK',
    })
  })

  it('a new lead is not closed and has no close time', async () => {
    const lead = await createLead('novy', `${MARK}-new`)
    expect(lead.closedCustomer).toBe(false)
    expect(lead.closedAt ?? null).toBeNull()
  })

  it('gclid without tick: 1 row. With tick: 2 rows. Untick and tick keep the close time', async () => {
    const lead = await createLead('zakaznik', `${MARK}-gclid`)
    const before = await rowsOf(lead.id)
    expect(before).toHaveLength(1)
    expect(before[0][column('Conversion Value')]).toBe('5000')

    const start = Date.now()
    const closed = await setClosed(lead.id, true)
    expect(closed.closedAt).toBeTruthy()
    const closedAt = new Date(closed.closedAt as string).getTime()
    expect(closedAt).toBeGreaterThanOrEqual(start - 1000)
    expect(closedAt).toBeLessThanOrEqual(Date.now() + 1000)

    const rows = await rowsOf(lead.id)
    expect(rows.map((row) => row[column('Conversion Name')])).toEqual([
      'Firemni poptavka (import)',
      'Uzavreny zakaznik',
    ])
    expect(rows.map((row) => row[column('Conversion Value')])).toEqual(['5000', '25000'])
    expect(rows[0][column('Conversion Time')]).toBe(
      new Date(lead.createdAt).toISOString().replace(/\.\d{3}Z$/, 'Z'),
    )
    expect(rows[1][column('Conversion Time')]).toBe(
      new Date(closed.closedAt as string).toISOString().replace(/\.\d{3}Z$/, 'Z'),
    )

    await setClosed(lead.id, false)
    expect(await rowsOf(lead.id)).toHaveLength(1)
    const again = await setClosed(lead.id, true)
    expect(again.closedAt).toBe(closed.closedAt)
  })

  it('a ticked lead without a gclid gets no closed-customer row', async () => {
    const lead = await createLead('bezgclid')
    await setClosed(lead.id, true)
    const rows = await rowsOf(lead.id)
    expect(rows.map((row) => row[0])).toEqual([`lead-${lead.id}`])
  })

  it('the export still needs the login', async () => {
    expect((await GET(new Request(url))).status).toBe(401)
  })
})
