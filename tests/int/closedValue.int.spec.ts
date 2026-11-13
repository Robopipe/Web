import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { GET } from '@/app/api/google-ads/company-leads.csv/route'
import { Leads } from '@/collections/Leads'
import { EXPORT_COLUMNS, toExportRows, type ExportLead } from '@/lib/googleAds'
import config from '@/payload.config'
import type { Lead } from '@/payload-types'

import { setExportLogin } from '../helpers/exportLogin'

const ACTIONS = {
  lead: { name: 'Firemni poptavka (import)', value: 5000, currency: 'CZK' },
  closed: { name: 'Uzavreny zakaznik', value: 25000, currency: 'CZK' },
}

const column = (name: (typeof EXPORT_COLUMNS)[number]) => EXPORT_COLUMNS.indexOf(name)

const closedLead: ExportLead & Pick<Lead, 'name'> = {
  id: 7,
  name: 'Jan Novák',
  email: 'novak@firma.cz',
  createdAt: '2026-11-12T09:14:03.000Z',
  attribution: { consentAnalytics: true, consentMarketing: true, gclid: 'Cj0KCQiA-abc' },
  closedCustomer: true,
  closedAt: '2026-11-20T15:30:45.123Z',
}

const valuesOf = (lead: ExportLead & Pick<Lead, 'name'>) =>
  toExportRows([lead], ACTIONS).map((row) => row['Conversion Value'])

describe('issue #46: closedValue field', () => {
  const fields = Leads.fields.flatMap((field) => ('name' in field ? [field] : []))
  const names = fields.map((field) => field.name)
  const field = fields.find((item) => item.name === 'closedValue')

  it('is a number field with min 0 in the sidebar, directly after closedAt', () => {
    expect(field).toMatchObject({
      type: 'number',
      label: 'Closed value',
      min: 0,
      admin: { position: 'sidebar' },
    })
    expect(names.indexOf('closedValue')).toBe(names.indexOf('closedAt') + 1)
  })

  it('shows only for a ticked lead', () => {
    const condition = (field as { admin?: { condition?: (...args: unknown[]) => boolean } }).admin
      ?.condition
    expect(condition).toBeTypeOf('function')
    expect(condition?.({}, { closedCustomer: true }, {})).toBe(true)
    expect(condition?.({}, { closedCustomer: false }, {})).toBe(false)
    expect(condition?.({}, {}, {})).toBe(false)
  })
})

describe('issue #46: closed-customer row value', () => {
  it('a set closedValue replaces the default, the lead row keeps 5000', () => {
    expect(valuesOf({ ...closedLead, closedValue: 90000 })).toEqual(['5000', '90000'])
  })

  it('0 is a valid value', () => {
    expect(valuesOf({ ...closedLead, closedValue: 0 })).toEqual(['5000', '0'])
  })

  it('an empty, negative or invalid closedValue gives the default 25000', () => {
    for (const closedValue of [null, undefined, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(valuesOf({ ...closedLead, closedValue })).toEqual(['5000', '25000'])
    }
  })

  it('closedValue without a tick gives no closed row', () => {
    expect(valuesOf({ ...closedLead, closedCustomer: false, closedValue: 90000 })).toEqual(['5000'])
  })
})

describe('issue #46: export route with the Local API', () => {
  const USER = 'google-ads-int46'
  const PASSWORD = 'int46-test-password-0123456789abcdef'
  const MARK = `int46-${Date.now()}`
  const auth = { authorization: `Basic ${Buffer.from(`${USER}:${PASSWORD}`).toString('base64')}` }
  const url = 'http://localhost/api/google-ads/company-leads.csv'

  let payload: Payload
  let restoreLogin: (() => Promise<void>) | undefined
  const created: number[] = []

  const update = (id: number, data: Partial<Lead>) =>
    payload.update({
      collection: 'leads',
      id,
      data,
      overrideAccess: true,
      context: { skipRevalidate: true },
    })

  const valuesInExport = async (id: number) => {
    const response = await GET(new Request(url, { headers: auth }))
    expect(response.status).toBe(200)
    return (await response.text())
      .split('\n')
      .filter((line) => line.startsWith(`lead-${id},`) || line.startsWith(`lead-${id}-closed,`))
      .map((line) => line.split(',')[column('Conversion Value')])
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

  it('90000 gives 90000, an emptied value gives the default 25000, a negative value fails', async () => {
    const lead = await payload.create({
      collection: 'leads',
      data: {
        name: 'Jan Novák',
        email: `zakaznik.${MARK}@firma.cz`,
        message: MARK,
        locale: 'cs',
        attribution: { consentAnalytics: true, consentMarketing: true, gclid: `${MARK}-gclid` },
      },
      overrideAccess: true,
      context: { skipRevalidate: true },
    })
    created.push(lead.id)
    expect(lead.closedValue ?? null).toBeNull()

    const closed = await update(lead.id, { closedCustomer: true, closedValue: 90000 })
    expect(closed.closedValue).toBe(90000)
    expect(await valuesInExport(lead.id)).toEqual(['5000', '90000'])

    await update(lead.id, { closedValue: null })
    expect(await valuesInExport(lead.id)).toEqual(['5000', '25000'])

    await expect(update(lead.id, { closedValue: -1 })).rejects.toThrow()
    expect(await valuesInExport(lead.id)).toEqual(['5000', '25000'])
  })
})
