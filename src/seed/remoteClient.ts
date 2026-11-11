import fs from 'node:fs'
import path from 'node:path'

import type { Payload, SanitizedConfig } from 'payload'

/**
 * The part of the Payload Local API that the SEO and GEO content script uses.
 * The local run passes Payload itself, the remote run a REST client.
 */
export type SeoGeoClient = Pick<
  Payload,
  'find' | 'findByID' | 'create' | 'update' | 'findGlobal' | 'updateGlobal'
> & { config: SanitizedConfig }

/** A failed REST call. Stops the run: method, path, status and the error text. */
export class RemoteError extends Error {
  constructor(
    readonly method: string,
    readonly path: string,
    readonly status: number,
    detail: string,
  ) {
    super(`${method} ${path} → ${status}: ${detail}`)
    this.name = 'RemoteError'
  }
}

/** A REST call that got no HTTP response: address, method, path and the cause. */
export class RemoteNetworkError extends Error {
  constructor(
    readonly method: string,
    readonly origin: string,
    readonly path: string,
    readonly reason: string,
  ) {
    super(`${method} ${origin}${path} failed: ${reason}`)
    this.name = 'RemoteNetworkError'
  }
}

/** The cause of a failed fetch: the system error code (ECONNREFUSED, ENOTFOUND) if there is one. */
const networkReason = (error: unknown, timeoutMs: number): string => {
  const e = error as {
    name?: string
    message?: string
    cause?: { code?: string; message?: string }
  }
  if (e?.name === 'TimeoutError') return `no response in ${timeoutMs / 1000} s (timeout)`
  const cause = e?.cause
  if (cause?.code) return cause.message ? `${cause.code} (${cause.message})` : cause.code
  return cause?.message ?? e?.message ?? String(error)
}

/** Default time limit of one REST request. */
export const REQUEST_TIMEOUT_MS = 30_000

/** For reads that may find nothing (no published version yet). Every other error stops the run. */
export const nullIfNotFound = (error: unknown): null => {
  if ((error as { status?: number } | null)?.status === 404) return null
  throw error
}

type Query = Record<string, unknown>

/** Payload REST query string: nested objects as where[slug][equals]=x. */
export const toQueryString = (query: Query): string => {
  const parts: string[] = []
  const add = (key: string, value: unknown) => {
    if (value === undefined || value === null) return
    if (typeof value === 'object' && !Array.isArray(value)) {
      for (const [k, v] of Object.entries(value)) add(`${key}[${k}]`, v)
      return
    }
    const text = Array.isArray(value) ? value.join(',') : String(value)
    parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(text)}`)
  }
  for (const [key, value] of Object.entries(query)) add(key, value)
  return parts.length ? `?${parts.join('&')}` : ''
}

const MIME: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
}

type Options = {
  baseUrl: string
  email: string
  password: string
  config: SanitizedConfig
  /** Dry run: any request that would write is refused before it is sent. */
  readOnly: boolean
  fetchImpl?: typeof fetch
  /** Time limit of one request. Default REQUEST_TIMEOUT_MS. */
  timeoutMs?: number
}

type Args = {
  collection?: string
  slug?: string
  id?: number | string
  locale?: string
  depth?: number
  draft?: boolean
  limit?: number
  where?: Query
  fallbackLocale?: unknown
  data?: Record<string, unknown>
  filePath?: string
}

/** The --remote address: an absolute http or https URL. */
export const parseRemoteUrl = (value: string): URL => {
  let url: URL | undefined
  try {
    url = new URL(value)
  } catch {
    // Handled below.
  }
  if (!url || (url.protocol !== 'http:' && url.protocol !== 'https:')) {
    throw new Error(
      `--remote must be an http or https URL, for example https://robopipe.io, not "${value}".`,
    )
  }
  return url
}

