import { readCookie, writeCookie } from '@/lib/clientCookies'
import { cookieDomain } from '@/lib/consent'

/**
 * Where the visitor came from (issue #61): the five utm parameters and the referring page.
 * Pure functions for the browser and the server. Only `persistLanding` touches the DOM.
 *
 * Two sources reach the lead:
 * - the form page: the address and `document.referrer` at submission, always, never stored
 *   on the device;
 * - the first landing: the cookie `rp_source`, only with analytics consent
 *   (`GOOGLE_COOKIES.analytics` in `consent.ts`).
 *
 * Priority: a valid `rp_source` wins as a whole, the form page is the fallback. The two
 * sources never mix, so one lead never shows utm values from one visit and a referrer
 * from another.
 */

export const SOURCE_COOKIE = 'rp_source'

/** 90 days, the same as `rp_click`. */
export const SOURCE_MAX_AGE_SECONDS = 60 * 60 * 24 * 90

const SOURCE_VERSION = 1

export const UTM_PARAMS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
] as const

export type UtmParam = (typeof UTM_PARAMS)[number]

/** The form field that carries the referrer of the form page. */
export const REFERRER_FIELD = 'referrer'

export type PageSource = Partial<Record<UtmParam, string>> & { referrer?: string }

/** `at` is the ISO time of the first landing. */
export type LandingSource = PageSource & { v: 1; at: string }

/** Fields of the `attribution` group in the `leads` collection. */
export type LeadSourceFields = {
  utmSource?: string
  utmMedium?: string
  utmCampaign?: string
  utmTerm?: string
  utmContent?: string
  referrer?: string
  sourceFrom?: 'landing' | 'formPage'
  landedAt?: string
}

export const UTM_MAX_LENGTH = 100
export const REFERRER_MAX_LENGTH = 300

/** Longer input is not a real utm value or referrer. Nothing parses it. */
const RAW_MAX_LENGTH = 2048

/**
 * Letters (with accents), digits, space and the punctuation that campaign names use.
 * Everything else goes: control characters, quotes, `<`, `>`, `;`, backslash, emoji.
 */
