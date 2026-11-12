import { GRAPHQL_POST, REST_GET, REST_POST } from '@payloadcms/next/routes'
import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { GET } from '@/app/api/google-ads/company-leads.csv/route'
import { checkExportLogin, hashExportPassword, verifyExportPassword } from '@/lib/exportCredentials'
import config from '@/payload.config'
import type { User } from '@/payload-types'

import { setExportLogin } from '../helpers/exportLogin'

/**
 * Issue #28: the login of the Google Ads export lives in the global
 * `google-ads-export`. The database keeps only a scrypt hash. Without a login the
 * global is closed, and the API never returns the password or the hash.
 */

const SLUG = 'google-ads-export'
const USER = 'google-ads-int28'
const PASSWORD = 'int28-password-0123456789abcdefXYZ'
const basic = (value: string) => `Basic ${Buffer.from(value).toString('base64')}`
const csvUrl = 'http://localhost/api/google-ads/company-leads.csv'

describe('exportCredentials helpers', () => {
  it('hashes with a salt and verifies only the right password', () => {
    const first = hashExportPassword(PASSWORD)
    const second = hashExportPassword(PASSWORD)
    expect(first).toMatch(/^scrypt\$32768\$8\$1\$[^$]+\$[^$]+$/)
    expect(first).not.toBe(second)
    expect(first).not.toContain(PASSWORD)
    expect(verifyExportPassword(PASSWORD, first)).toBe(true)
    expect(verifyExportPassword(`${PASSWORD}x`, first)).toBe(false)
    expect(verifyExportPassword(PASSWORD, 'scrypt$1$1$1$$')).toBe(false)
    expect(verifyExportPassword(PASSWORD, null)).toBe(false)
  })

  it('checks the Basic header against the stored login', () => {
    const hash = hashExportPassword('s3cret:x-0123456789abcdefghij')
    expect(
      checkExportLogin(basic('google-ads:s3cret:x-0123456789abcdefghij'), 'google-ads', hash),
    ).toBe(true)
    expect(checkExportLogin(basic('google-ads:wrong'), 'google-ads', hash)).toBe(false)
    expect(checkExportLogin(basic('other:s3cret:x-0123456789abcdefghij'), 'google-ads', hash)).toBe(
      false,
    )
    expect(checkExportLogin(basic('no-separator'), 'google-ads', hash)).toBe(false)
    expect(checkExportLogin('Bearer abc', 'google-ads', hash)).toBe(false)
    expect(checkExportLogin(null, 'google-ads', hash)).toBe(false)
    expect(checkExportLogin(basic(':'), '', '')).toBe(false)
    expect(checkExportLogin(basic('google-ads:'), 'google-ads', null)).toBe(false)
  })
})

