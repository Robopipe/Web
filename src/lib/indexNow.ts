import { SERVER_URL } from './paths'

/**
 * IndexNow (https://www.indexnow.org): tells Bing and Seznam that a public URL
 * changed, so they crawl it without waiting for the sitemap (issue #40).
 *
 * The key is public by design: search engines read it from KEY_PATH on this
 * site to check that the request comes from the site owner. It still comes
 * from the environment, so only the production deployment has one.
 */

export const KEY_PATH = '/indexnow-key.txt'

/** Every participating engine shares the URLs with the others. Both are named for certainty. */
export const ENDPOINTS = ['https://www.bing.com/indexnow', 'https://search.seznam.cz/indexnow']

/** The protocol allows 8 to 128 characters: a-z, A-Z, 0-9 and dashes. */
const KEY_PATTERN = /^[a-zA-Z0-9-]{8,128}$/

const TIMEOUT_MS = 5000

type Env = Partial<Record<'INDEXNOW_KEY' | 'NODE_ENV', string>>

/** The configured key, or null when it is missing or not a valid IndexNow key. */
export const indexNowKey = (env: Env = process.env): string | null => {
  const key = env.INDEXNOW_KEY?.trim()
  return key && KEY_PATTERN.test(key) ? key : null
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
 * The key when this process may notify search engines: a production build of
 * a public https site with a valid key. Tests, `next dev` and local
 * `next start` on localhost never send anything.
 */
export type IndexNowConfig = { key: string; siteUrl: string }

export const indexNowConfig = (
  env: Env = process.env,
  siteUrl: string = SERVER_URL,
): IndexNowConfig | null => {
  const key = indexNowKey(env)
  if (!key || env.NODE_ENV !== 'production' || !isPublicSite(siteUrl)) return null
  return { key, siteUrl }
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
 * Without a config (see indexNowConfig) it sends nothing and returns [].
 */
export const submitToIndexNow = async (
  urls: string[],
  {
    config = indexNowConfig(),
    fetchImpl = fetch,
  }: { config?: IndexNowConfig | null; fetchImpl?: typeof fetch } = {},
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
