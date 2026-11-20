import { REST_GET } from '@payloadcms/next/routes'
import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { GET as preview } from '@/app/next/preview/route'
import config from '@/payload.config'
import type { User } from '@/payload-types'

/** Issue #67: findings 2 and 3 of the ponytail audit. */
const PRIVATE_FIELDS = [
  'leadNotificationEmail',
  'leadConversionValue',
  'closedCustomerConversionValue',
]

describe('site-settings private fields', () => {
  let payload: Payload
  let editor: User | undefined

  beforeAll(async () => {
    payload = await getPayload({ config: await config })
    editor = await payload.create({
      collection: 'users',
      data: {
        name: 'Int67 Editor',
        email: `int67-${Date.now()}@editor.test`,
        password: 'editor-password-123',
        role: 'editor',
      },
      overrideAccess: true,
    })
  })

  afterAll(async () => {
    if (editor) await payload.delete({ collection: 'users', id: editor.id, overrideAccess: true })
  })

  const pick = (doc: Record<string, unknown>) => ({
    leadNotificationEmail: doc.leadNotificationEmail,
    leadConversionValue: (doc.measurement as Record<string, unknown> | undefined)
      ?.leadConversionValue,
    closedCustomerConversionValue: (doc.measurement as Record<string, unknown> | undefined)
      ?.closedCustomerConversionValue,
  })

  it('anonymous REST read leaves the fields out', async () => {
    const response = await REST_GET(config)(
      new Request('http://localhost/api/globals/site-settings'),
      { params: Promise.resolve({ slug: ['globals', 'site-settings'] }) },
    )
    expect(response.status).toBe(200)
    const body = await response.text()
    for (const field of PRIVATE_FIELDS) expect(body).not.toContain(`"${field}"`)
    // The public fields stay readable.
    expect(JSON.parse(body).siteName).toBeTruthy()
  })

  it('a logged-in user and the server code (Local API) read the fields', async () => {
    const asEditor = await payload.findGlobal({
      slug: 'site-settings',
      overrideAccess: false,
      user: editor,
    })
    const asServer = await payload.findGlobal({ slug: 'site-settings', depth: 0 })
    for (const doc of [asEditor, asServer]) {
      const values = pick(doc as unknown as Record<string, unknown>)
      expect(typeof values.leadConversionValue).toBe('number')
      expect(typeof values.closedCustomerConversionValue).toBe('number')
      expect(Object.keys(doc)).toContain('leadNotificationEmail')
    }
  })
})

describe('/next/preview', () => {
  const url = (query: string) => new Request(`http://localhost/next/preview?${query}`)

  it('refuses a locale outside the routing locales', async () => {
    process.env.PREVIEW_SECRET ||= 'int67-preview-secret'
    const secret = process.env.PREVIEW_SECRET
    for (const locale of ['/evil.example', '//evil.example', 'de']) {
      const response = await preview(
        url(`secret=${secret}&collection=pages&slug=home&locale=${encodeURIComponent(locale)}`),
      )
      expect(response.status).toBe(400)
    }
  })

  it('still needs the secret', async () => {
    const response = await preview(url('secret=wrong&collection=pages&locale=cs'))
    expect(response.status).toBe(401)
  })
})
