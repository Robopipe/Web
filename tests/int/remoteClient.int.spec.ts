import type { SanitizedConfig } from 'payload'
import { describe, expect, it } from 'vitest'

import {
  createRemoteClient,
  nullIfNotFound,
  RemoteError,
  RemoteNetworkError,
  toQueryString,
} from '@/seed/remoteClient'

/**
 * REST client of `pnpm seed:seo-geo --remote` (issue #6, step 12). Uses a fake
 * fetch. The run against a real server is described in implementation.md.
 */

type Call = { method: string; url: string; headers: Record<string, string>; body?: unknown }

const fakeFetch = (respond: (call: Call) => [number, unknown]) => {
  const calls: Call[] = []
  const impl = (async (url: string, init: RequestInit = {}) => {
    const call: Call = {
      method: init.method ?? 'GET',
      url,
      headers: (init.headers ?? {}) as Record<string, string>,
      body: init.body,
    }
    calls.push(call)
    const [status, json] = respond(call)
    return new Response(JSON.stringify(json), { status })
  }) as unknown as typeof fetch
  return { impl, calls }
}

const config = {} as SanitizedConfig
const loginOk = (call: Call): [number, unknown] | undefined =>
  call.url.endsWith('/api/users/login') ? [200, { token: 'T' }] : undefined

describe('toQueryString', () => {
  it('writes nested where clauses the way Payload REST reads them', () => {
    expect(
      toQueryString({
        locale: 'cs',
        draft: 'true',
        where: { slug: { equals: 'kontrola-etiket' } },
        empty: undefined,
      }),
    ).toBe('?locale=cs&draft=true&where%5Bslug%5D%5Bequals%5D=kontrola-etiket')
    expect(toQueryString({ where: { question: { equals: 'Co když? A&B' } } })).toContain(
      '=Co%20kdy%C5%BE%3F%20A%26B',
    )
    expect(toQueryString({})).toBe('')
  })
})

