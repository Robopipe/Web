/**
 * Offline conversions for Google Ads (issue #26). Server only: the file imports
 * `node:crypto`, so the client build rejects it. Client components must not import it.
 */
import { createHash, timingSafeEqual } from 'node:crypto'

import type { Lead } from '@/payload-types'
import { parseClickId, CLICK_COOKIE } from '@/lib/clickId'
import { CONSENT_COOKIE, parseConsent } from '@/lib/consent'
import { isBusinessEmail, isTestLead, normalizeEmail } from '@/lib/leadEmail'

/** Data Manager imports the last 90 days on every run (Google Ads docs). */
export const EXPORT_WINDOW_DAYS = 90

export type LeadAttribution = NonNullable<Lead['attribution']>

export type LeadForAds = Pick<Lead, 'email' | 'name' | 'attribution'>

export type ExportLead = Pick<Lead, 'id' | 'email' | 'createdAt' | 'attribution'>

/** SHA-256 hex of normalizeEmail(email). */
export const hashEmail = (email: string): string =>
  createHash('sha256').update(normalizeEmail(email)).digest('hex')

/** Consent from rp_consent (parseConsent). Click from rp_click (parseClickId) only with marketing consent. */
export const attributionFromCookies = (
  get: (name: string) => string | undefined,
  now: Date,
): LeadAttribution => {
  const consent = parseConsent(get(CONSENT_COOKIE))
  const consentAnalytics = consent?.analytics ?? false
  const consentMarketing = consent?.marketing ?? false
  const attribution: LeadAttribution = { consentAnalytics, consentMarketing }
  if (!consentMarketing) return attribution
  const click = parseClickId(get(CLICK_COOKIE), now)
  if (click) {
    attribution[click.type] = click.id
    attribution.clickedAt = click.at
  }
  return attribution
}

/** The only rule: marketing consent, company email, not a test lead. A click ID is not required (scenario 4). */
export const isGoogleAdsLead = (lead: LeadForAds): boolean =>
  lead.attribution?.consentMarketing === true &&
  isBusinessEmail(lead.email) &&
  !isTestLead({ email: lead.email, name: lead.name })

/** Fixed order. The names are the headers that the Data Manager maps to its fields. */
export const EXPORT_COLUMNS = [
  'Order ID',
  'Conversion Name',
  'Conversion Time',
  'Google Click ID',
  'GBRAID',
  'WBRAID',
  'Email',
  'Ad User Data',
] as const

export type ExportRow = Record<(typeof EXPORT_COLUMNS)[number], string>

/** `2026-11-12T09:14:03Z`: UTC without milliseconds, a format that the Data Manager accepts. */
export const toConversionTime = (createdAt: string): string =>
  new Date(createdAt).toISOString().replace(/\.\d{3}Z$/, 'Z')

/** Only leads that pass isGoogleAdsLead. The email goes out only as a hash. */
export const toExportRow = (lead: ExportLead, conversionName: string): ExportRow => ({
  'Order ID': `lead-${lead.id}`,
  'Conversion Name': conversionName,
  'Conversion Time': toConversionTime(lead.createdAt),
  'Google Click ID': lead.attribution?.gclid ?? '',
  GBRAID: lead.attribution?.gbraid ?? '',
  WBRAID: lead.attribution?.wbraid ?? '',
  Email: hashEmail(lead.email),
  'Ad User Data': 'Granted',
})

/**
 * A spreadsheet reads a cell that starts with one of these characters as a formula (OWASP CSV
 * injection). The export values do not start with one: the Order ID, the time and the hash start
 * with a letter or a digit, and Google click IDs start with a letter or a digit. Second guard (B2).
 */
const FORMULA_START = /^[=+\-@\t\r]/

const csvField = (raw: string): string => {
  const value = FORMULA_START.test(raw) ? `'${raw}` : raw
  return /[",\r\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value
}

/** UTF-8 text without BOM, `\n` line ends, the header row always first. */
export const toCsv = (rows: ExportRow[]): string =>
  [EXPORT_COLUMNS, ...rows.map((row) => EXPORT_COLUMNS.map((column) => row[column]))]
    .map((fields) => fields.map(csvField).join(',') + '\n')
    .join('')

const sha256 = (value: string): Buffer => createHash('sha256').update(value, 'utf8').digest()

/** HTTP Basic. `false` when the user or the password is not set, so the export stays closed. */
export const checkBasicAuth = (
  header: string | null | undefined,
  user: string | undefined,
  password: string | undefined,
): boolean => {
  if (!user || !password || !header) return false
  const match = /^Basic\s+(\S+)$/i.exec(header.trim())
  if (!match) return false
  const decoded = Buffer.from(match[1], 'base64').toString('utf8')
  const separator = decoded.indexOf(':')
  if (separator < 0) return false
  // Hashes have the same length, so timingSafeEqual never throws and leaks no length.
  const userOk = timingSafeEqual(sha256(decoded.slice(0, separator)), sha256(user))
  const passwordOk = timingSafeEqual(sha256(decoded.slice(separator + 1)), sha256(password))
  return userOk && passwordOk
}
