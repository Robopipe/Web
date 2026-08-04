import 'dotenv/config'

import config from '@payload-config'
import { getPayload } from 'payload'

import type { Page, PlanComparisonBlock, PricingTableBlock } from '@/payload-types'

/**
 * One-off (idempotent) content pass, 2026-08-04: free "Open source" tier on the
 * pricing page — the same content the current seed produces on a fresh database.
 * Requires the PricingTable grid fix (4-tier layout) to be deployed.
 *
 *  1. pricingTable: prepends the Open source tier, prepends the industrial-camera
 *     feature to Standard, and re-words the footnote ("Všechny placené tarify…" /
 *     "All paid plans…").
 *  2. planComparison: prepends an "Open source" column (conservative values) and
 *     a new "Industrial camera & AI PLC included" row.
 *
 * New rows get explicit ids so the cs create and the en update address the SAME
 * rows (same mechanism as the seed's withRowIds).
 *
 * Run with: pnpm tsx src/seed/addOssPricingTier.ts   (DATABASE_URL selects the target)
 */

const GITHUB_URL = 'https://github.com/robopipe'

const OSS_TIER_CS = {
  id: 'tier_oss',
  name: 'Open source',
  tagline: 'Provozujte si Robopipe sami na vlastní infrastruktuře.',
  price: 'Zdarma',
  period: '',
  subNote: 'vlastní hardware · komunitní podpora',
  featuresLeadIn: '',
  features: [
    { id: 'tier_oss_f0', text: 'Celá pipeline: snímání, trénink i vyhodnocování' },
    { id: 'tier_oss_f1', text: 'Běží na Raspberry Pi' },
    { id: 'tier_oss_f2', text: 'Komunitní podpora na GitHubu' },
  ],
  cta: { label: 'Zobrazit na GitHubu', type: 'external' as const, url: GITHUB_URL, newTab: true },
  ctaVariant: 'outlined' as const,
  highlighted: false,
}

const OSS_TIER_EN = {
  tagline: 'Run Robopipe yourself on your own infrastructure.',
  price: 'Free',
  period: '',
  subNote: 'Your own hardware · community support',
  ctaLabel: 'View on GitHub',
  features: {
    tier_oss_f0: 'Full pipeline: capture, train and run',
    tier_oss_f1: 'Runs on Raspberry Pi',
    tier_oss_f2: 'Community support on GitHub',
  } as Record<string, string>,
}

const STD_FEATURE_CS = 'Průmyslová kamera s krytím IP67 v ceně'
const STD_FEATURE_EN = 'Industrial-grade IP67 camera included'

/** OSS column value by row label; rows not listed get '' (renders as a dash). */
const OSS_VALUES_CS: Record<string, string> = {
  'Kamery a závody': 'Neomezeně',
  'Kontrolované produkty': 'Neomezeně',
  'Samoobslužné nastavení produktů': '✓',
  'Tréninky modelu': 'Na vlastním HW',
  'Servis a podpora po instalaci': 'Komunitní',
}
const OSS_VALUES_EN: Record<string, string> = {
  'Cameras & sites': 'Unlimited',
  'Inspected products': 'Unlimited',
  'Self-service product setup': '✓',
  'Model trainings': 'On your hardware',
  'Post-install service & support': 'Community',
}

const HW_ROW_CS = {
  id: 'row_hw',
  label: 'Průmyslová kamera a AI PLC v ceně',
  values: [
    { id: 'row_hw_v0', value: 'Vlastní Raspberry Pi' },
    { id: 'row_hw_v1', value: '✓' },
    { id: 'row_hw_v2', value: '✓' },
    { id: 'row_hw_v3', value: '✓' },
  ],
}
const HW_ROW_EN = {
  label: 'Industrial camera & AI PLC included',
  values: ['Your Raspberry Pi', '✓', '✓', '✓'],
}

const payload = await getPayload({ config })
const log = (msg: string) => payload.logger.info(msg)

const findPricingPage = async (locale: 'cs' | 'en'): Promise<Page> => {
  const { docs } = await payload.find({
    collection: 'pages',
    locale,
    where: { slug: { equals: locale === 'cs' ? 'cenik' : 'pricing' } },
    depth: 0,
    draft: false,
    limit: 1,
  })
  if (!docs[0]) throw new Error(`Pricing page not found (${locale})`)
  return docs[0]
}

/* ------------------------------- cs pass ------------------------------- */

const csPage = await findPricingPage('cs')
let csChanged = false

