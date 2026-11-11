import { inspect } from 'node:util'

import { getPayload, type Payload } from 'payload'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { createLeadWithAttribution } from '@/lib/leadStore'
import config from '@/payload.config'

// submitLead reads the request headers and cookies. Outside a Next request, give it plain ones.
vi.mock('next/headers', () => ({
  headers: async () => new Headers({ 'x-forwarded-for': '203.0.113.26' }),
  cookies: async () => ({ get: () => undefined }),
}))

const MARK = `c1-${Date.now()}`
const NAME = `Jan Novák ${MARK}`
const EMAIL = `jan.novak.${MARK}@firma.cz`
const PHONE = '+420 777 123 456'
const MESSAGE = `Tajná zpráva poptávky ${MARK}`
const PERSONAL = [NAME, EMAIL, PHONE, MESSAGE, 'jan.novak', 'Tajná zpráva']

const logged = (calls: unknown[][]) => calls.map((args) => inspect(args, { depth: 10 })).join('\n')

const expectNoPersonalData = (text: string) => {
  for (const value of PERSONAL) expect(text).not.toContain(value)
  expect(text).not.toContain('params')
}

// Tester finding C1: a failed save must not put the lead's personal data in the server log.
describe('issue #26 round 3: the log has no personal data of the lead', () => {
  let payload: Payload

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

  it('the fallback save logs only the error name and code', async () => {
    const warn = vi.spyOn(payload.logger, 'warn')
    const stored = await createLeadWithAttribution(
      payload,
      { name: NAME, email: EMAIL, phone: PHONE, message: MESSAGE, locale: 'cs' },
      // Postgres rejects the NUL byte, so the first insert fails with a real database error.
      { consentAnalytics: true, consentMarketing: true, gbraid: 'x\u0000y' },
    )
    expect(stored.id).toBeDefined()

    const fallback = warn.mock.calls.filter((args) =>
      inspect(args).includes('Lead with attribution failed'),
    )
    expect(fallback).toHaveLength(1)
    const fields = fallback[0][0] as Record<string, unknown>
    expect(Object.keys(fields).sort()).toEqual(['errorCode', 'errorName', 'msg'])
    expect(fields.errorCode).toBe('22021')
    expectNoPersonalData(logged(warn.mock.calls))
  })

  it('a lost lead in submitLead logs only the error name and code', async () => {
    const { submitLead } = await import('@/actions/submitLead')
    // The same shape as a Drizzle error: the query values sit in `params`, the code in `cause`.
    const dbError = Object.assign(
      new Error(`Failed query: insert into "leads" params: ${NAME},${EMAIL},${PHONE},${MESSAGE}`),
      {
        query: 'insert into "leads"',
        params: [NAME, EMAIL, PHONE, MESSAGE],
        cause: Object.assign(new Error('connection lost'), { code: '08006' }),
      },
    )
    vi.spyOn(payload, 'create').mockRejectedValue(dbError)
    const warn = vi.spyOn(payload.logger, 'warn')
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    const form = new FormData()
    form.set('name', NAME)
    form.set('email', EMAIL)
    form.set('phone', PHONE)
    form.set('message', MESSAGE)
    form.set('locale', 'cs')
    const state = await submitLead({ status: 'idle' }, form)

    expect(state).toEqual({ status: 'error', error: 'server' })
    expect(consoleError).toHaveBeenCalledWith('Lead submission failed', {
      errorName: 'Error',
      errorCode: '08006',
    })
    expectNoPersonalData(logged(consoleError.mock.calls))
    expectNoPersonalData(logged(warn.mock.calls))
  })
})