describe('global google-ads-export', () => {
  let payload: Payload
  let editor: User
  let restoreLogin: (() => Promise<void>) | undefined
  const MARK = `int28-${Date.now()}`

  const rest = (path: string, init: RequestInit = {}) => {
    const request = new Request(`http://localhost/api/${path}`, init)
    const slug = path.split('?')[0].split('/')
    const handler = init.method === 'POST' ? REST_POST(config) : REST_GET(config)
    return handler(request, { params: Promise.resolve({ slug }) })
  }

  const graphql = (query: string) =>
    GRAPHQL_POST(config)(
      new Request('http://localhost/api/graphql', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ query }),
      }),
    )

  const storedRow = async () => {
    const rows = await payload.db.drizzle.execute(
      'select username, password_hash from google_ads_export limit 1',
    )
    return (rows as unknown as { rows: { username: string; password_hash: string }[] }).rows[0]
  }

  beforeAll(async () => {
    payload = await getPayload({ config: await config })
    restoreLogin = await setExportLogin(payload, USER, PASSWORD)
    editor = await payload.create({
      collection: 'users',
      data: {
        name: 'Int28 Editor',
        email: `${MARK}@editor.test`,
        password: 'editor-password-123',
        role: 'editor',
      },
      overrideAccess: true,
    })
  })

  afterAll(async () => {
    await restoreLogin?.()
    if (editor) await payload.delete({ collection: 'users', id: editor.id, overrideAccess: true })
  })

  it('stores only a hash in the database', async () => {
    const row = await storedRow()
    expect(row.username).toBe(USER)
    expect(row.password_hash).toMatch(/^scrypt\$/)
    expect(row.password_hash).not.toContain(PASSWORD)
  })

  it('REST without login returns no data', async () => {
    const response = await rest(`globals/${SLUG}`)
    const body = await response.text()
    expect(response.status).toBe(403)
    expect(body).not.toContain(USER)
    expect(body).not.toContain('scrypt')
  })

  it('REST update without login is refused', async () => {
    const response = await rest(`globals/${SLUG}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username: 'attacker', password: 'attacker-password-0123456789' }),
    })
    expect(response.status).toBe(403)
    expect((await storedRow()).username).toBe(USER)
  })

  it('GraphQL without login returns no data', async () => {
    const response = await graphql('{ GoogleAdsExport { username password } }')
    const body = await response.text()
    expect(body).not.toContain(USER)
    expect(JSON.parse(body).errors?.length).toBeGreaterThan(0)
  })

  it('a logged-in user reads the username, an empty password and no hash', async () => {
    const doc = await payload.findGlobal({ slug: SLUG, overrideAccess: false, user: editor })
    expect(doc.username).toBe(USER)
    expect(doc.password).toBe('')
    expect(doc).not.toHaveProperty('passwordHash')
    expect(JSON.stringify(doc)).not.toContain('scrypt')
  })

  it('anonymous Local API read is refused', async () => {
    await expect(payload.findGlobal({ slug: SLUG, overrideAccess: false })).rejects.toThrow()
  })

  it('an empty password keeps the hash, a sent hash is ignored', async () => {
    const before = (await storedRow()).password_hash
    const result = await payload.updateGlobal({
      slug: SLUG,
      data: { username: USER, password: '', passwordHash: 'scrypt$1$1$1$AAAA$AAAA' } as never,
      overrideAccess: false,
      user: editor,
    })
    expect(JSON.stringify(result)).not.toContain('scrypt')
    expect((await storedRow()).password_hash).toBe(before)
  })

  it('refuses a password shorter than 24 characters', async () => {
    await expect(
      payload.updateGlobal({
        slug: SLUG,
        data: { password: 'short-password-23-chars' },
        overrideAccess: true,
      }),
    ).rejects.toThrow()
    expect(verifyExportPassword(PASSWORD, (await storedRow()).password_hash)).toBe(true)
  })

  it('route: 401 without login, 401 with a wrong password, 200 with the right one', async () => {
    const none = await GET(new Request(csvUrl))
    expect(none.status).toBe(401)
    expect(none.headers.get('www-authenticate')).toMatch(/^Basic realm="google-ads-export"/)
    const wrong = await GET(
      new Request(csvUrl, { headers: { authorization: basic(`${USER}:wrong-password`) } }),
    )
    expect(wrong.status).toBe(401)
    const wrongUser = await GET(
      new Request(csvUrl, { headers: { authorization: basic(`other:${PASSWORD}`) } }),
    )
    expect(wrongUser.status).toBe(401)
    const right = await GET(
      new Request(csvUrl, { headers: { authorization: basic(`${USER}:${PASSWORD}`) } }),
    )
    expect(right.status).toBe(200)
    expect(right.headers.get('content-type')).toBe('text/csv; charset=utf-8')
  })

  it('route: 401 when the global is empty', async () => {
    await payload.db.updateGlobal({ slug: SLUG, data: { username: null, passwordHash: null } })
    try {
      const response = await GET(
        new Request(csvUrl, { headers: { authorization: basic(`${USER}:${PASSWORD}`) } }),
      )
      expect(response.status).toBe(401)
      expect(
        (await GET(new Request(csvUrl, { headers: { authorization: basic(':') } }))).status,
      ).toBe(401)
    } finally {
      await setExportLogin(payload, USER, PASSWORD)
    }
  })
})
