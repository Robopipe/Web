import 'dotenv/config'

import config from '@payload-config'
import { getPayload } from 'payload'

/**
 * One-off (idempotent) content pass, 2026-08-04: low-prominence mention of the
 * open-source self-hosted variant — the same content the current seed produces
 * on a fresh database.
 *
 *  1. Creates the "Can we self-host Robopipe?" FAQ (cs + en) if missing.
 *  2. Appends it to the pricing page's faqAccordion block (the faqs
 *     relationship is not localized, so one append serves both locales).
 *  3. Renames the footer Resources link "GitHub" → "Open source (GitHub)"
 *     in both locales (labels are localized).
 *
 * Run with: pnpm tsx src/seed/addSelfHostedVariant.ts   (DATABASE_URL selects the target)
 */

const CS_QUESTION = 'Můžeme si Robopipe provozovat sami?'
const CS_ANSWER =
  'Ano. Robopipe nabízíme i jako open-source variantu, kterou si můžete provozovat na vlastní infrastruktuře — najdete ji na našem GitHubu. K vlastnímu provozu poskytujeme jen komunitní podporu; placené tarify zahrnují hardware, provoz, aktualizace i naši podporu.'
const EN_QUESTION = 'Can we self-host Robopipe?'
const EN_ANSWER =
  "Yes. Robopipe is also available as an open-source variant you can run on your own infrastructure — you'll find it on our GitHub. Self-hosting comes with community support only; paid plans include the hardware, hosting, updates and our support."

const GITHUB_URL = 'https://github.com/robopipe'
const NEW_LABEL = 'Open source (GitHub)'

const richText = (text: string) => ({
  root: {
    type: 'root' as const,
    children: [{ type: 'paragraph', children: [{ type: 'text', text, version: 1 }], version: 1 }],
    direction: null,
    format: '' as const,
    indent: 0,
    version: 1,
  },
})

const payload = await getPayload({ config })
const log = (msg: string) => payload.logger.info(msg)

// --- 1. FAQ document (cs create + en locale update) ---

let faqId: number
const existing = await payload.find({
  collection: 'faqs',
  locale: 'cs',
  where: { question: { equals: CS_QUESTION } },
  depth: 0,
  limit: 1,
})
if (existing.docs[0]) {
  faqId = existing.docs[0].id
  log(`faqs#${faqId}: self-host FAQ already exists — skipped`)
} else {
  const doc = await payload.create({
    collection: 'faqs',
    data: { question: CS_QUESTION, answer: richText(CS_ANSWER) },
  })
  await payload.update({
    collection: 'faqs',
    id: doc.id,
    locale: 'en',
    data: { question: EN_QUESTION, answer: richText(EN_ANSWER) },
  })
  faqId = doc.id
  log(`faqs#${faqId}: self-host FAQ created (cs + en)`)
}

// --- 2. Append to the pricing page's faqAccordion block ---

const { docs: pages } = await payload.find({
  collection: 'pages',
  locale: 'cs',
  where: { slug: { equals: 'cenik' } },
  depth: 0,
  draft: false,
  limit: 1,
})
const pricingPage = pages[0]
if (!pricingPage) throw new Error('Pricing page (slug "cenik") not found')

let appended = false
const layout = (pricingPage.layout ?? []).map((block) => {
  if (block.blockType !== 'faqAccordion') return block
  const ids = block.faqs.map((f) => (typeof f === 'object' ? f.id : f))
  if (ids.includes(faqId)) return block
  appended = true
  return { ...block, faqs: [...ids, faqId] }
})
if (appended) {
  await payload.update({
    collection: 'pages',
    id: pricingPage.id,
    locale: 'cs',
    depth: 0,
    data: { layout, _status: 'published' },
  })
  log(`pages#${pricingPage.id} (pricing): FAQ appended to faqAccordion`)
} else {
  log(`pages#${pricingPage.id} (pricing): FAQ already in faqAccordion — skipped`)
}

// --- 3. Footer link label, both locales ---

for (const locale of ['cs', 'en'] as const) {
  const footer = await payload.findGlobal({ slug: 'footer', locale, depth: 0 })
  let renamed = false
  const columns = (footer.columns ?? []).map((column) => ({
    ...column,
    links: (column.links ?? []).map((row) => {
      if (row.link?.url !== GITHUB_URL || row.link.label === NEW_LABEL) return row
      renamed = true
      return { ...row, link: { ...row.link, label: NEW_LABEL } }
    }),
  }))
  if (renamed) {
    await payload.updateGlobal({ slug: 'footer', locale, data: { columns } })
    log(`global footer (${locale}): GitHub link renamed to "${NEW_LABEL}"`)
  } else {
    log(`global footer (${locale}): label already "${NEW_LABEL}" — skipped`)
  }
}

process.exit(0)
