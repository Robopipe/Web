'use server'

import { headers } from 'next/headers'
import { z } from 'zod'

import { getPayloadClient } from '@/lib/queries'

const subscribeSchema = z.object({
  email: z.string().trim().email().max(320),
  locale: z.enum(['cs', 'en']),
  sourcePage: z.string().trim().max(500).optional(),
  // Honeypot — hidden field real users never fill.
  website: z.string().max(0).optional().or(z.literal('')),
})

export type NewsletterFormState = {
  status: 'idle' | 'success' | 'error'
  error?: 'validation' | 'rate-limit' | 'server'
}

// Per-instance rate limit, same trade-off as the lead form.
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

export async function subscribeNewsletter(
  _prev: NewsletterFormState,
  formData: FormData,
): Promise<NewsletterFormState> {
  const parsed = subscribeSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
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

  const { website: _honeypot, ...data } = parsed.data

  try {
    const payload = await getPayloadClient()
    const existing = await payload.find({
      collection: 'newsletter-subscribers',
      where: { email: { equals: data.email } },
      limit: 1,
      overrideAccess: true,
    })
    if (!existing.docs.length) {
      await payload.create({
        collection: 'newsletter-subscribers',
        data,
        overrideAccess: true,
        context: { skipRevalidate: true },
      })
    }
    // Duplicate signups also report success — nothing for the visitor to fix.
    return { status: 'success' }
  } catch (error) {
    console.error('Newsletter signup failed', error)
    return { status: 'error', error: 'server' }
  }
}
