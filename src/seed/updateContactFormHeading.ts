import 'dotenv/config'

import config from '@payload-config'
import { getPayload } from 'payload'

/**
 * One-off (idempotent), 2026-08-27: renames the contact-page form heading so it
 * no longer collides with the new "Book a meeting" Calendly card next to it.
 * Targets only the `heading` of `contactForm` blocks — the "Domluvit demo" /
 * "Book a demo" CTA buttons elsewhere keep their label.
 *
 * Run with: pnpm tsx src/seed/updateContactFormHeading.ts   (DATABASE_URL selects the target)
 */

const HEADINGS = {
  // 'Napište nám' was a short-lived intermediate value; matching it keeps the run idempotent.
  cs: { from: ['Domluvit demo', 'Napište nám'], to: 'Pošlete nám poptávku' },
  en: { from: ['Book a demo'], to: 'Send us a message' },
} as const

const payload = await getPayload({ config })

for (const locale of ['cs', 'en'] as const) {
  const { from, to } = HEADINGS[locale]
  const { docs } = await payload.find({
    collection: 'pages',
    locale,
    depth: 0,
    limit: 200,
    draft: false,
  })
  for (const page of docs) {
    let previous: string | undefined
    const layout = (page.layout ?? []).map((block) => {
      if (block.blockType !== 'contactForm' || !(from as readonly string[]).includes(block.heading ?? ''))
        return block
      previous = block.heading ?? ''
      return { ...block, heading: to }
    })
    if (previous === undefined) continue
    await payload.update({
      collection: 'pages',
      id: page.id,
      locale,
      depth: 0,
      data: { layout, _status: 'published' },
    })
    payload.logger.info(`pages#${page.id} (${locale}): contactForm heading "${previous}" → "${to}"`)
  }
}

process.exit(0)
