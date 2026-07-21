'use server'

import { headers } from 'next/headers'
import { z } from 'zod'

import { getPayloadClient } from '@/lib/queries'

const leadSchema = z.object({
  name: z.string().trim().min(1).max(200),
  email: z.string().trim().email().max(320),
  company: z.string().trim().max(200).optional(),
  message: z.string().trim().min(1).max(5000),
  useCase: z.string().trim().max(500).optional(),
  tier: z.string().trim().max(100).optional(),
  locale: z.enum(['cs', 'en']),
  sourcePage: z.string().trim().max(500).optional(),
  // Honeypot — hidden field real users never fill.
  website: z.string().max(0).optional().or(z.literal('')),
})

export type LeadFormState = {
  status: 'idle' | 'success' | 'error'
  error?: 'validation' | 'rate-limit' | 'server'
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

export async function submitLead(
  _prev: LeadFormState,
  formData: FormData,
): Promise<LeadFormState> {
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
    await payload.create({
      collection: 'leads',
      data: lead,
      overrideAccess: true,
      context: { skipRevalidate: true },
    })

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
            lead.useCase && `Use case: ${lead.useCase}`,
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
        payload.logger.error({ err: emailError, msg: 'Lead notification email failed' })
      }
    }
    return { status: 'success' }
  } catch (error) {
    console.error('Lead submission failed', error)
    return { status: 'error', error: 'server' }
  }
}
