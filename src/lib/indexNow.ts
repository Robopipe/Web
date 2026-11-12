import type { Payload } from 'payload'

import { SERVER_URL } from './paths'

/**
 * IndexNow (https://www.indexnow.org): tells Bing and Seznam that a public URL
 * changed, so they crawl it without waiting for the sitemap (issue #40).
 *
 * The key is public by design: search engines read it from KEY_PATH on this
 * site to check that the request comes from the site owner. An editor sets it
 * in site settings (`verification.indexNowKey`). The INDEXNOW_KEY environment
 * variable is the fallback while that field is empty.
 */

export const KEY_PATH = '/indexnow-key.txt'

/** Every participating engine shares the URLs with the others. Both are named for certainty. */
export const ENDPOINTS = ['https://www.bing.com/indexnow', 'https://search.seznam.cz/indexnow']

/** The protocol allows 8 to 128 characters: a-z, A-Z, 0-9 and dashes. */
export const KEY_PATTERN = /^[a-zA-Z0-9-]{8,128}$/

const TIMEOUT_MS = 5000

type Env = Partial<Record<'INDEXNOW_KEY' | 'NODE_ENV', string>>

/**
 * The key to use: the one from site settings, or INDEXNOW_KEY when that field
 * is empty. Null when there is none or it is not a valid IndexNow key.
 */
export const indexNowKey = (
  stored: string | null | undefined,
  env: Env = process.env,
): string | null => {
  const key = stored?.trim() || env.INDEXNOW_KEY?.trim()
  return key && KEY_PATTERN.test(key) ? key : null
}

/** Reads the key from site settings at call time, so a change in the admin applies at once. */
export const readIndexNowKey = async (
  payload: Pick<Payload, 'findGlobal'>,
  env: Env = process.env,
): Promise<string | null> => {
  const settings = await payload.findGlobal({
    slug: 'site-settings',
    depth: 0,
    select: { verification: { indexNowKey: true } },
  })
  return indexNowKey(settings.verification?.indexNowKey, env)
}

const isPublicSite = (siteUrl: string): boolean => {
  try {
    const { protocol, hostname } = new URL(siteUrl)
    return protocol === 'https:' && hostname !== 'localhost' && !hostname.endsWith('.localhost')
  } catch {
    return false
  }
}

/**
 * True when this process may notify search engines: a production build of a
 * public https site. Tests, `next dev` and local `next start` on localhost
 * never send anything.
 */
export const mayNotify = (env: Env = process.env, siteUrl: string = SERVER_URL): boolean =>
  env.NODE_ENV === 'production' && isPublicSite(siteUrl)

export type IndexNowConfig = { key: string; siteUrl: string }

/** The config for submitToIndexNow, or null when this process may not notify or has no key. */
export const indexNowConfig = (
  key: string | null,
  env: Env = process.env,
  siteUrl: string = SERVER_URL,
): IndexNowConfig | null => (key && mayNotify(env, siteUrl) ? { key, siteUrl } : null)

/**
 * The config with the key from site settings. Outside production it returns
 * null without a database read.
 */
export const loadIndexNowConfig = async (
  payload: Pick<Payload, 'findGlobal'>,
  env: Env = process.env,
  siteUrl: string = SERVER_URL,
): Promise<IndexNowConfig | null> => {
  if (!mayNotify(env, siteUrl)) return null
  return indexNowConfig(await readIndexNowKey(payload, env), env, siteUrl)
}

export type IndexNowBody = { host: string; key: string; keyLocation: string; urlList: string[] }

/** Request body for the absolute URLs on this site. URLs of other hosts are left out. */
export const indexNowBody = (key: string, siteUrl: string, urls: string[]): IndexNowBody => {
  const { host, origin } = new URL(siteUrl)
  const onThisHost = (url: string) => {
    try {
      return new URL(url).host === host
    } catch {
      return false
    }
  }
  const urlList = [...new Set(urls)].filter(onThisHost)
  return { host, key, keyLocation: `${origin}${KEY_PATH}`, urlList }
}

export type IndexNowResult = { endpoint: string; status: number | null; error?: string }

/**
 * Sends the URLs to every endpoint. It never throws: a failed request only
 * shows in the result, because a publish in the admin must not fail on it.
 * Without a config (see loadIndexNowConfig) it sends nothing and returns [].
 */
export const submitToIndexNow = async (
  urls: string[],
  { config, fetchImpl = fetch }: { config: IndexNowConfig | null; fetchImpl?: typeof fetch },
): Promise<IndexNowResult[]> => {
  if (!config) return []
  const body = indexNowBody(config.key, config.siteUrl, urls)
  if (!body.urlList.length) return []
  return Promise.all(
    ENDPOINTS.map(async (endpoint) => {
      try {
        const response = await fetchImpl(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json; charset=utf-8' },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(TIMEOUT_MS),
        })
        return { endpoint, status: response.status }
      } catch (error) {
        return {
          endpoint,
          status: null,
          error: error instanceof Error ? error.message : String(error),
        }
      }
    }),
  )
}