describe('createRemoteClient', () => {
  it('logs in once and sends the token with every request', async () => {
    const { impl, calls } = fakeFetch((call) => loginOk(call) ?? [200, { docs: [] }])
    const client = await createRemoteClient({
      baseUrl: 'http://localhost:9/',
      email: 'e@x.cz',
      password: 'secret',
      config,
      readOnly: false,
      fetchImpl: impl,
    })
    await client.find({
      collection: 'pages',
      where: { slug: { equals: 'cenik' } },
      locale: 'cs',
      draft: true,
      limit: 1,
      depth: 0,
      fallbackLocale: false,
    })
    expect(calls[0]).toMatchObject({ method: 'POST', url: 'http://localhost:9/api/users/login' })
    expect(calls[1].url).toBe(
      'http://localhost:9/api/pages?locale=cs&depth=0&draft=true&limit=1&where%5Bslug%5D%5Bequals%5D=cenik&fallback-locale=none',
    )
    expect(calls[1].headers.Authorization).toBe('JWT T')
    expect(JSON.stringify(calls.slice(1))).not.toContain('secret')
  })

  it('maps create, update and globals to the REST routes', async () => {
    const { impl, calls } = fakeFetch(
      (call) => loginOk(call) ?? [200, { doc: { id: 5 }, result: { ok: true } }],
    )
    const client = await createRemoteClient({
      baseUrl: 'http://h',
      email: 'e',
      password: 'p',
      config,
      readOnly: false,
      fetchImpl: impl,
    })
    expect(
      await client.create({ collection: 'faqs', locale: 'cs', data: { question: 'Q' } as never }),
    ).toEqual({
      id: 5,
    })
    await client.update({ collection: 'pages', id: 5, locale: 'en', draft: true, data: {} })
    expect(await client.updateGlobal({ slug: 'footer', locale: 'cs', data: {} })).toEqual({
      ok: true,
    })
    expect(calls.slice(1).map((c) => `${c.method} ${c.url}`)).toEqual([
      'POST http://h/api/faqs?locale=cs',
      'PATCH http://h/api/pages/5?locale=en&draft=true',
      'POST http://h/api/globals/footer?locale=cs',
    ])
  })

  it('in a dry run refuses every write before it is sent', async () => {
    const { impl, calls } = fakeFetch((call) => loginOk(call) ?? [200, {}])
    const client = await createRemoteClient({
      baseUrl: 'http://h',
      email: 'e',
      password: 'p',
      config,
      readOnly: true,
      fetchImpl: impl,
    })
    await expect(client.update({ collection: 'pages', id: 1, data: {} })).rejects.toThrow(
      'Dry run is read-only: PATCH /api/pages/1 was not sent.',
    )
    await expect(client.updateGlobal({ slug: 'footer', data: {} })).rejects.toThrow('read-only')
    expect(calls.map((c) => c.method)).toEqual(['POST']) // only the login
  })

  it('stops with method, path, status and the Payload error text', async () => {
    const { impl } = fakeFetch(
      (call) =>
        loginOk(call) ?? [
          400,
          {
            errors: [
              {
                message: 'The following field is invalid: title',
                data: { errors: [{ path: 'title', message: 'This field is required.' }] },
              },
            ],
          },
        ],
    )
    const client = await createRemoteClient({
      baseUrl: 'http://h',
      email: 'e',
      password: 'p',
      config,
      readOnly: false,
      fetchImpl: impl,
    })
    const error = await client
      .create({ collection: 'pages', locale: 'cs', data: {} as never })
      .catch((e: unknown) => e)
    expect(error).toBeInstanceOf(RemoteError)
    expect((error as Error).message).toBe(
      'POST /api/pages → 400: The following field is invalid: title, title: This field is required.',
    )
  })

  it('fails on a wrong password with a readable message', async () => {
    const { impl } = fakeFetch(() => [
      401,
      { errors: [{ message: 'The email or password provided is incorrect.' }] },
    ])
    await expect(
      createRemoteClient({
        baseUrl: 'http://h',
        email: 'e',
        password: 'p',
        config,
        readOnly: true,
        fetchImpl: impl,
      }),
    ).rejects.toThrow('POST /api/users/login → 401: The email or password provided is incorrect.')
  })

  it('nullIfNotFound turns only a 404 into null', () => {
    expect(nullIfNotFound(new RemoteError('GET', '/api/pages/1', 404, 'Not Found'))).toBeNull()
    expect(() => nullIfNotFound(new RemoteError('GET', '/api/pages/1', 403, 'Forbidden'))).toThrow(
      '403',
    )
  })

  it('names address, method, path and cause when the server does not answer', async () => {
    const refused = (async () => {
      throw Object.assign(new TypeError('fetch failed'), {
        cause: Object.assign(new Error('connect ECONNREFUSED 127.0.0.1:3341'), {
          code: 'ECONNREFUSED',
        }),
      })
    }) as unknown as typeof fetch
    const error = await createRemoteClient({
      baseUrl: 'http://localhost:3341',
      email: 'a@b.c',
      password: 'x',
      config,
      readOnly: true,
      fetchImpl: refused,
    }).catch((e: unknown) => e)
    expect(error).toBeInstanceOf(RemoteNetworkError)
    expect((error as Error).message).toBe(
      'POST http://localhost:3341/api/users/login failed: ECONNREFUSED (connect ECONNREFUSED 127.0.0.1:3341)',
    )
  })

  it('stops a request after the time limit', async () => {
    const hanging = ((_url: string, init: RequestInit = {}) =>
      new Promise((_resolve, reject) => {
        init.signal?.addEventListener('abort', () => reject(init.signal?.reason))
      })) as unknown as typeof fetch
    await expect(
      createRemoteClient({
        baseUrl: 'http://localhost:3341',
        email: 'a@b.c',
        password: 'x',
        config,
        readOnly: true,
        fetchImpl: hanging,
        timeoutMs: 50,
      }),
    ).rejects.toThrow(
      'POST http://localhost:3341/api/users/login failed: no response in 0.05 s (timeout)',
    )
  })

  it('refuses an address without http or https before any request', async () => {
    const { impl, calls } = fakeFetch(() => [200, {}])
    await expect(
      createRemoteClient({
        baseUrl: 'localhost:3341',
        email: 'a@b.c',
        password: 'x',
        config,
        readOnly: true,
        fetchImpl: impl,
      }),
    ).rejects.toThrow('--remote must be an http or https URL')
    expect(calls).toHaveLength(0)
  })
})