const UTM_DISALLOWED = /[^\p{L}\p{M}\p{N} _.\-+:/|()&,!?#@%~*=]/gu

/** A spreadsheet reads a cell that starts with one of these as a formula (CSV injection). */
const FORMULA_START = /^[=+\-@ ]+/

/** `undefined` when nothing valid is left. Cuts to 100 characters. */
export const cleanUtmValue = (raw: unknown): string | undefined => {
  if (typeof raw !== 'string' || raw.length > RAW_MAX_LENGTH) return undefined
  const cleaned = raw
    .normalize('NFC')
    .replace(/\s+/g, ' ')
    .replace(UTM_DISALLOWED, '')
    .replace(FORMULA_START, '')
  const cut = Array.from(cleaned).slice(0, UTM_MAX_LENGTH).join('').trim()
  return cut || undefined
}

const hostOf = (value: string): string => value.trim().toLowerCase().replace(/:\d+$/, '')

/** `www.robopipe.io` is own for `robopipe.io` and the other way round. */
export const isOwnHost = (hostname: string, ownHosts: readonly string[]): boolean => {
  const host = hostOf(hostname)
  return ownHosts.some((own) => {
    const ownHost = hostOf(own)
    if (!ownHost) return false
    if (host === ownHost) return true
    const domain = cookieDomain(ownHost)
    return domain !== undefined && `.${host}`.endsWith(domain)
  })
}

/**
 * Origin and path of an http(s) referrer from another domain. No user, password, query or
 * fragment: they can hold personal data. A path that makes it longer than 300 characters
 * leaves only the origin.
 */
export const cleanReferrer = (raw: unknown, ownHosts: readonly string[]): string | undefined => {
  if (typeof raw !== 'string' || !raw || raw.length > RAW_MAX_LENGTH) return undefined
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    return undefined
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return undefined
  if (!url.hostname || isOwnHost(url.hostname, ownHosts)) return undefined
  const withPath = `${url.origin}${url.pathname}`
  if (withPath.length <= REFERRER_MAX_LENGTH) return withPath
  return url.origin.length <= REFERRER_MAX_LENGTH ? url.origin : undefined
}

const hasSource = (source: PageSource): boolean =>
  UTM_PARAMS.some((param) => source[param] !== undefined) || source.referrer !== undefined

/** Clean values from any key-value source. Leaves out what is missing or not valid. */
const cleanSource = (
  get: (name: string) => unknown,
  referrer: unknown,
  ownHosts: readonly string[],
): PageSource => {
  const source: PageSource = {}
  for (const param of UTM_PARAMS) {
    const value = cleanUtmValue(get(param))
    if (value !== undefined) source[param] = value
  }
  const cleanedReferrer = cleanReferrer(referrer, ownHosts)
  if (cleanedReferrer !== undefined) source.referrer = cleanedReferrer
  return source
}

/** utm values of a page address (`location.search`) and its referrer. */
export const sourceFromPage = (
  search: string,
  referrer: string,
  ownHosts: readonly string[],
): PageSource => {
  const params = new URLSearchParams(search)
  return cleanSource((name) => params.get(name), referrer, ownHosts)
}

/** The landing to keep in `rp_source`, or `null` when the page has no utm and no referrer. */
export const landingFromPage = (
  search: string,
  referrer: string,
  ownHosts: readonly string[],
  now: Date = new Date(),
): LandingSource | null => {
  const source = sourceFromPage(search, referrer, ownHosts)
  return hasSource(source) ? { v: SOURCE_VERSION, ...source, at: now.toISOString() } : null
}

export const serializeLanding = (landing: LandingSource): string => JSON.stringify(landing)

/** The visitor's clock writes `at`. A clock that runs a little fast keeps the landing. */
const CLOCK_SKEW_MS = 60 * 60 * 1000

/**
 * `null` when missing, broken, other `v`, `at` in the future (beyond clock skew), older than
 * 90 days, or without any valid value. Cleans every value again: the cookie is visitor input.
 */
export const parseLanding = (
  raw: string | null | undefined,
  ownHosts: readonly string[],
  now: Date,
): LandingSource | null => {
  if (!raw || raw.length > RAW_MAX_LENGTH * 4) return null
  try {
    const value: unknown = JSON.parse(raw)
    if (typeof value !== 'object' || value === null || Array.isArray(value)) return null
    const record = value as Record<string, unknown>
    if (record.v !== SOURCE_VERSION || typeof record.at !== 'string') return null
    const landed = Date.parse(record.at)
    if (Number.isNaN(landed)) return null
    const age = now.getTime() - landed
    if (age < -CLOCK_SKEW_MS || age > SOURCE_MAX_AGE_SECONDS * 1000) return null
    const source = cleanSource((name) => record[name], record.referrer, ownHosts)
    if (!hasSource(source)) return null
    return { v: SOURCE_VERSION, ...source, at: new Date(landed).toISOString() }
  } catch {
    return null
  }
}

/** Form fields with the values of the form page. The server cleans them again. */
export const appendPageSource = (
  data: FormData,
  search: string,
  referrer: string,
  ownHosts: readonly string[],
): void => {
  const source = sourceFromPage(search, referrer, ownHosts)
  for (const param of UTM_PARAMS) {
    const value = source[param]
    if (value !== undefined) data.set(param, value)
  }
  if (source.referrer !== undefined) data.set(REFERRER_FIELD, source.referrer)
}

/** Form page values from the submitted form. Bad or missing values are left out. */
export const sourceFromForm = (
  get: (name: string) => unknown,
  ownHosts: readonly string[],
): PageSource => cleanSource(get, get(REFERRER_FIELD), ownHosts)

/**
 * The fields for the lead. A valid first landing wins as a whole. Without it, the form page.
 * An empty object when neither has a value.
 */
export const leadSourceFields = (
  landing: LandingSource | null,
  formPage: PageSource,
): LeadSourceFields => {
  const [source, sourceFrom] = landing
    ? [landing, 'landing' as const]
    : hasSource(formPage)
      ? [formPage, 'formPage' as const]
      : [null, undefined]
  if (!source || !sourceFrom) return {}
  const fields: LeadSourceFields = {
    utmSource: source.utm_source,
    utmMedium: source.utm_medium,
    utmCampaign: source.utm_campaign,
    utmTerm: source.utm_term,
    utmContent: source.utm_content,
    referrer: source.referrer,
    sourceFrom,
    landedAt: landing?.at,
  }
  return Object.fromEntries(
    Object.entries(fields).filter(([, value]) => value !== undefined),
  ) as LeadSourceFields
}

/**
 * Browser only. Call it only with analytics consent. Keeps the first landing: a valid
 * `rp_source` stays until it is older than 90 days.
 */
export const persistLanding = (landing: LandingSource, now: Date = new Date()): void => {
  if (parseLanding(readCookie(SOURCE_COOKIE), [location.hostname], now)) return
  writeCookie(SOURCE_COOKIE, serializeLanding(landing), SOURCE_MAX_AGE_SECONDS)
}
