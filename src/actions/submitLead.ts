'use server'

import { cookies, headers } from 'next/headers'
import { z } from 'zod'

import {
  attributionFromCookies,
  hashEmail,
  isGoogleAdsLead,
  type LeadAttribution,
} from '@/lib/googleAds'
import { createLeadWithAttribution } from '@/lib/leadStore'
import { safeErrorFields } from '@/lib/logSafe'
import { getPayloadClient } from '@/lib/queries'

const leadSchema = z.object({
  name: z.string().trim().min(1).max(200),
  email: z.string().trim().email().max(320),
  company: z.string().trim().max(200).optional(),
  phone: z.string().trim().min(1).max(50),
  message: z.string().trim().min(1).max(5000),
  industry: z
    .enum(['food', 'pharma', 'retail', 'logistics', 'other'])
    .optional()
    .or(z.literal('').transform(() => undefined)),
  tier: z.string().trim().max(100).optional(),
  locale: z.enum(['cs', 'en']),
  sourcePage: z.string().trim().max(500).optional(),
  // Honeypot — hidden field real users never fill.
  website: z.string().max(0).optional().or(z.literal('')),
})

export type LeadFormState = {
  status: 'idle' | 'success' | 'error'
  error?: 'validation' | 'rate-limit' | 'server'
  /** Hashed email for enhanced conversions for leads (issue #26). Only for a Google Ads lead. */
  adsUserData?: { sha256_email_address: string }
}

// Per-instance rate limit: fine on Cloud Run with min-instances=1 and low form volume.
const submissions = new Map<string, number[]>()
const WINDOW_MS = 60 * 60 * 1000
const MAX_PER_WINDOW = 5

const isRateLimited = (ip: string): boolean => {
  const now = Date.now()
  const recent = (submissions.get(ip) ?? []).filter((t) => now - t < WINDOW_MS)
  if (recent.length >= MAX_PER_WINDOW) {
    submissions.set(ip, recent)
    return true
  }
  recent.push(now)
  submissions.set(ip, recent)
  return false
}

export async function submitLead(_prev: LeadFormState, formData: FormData): Promise<LeadFormState> {
  const parsed = leadSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    // Honeypot hits also land here — pretend success so bots learn nothing.
    if (typeof formData.get('website') === 'string' && formData.get('website')) {
      return { status: 'success' }
    }
    return { status: 'error', error: 'validation' }
  }

  const headerList = await headers()
  const ip = headerList.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  if (isRateLimited(ip)) {
    return { status: 'error', error: 'rate-limit' }
  }

  const { website: _honeypot, ...lead } = parsed.data

  try {
    const payload = await getPayloadClient()

    // Consent and ad click at submission (issue #26). Measurement never stops the lead.
    let attribution: LeadAttribution = { consentAnalytics: false, consentMarketing: false }
    try {
      const store = await cookies()
      attribution = attributionFromCookies((name) => store.get(name)?.value, new Date())
    } catch (attributionError) {
      payload.logger.warn({ ...safeErrorFields(attributionError), msg: 'Lead attribution failed' })
    }

    const stored = await createLeadWithAttribution(payload, lead, attribution)

    const settings = await payload.findGlobal({ slug: 'site-settings', depth: 0 })
    const to = settings.leadNotificationEmail
    if (to) {
      try {
        await payload.sendEmail({
          to,
          subject: `New lead: ${lead.name}${lead.company ? ` (${lead.company})` : ''}`,
          text: [
            `Name: ${lead.name}`,
            `Email: ${lead.email}`,
            lead.company && `Company: ${lead.company}`,
            lead.phone && `Phone: ${lead.phone}`,
            lead.industry && `Industry: ${lead.industry}`,
            lead.tier && `Pricing tier: ${lead.tier}`,
            `Locale: ${lead.locale}`,
            lead.sourcePage && `Page: ${lead.sourcePage}`,
            '',
            lead.message,
          ]
            .filter(Boolean)
            .join('\n'),
        })
      } catch (emailError) {
        // Lead is stored — a failed notification must not fail the submission.
        payload.logger.error({
          ...safeErrorFields(emailError),
          msg: 'Lead notification email failed',
        })
      }
    }

    let adsUserData: LeadFormState['adsUserData']
    try {
      // The stored attribution decides, so the tag and the export always agree.
      if (isGoogleAdsLead(stored)) {
        adsUserData = { sha256_email_address: hashEmail(lead.email) }
      }
    } catch (hashError) {
      payload.logger.warn({ ...safeErrorFields(hashError), msg: 'Lead email hash failed' })
    }
    return { status: 'success', adsUserData }
  } catch (error) {
    console.error('Lead submission failed', safeErrorFields(error))
    return { status: 'error', error: 'server' }
  }
}