const csLayout = (csPage.layout ?? []).map((block) => {
  if (block.blockType === 'pricingTable') {
    const table = block as PricingTableBlock
    let tiers = table.tiers ?? []
    if (tiers[0]?.name !== 'Open source') {
      tiers = [OSS_TIER_CS, ...tiers]
      csChanged = true
      log('pricingTable (cs): Open source tier prepended')
    }
    tiers = tiers.map((tier) => {
      if (tier.name !== 'Standard') return tier
      const features = tier.features ?? []
      if (features.some((f) => f.id === 'std_feat_cam' || f.text === STD_FEATURE_CS)) return tier
      csChanged = true
      log('pricingTable (cs): industrial-camera feature prepended to Standard')
      return { ...tier, features: [{ id: 'std_feat_cam', text: STD_FEATURE_CS }, ...features] }
    })
    let footnote = table.footnote
    if (footnote?.startsWith('Všechny tarify zahrnují')) {
      footnote = footnote.replace('Všechny tarify zahrnují', 'Všechny placené tarify zahrnují')
      csChanged = true
      log('pricingTable (cs): footnote re-worded')
    }
    return { ...table, tiers, footnote }
  }
  if (block.blockType === 'planComparison') {
    const comparison = block as PlanComparisonBlock
    if ((comparison.columns ?? []).length >= 4) return block
    csChanged = true
    log('planComparison (cs): Open source column + hardware row prepended')
    return {
      ...comparison,
      columns: [{ id: 'col_oss', name: 'Open source' }, ...(comparison.columns ?? [])],
      groups: (comparison.groups ?? []).map((group, gi) => {
        let rows = (group.rows ?? []).map((row, ri) => ({
          ...row,
          values: [
            { id: `val_oss_${gi}_${ri}`, value: OSS_VALUES_CS[row.label] ?? '' },
            ...(row.values ?? []),
          ],
        }))
        if (group.label === 'Nasazení a podpora') rows = [HW_ROW_CS, ...rows]
        return { ...group, rows }
      }),
    }
  }
  return block
})

if (csChanged) {
  await payload.update({
    collection: 'pages',
    id: csPage.id,
    locale: 'cs',
    depth: 0,
    data: { layout: csLayout, _status: 'published' },
  })
  log(`pages#${csPage.id} (cs): pricing layout updated`)
} else {
  log(`pages#${csPage.id} (cs): already applied — skipped`)
}

/* ------------------------------- en pass ------------------------------- */
// Addresses the rows created above by their explicit ids and writes the en
// values of localized fields; existing rows pass through with their en values.

const enPage = await findPricingPage('en')

const enLayout = (enPage.layout ?? []).map((block) => {
  if (block.blockType === 'pricingTable') {
    const table = block as PricingTableBlock
    const tiers = (table.tiers ?? []).map((tier) => {
      if (tier.id === 'tier_oss') {
        return {
          ...tier,
          name: 'Open source',
          tagline: OSS_TIER_EN.tagline,
          price: OSS_TIER_EN.price,
          period: OSS_TIER_EN.period,
          subNote: OSS_TIER_EN.subNote,
          featuresLeadIn: '',
          features: (tier.features ?? []).map((f) => ({
            ...f,
            text: (f.id && OSS_TIER_EN.features[f.id]) || f.text,
          })),
          cta: { ...tier.cta, label: OSS_TIER_EN.ctaLabel, url: GITHUB_URL },
        }
      }
      if (tier.name === 'Standard') {
        return {
          ...tier,
          features: (tier.features ?? []).map((f) =>
            f.id === 'std_feat_cam' ? { ...f, text: STD_FEATURE_EN } : f,
          ),
        }
      }
      return tier
    })
    const footnote = table.footnote?.startsWith('All plans include')
      ? table.footnote.replace('All plans include', 'All paid plans include')
      : table.footnote
    return { ...table, tiers, footnote }
  }
  if (block.blockType === 'planComparison') {
    const comparison = block as PlanComparisonBlock
    return {
      ...comparison,
      columns: (comparison.columns ?? []).map((col) =>
        col.id === 'col_oss' ? { ...col, name: 'Open source' } : col,
      ),
      groups: (comparison.groups ?? []).map((group) => ({
        ...group,
        rows: (group.rows ?? []).map((row) => {
          if (row.id === 'row_hw') {
            return {
              ...row,
              label: HW_ROW_EN.label,
              values: (row.values ?? []).map((v, i) => ({ ...v, value: HW_ROW_EN.values[i] })),
            }
          }
          return {
            ...row,
            values: (row.values ?? []).map((v) =>
              v.id?.startsWith('val_oss_') ? { ...v, value: OSS_VALUES_EN[row.label] ?? '' } : v,
            ),
          }
        }),
      })),
    }
  }
  return block
})

await payload.update({
  collection: 'pages',
  id: enPage.id,
  locale: 'en',
  depth: 0,
  data: { layout: enLayout, _status: 'published' },
})
log(`pages#${enPage.id} (en): pricing layout updated`)

process.exit(0)
