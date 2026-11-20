import fs from 'node:fs'
import path from 'node:path'

import type { Locale } from '@/i18n/routing'
import type { ContactFormBlock, Page } from '@/payload-types'

import type { SeoGeoClient } from './remoteClient'
import { parseSeedArgs, type SeedArgs } from './seedArgs'

/**
 * Content for issue #65: the lead form on the landing pages of the Google Ads
 * search campaign. A `contactForm` block without the sidebar before the closing
 * CTA of each page, with the heading and microcopy of the contact page. Run
 * twice, it changes nothing the second time. Pages are written from their
 * published version and published.
 */

type FormTexts = Required<Pick<ContactFormBlock, 'heading' | 'microcopy'>>

export type LandingLeadFormCopy = {
  /** Czech slugs of the pages that show the form. */
  pages: string[]
} & Record<Locale, FormTexts>

export type LandingLeadFormReport = { updated: string[]; unchanged: string[]; skipped: string[] }

type Block = NonNullable<Page['layout']>[number]

export const readLandingLeadFormCopy = (): LandingLeadFormCopy =>
  JSON.parse(
    fs.readFileSync(
      path.resolve(process.cwd(), 'seed-assets', 'copy', 'landing-lead-form.json'),
      'utf8',
    ),
  )

/** Block id of the form on a page. Block ids are unique across all pages. */
export const leadFormBlockId = (slug: string): string => `landing-lead-form-${slug}`

/**
 * The layout with `block` right before the last block when that block is the
 * closing CTA banner, else at the end. The CTA stays as it is.
 */
export const withFormBeforeClosingCta = (layout: Block[], block: Block): Block[] => {
  const last = layout.at(-1)
  return last?.blockType === 'ctaBanner'
    ? [...layout.slice(0, -1), block, last]
    : [...layout, block]
}

export const LANDING_LEAD_FORM_USAGE =
  'Usage: pnpm seed:landing-lead-form [--dry-run] [--production] [--remote=<URL>]'

export const parseLandingLeadFormArgs = (args: string[]): SeedArgs =>
  parseSeedArgs(args, LANDING_LEAD_FORM_USAGE)

export const applyLandingLeadForm = async (
  client: SeoGeoClient,
  { dryRun = false }: { dryRun?: boolean } = {},
): Promise<LandingLeadFormReport> => {
  const report: LandingLeadFormReport = { updated: [], unchanged: [], skipped: [] }
  const copy = readLandingLeadFormCopy()

  for (const slug of copy.pages) {
    const label = `page ${slug}`
    const { docs } = await client.find({
      collection: 'pages',
      where: { slug: { equals: slug } },
      locale: 'cs',
      draft: false,
      limit: 1,
      depth: 0,
    })
    const published = docs[0]
    if (!published || published._status !== 'published') {
      report.skipped.push(`${label} (no published version)`)
      continue
    }
    // Publishing from the published version would drop newer draft changes.
    const latest = await client.findByID({
      collection: 'pages',
      id: published.id,
      locale: 'cs',
      draft: true,
      depth: 0,
    })
    if (latest._status === 'draft') {
      report.skipped.push(`${label} (unpublished draft: publish or discard it, then run again)`)
      continue
    }
    // Any form block counts: an editor may have added one in the admin.
    if ((published.layout ?? []).some((block) => block.blockType === 'contactForm')) {
      report.unchanged.push(label)
      continue
    }
    report.updated.push(`${label} (form before the closing CTA)`)
    if (dryRun) continue

    const id = leadFormBlockId(slug)
    const form = (locale: Locale): Block => ({
      id,
      blockType: 'contactForm',
      ...copy[locale],
      showSidebar: false,
    })
    // The layout is not localized, the heading and microcopy are. The Czech write adds the
    // block, the English write fills its texts. Other blocks keep their values by block id.
    await client.update({
      collection: 'pages',
      id: published.id,
      locale: 'cs',
      data: {
        layout: withFormBeforeClosingCta(published.layout ?? [], form('cs')),
        _status: 'published',
      },
    })
    const english = await client.findByID({
      collection: 'pages',
      id: published.id,
      locale: 'en',
      draft: false,
      depth: 0,
    })
    await client.update({
      collection: 'pages',
      id: published.id,
      locale: 'en',
      data: {
        layout: (english.layout ?? []).map((block) => (block.id === id ? form('en') : block)),
        _status: 'published',
      },
    })
  }

  return report
}
