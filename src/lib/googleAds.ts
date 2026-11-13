/**
 * Offline conversions for Google Ads (issue #26). Server only: the file imports
 * `node:crypto`, so the client build rejects it. Client components must not import it.
 */
import { createHash } from 'node:crypto'

import type { Lead } from '@/payload-types'
import { parseClickId, CLICK_COOKIE } from '@/lib/clickId'
import { CONSENT_COOKIE, parseConsent } from '@/lib/consent'
import { isBusinessEmail, isTestLead, normalizeEmail } from '@/lib/leadEmail'

/** Data Manager imports the last 90 days on every run (Google Ads docs). */
export const EXPORT_WINDOW_DAYS = 90

export type LeadAttribution = NonNullable<Lead['attribution']>

export type LeadForAds = Pick<Lead, 'email' | 'name' | 'attribution'>

export type ExportLead = Pick<Lead, 'id' | 'email' | 'createdAt' | 'attribution'> &
  Partial<Pick<Lead, 'closedCustomer' | 'closedAt' | 'closedValue'>>

/** One Google Ads conversion action: exact name, value per conversion, ISO 4217 currency. */
export type ConversionAction = { name: string; value: number; currency: string }

type MeasurementSettings = {
  leadConversionName?: string | null
  leadConversionValue?: number | null
  closedCustomerConversionName?: string | null
  closedCustomerConversionValue?: number | null
  conversionCurrency?: string | null
}

const validValue = (value: number | null | undefined): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0

/** Both actions from site-settings.measurement, or null when a name, a value or the currency is missing. */
export const conversionActions = (
  measurement: MeasurementSettings | null | undefined,
): { lead: ConversionAction; closed: ConversionAction } | null => {
  const leadName = measurement?.leadConversionName?.trim()
  const closedName = measurement?.closedCustomerConversionName?.trim()
  const currency = measurement?.conversionCurrency?.trim().toUpperCase()
  const leadValue = measurement?.leadConversionValue
  const closedValue = measurement?.closedCustomerConversionValue
  if (!leadName || !closedName || !validValue(leadValue) || !validValue(closedValue)) return null
  if (!currency || !/^[A-Z]{3}$/.test(currency)) return null
  return {
    lead: { name: leadName, value: leadValue, currency },
    closed: { name: closedName, value: closedValue, currency },
  }
}

/**
 * Field hook for `leads.closedAt` (issue #43). The first tick sets the time. A later untick or a
 * second tick keeps the first time, so the conversion time does not move.
 */
export const closedAtOnChange = (
  value: unknown,
  siblingData: { closedCustomer?: boolean | null } | undefined,
  now: Date = new Date(),
): unknown => (value ? value : siblingData?.closedCustomer ? now.toISOString() : value)

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
  'Conversion Value',
  'Conversion Currency',
] as const

export type ExportRow = Record<(typeof EXPORT_COLUMNS)[number], string>

/** `2026-11-12T09:14:03Z`: UTC without milliseconds, a format that the Data Manager accepts. */
export const toConversionTime = (createdAt: string): string =>
  new Date(createdAt).toISOString().replace(/\.\d{3}Z$/, 'Z')

/** Only leads that pass isGoogleAdsLead. The email goes out only as a hash. */
export const toExportRow = (lead: ExportLead, action: ConversionAction): ExportRow => ({
  'Order ID': `lead-${lead.id}`,
  'Conversion Name': action.name,
  'Conversion Time': toConversionTime(lead.createdAt),
  'Google Click ID': lead.attribution?.gclid ?? '',
  GBRAID: lead.attribution?.gbraid ?? '',
  WBRAID: lead.attribution?.wbraid ?? '',
  Email: hashEmail(lead.email),
  'Ad User Data': 'Granted',
  'Conversion Value': String(action.value),
  'Conversion Currency': action.currency,
})

/**
 * Second conversion for the same lead (issue #43). Only a ticked lead with a gclid and a close
 * time. The time is the close time. Its own Order ID, so Google Ads does not drop it as a copy.
 * The value is the lead's closedValue when set (issue #46), else the default from the settings.
 */
export const toClosedExportRow = (lead: ExportLead, action: ConversionAction): ExportRow | null => {
  if (lead.closedCustomer !== true || !lead.closedAt || !lead.attribution?.gclid) return null
  return {
    ...toExportRow(lead, action),
    'Order ID': `lead-${lead.id}-closed`,
    'Conversion Time': toConversionTime(lead.closedAt),
    'Conversion Value': String(validValue(lead.closedValue) ? lead.closedValue : action.value),
  }
}

/** All rows of the export: per lead the lead row, then the closed-customer row when it exists. */
export const toExportRows = (
  leads: (ExportLead & LeadForAds)[],
  actions: { lead: ConversionAction; closed: ConversionAction },
): ExportRow[] =>
  leads.filter(isGoogleAdsLead).flatMap((lead) => {
    const closed = toClosedExportRow(lead, actions.closed)
    return closed ? [toExportRow(lead, actions.lead), closed] : [toExportRow(lead, actions.lead)]
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