const errorText = async (response: Response): Promise<string> => {
  const body = await response.text()
  try {
    const json = JSON.parse(body) as {
      errors?: { message?: string; data?: { errors?: { path?: string; message?: string }[] } }[]
    }
    const messages = (json.errors ?? []).flatMap((e) => [
      e.message ?? '',
      ...(e.data?.errors ?? []).map((field) => `${field.path}: ${field.message}`),
    ])
    if (messages.filter(Boolean).length) return messages.filter(Boolean).join(', ')
  } catch {
    // Not JSON: show the start of the body.
  }
  return body.slice(0, 300) || response.statusText
}

/**
 * Payload REST client with the Local API methods the content script calls.
 * Logs in with the given account. The password is only sent to /api/users/login.
 */
export const createRemoteClient = async ({
  baseUrl,
  email,
  password,
  config,
  readOnly,
  fetchImpl = fetch,
  timeoutMs = REQUEST_TIMEOUT_MS,
}: Options): Promise<SeoGeoClient> => {
  const url = parseRemoteUrl(baseUrl)
  const root = `${url.origin}${url.pathname.replace(/\/$/, '')}`

  const send = async (method: string, apiPath: string, init: RequestInit = {}) => {
    let response: Response
    try {
      response = await fetchImpl(`${root}${apiPath}`, {
        ...init,
        method,
        signal: AbortSignal.timeout(timeoutMs),
      })
    } catch (error) {
      throw new RemoteNetworkError(
        method,
        url.origin,
        apiPath.split('?')[0],
        networkReason(error, timeoutMs),
      )
    }
    if (!response.ok) {
      throw new RemoteError(
        method,
        apiPath.split('?')[0],
        response.status,
        await errorText(response),
      )
    }
    return response.json() as Promise<Record<string, unknown>>
  }

  const login = await send('POST', '/api/users/login', {
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  const token = login.token as string | undefined
  if (!token) throw new RemoteError('POST', '/api/users/login', 200, 'no token in the response')
  const auth = { Authorization: `JWT ${token}` }

  const request = (method: string, apiPath: string, body?: Record<string, unknown> | FormData) => {
    if (readOnly && method !== 'GET') {
      throw new Error(`Dry run is read-only: ${method} ${apiPath.split('?')[0]} was not sent.`)
    }
    if (body instanceof FormData) return send(method, apiPath, { headers: auth, body })
    return send(method, apiPath, {
      headers: { ...auth, ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    })
  }

  const params = (args: Args) =>
    toQueryString({
      locale: args.locale,
      depth: args.depth,
      draft: args.draft ? 'true' : undefined,
      limit: args.limit,
      where: args.where,
      'fallback-locale': args.fallbackLocale === false ? 'none' : undefined,
    })

  const client = {
    config,
    find: (args: Args) => request('GET', `/api/${args.collection}${params(args)}`),
    findByID: (args: Args) => request('GET', `/api/${args.collection}/${args.id}${params(args)}`),
    create: async (args: Args) => {
      const apiPath = `/api/${args.collection}${params(args)}`
      if (!args.filePath) return (await request('POST', apiPath, args.data)).doc
      const form = new FormData()
      const file = fs.readFileSync(args.filePath)
      const name = path.basename(args.filePath)
      const type = MIME[path.extname(name).toLowerCase()] ?? 'application/octet-stream'
      form.append('file', new File([file], name, { type }))
      form.append('_payload', JSON.stringify(args.data ?? {}))
      return (await request('POST', apiPath, form)).doc
    },
    update: async (args: Args) =>
      (await request('PATCH', `/api/${args.collection}/${args.id}${params(args)}`, args.data)).doc,
    findGlobal: (args: Args) => request('GET', `/api/globals/${args.slug}${params(args)}`),
    updateGlobal: async (args: Args) =>
      (await request('POST', `/api/globals/${args.slug}${params(args)}`, args.data)).result,
  }
  return client as unknown as SeoGeoClient
}
