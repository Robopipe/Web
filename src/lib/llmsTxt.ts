import { locales, type Locale } from '@/i18n/routing'

import { COMPANY_FACTS } from './companyFacts'
import type { IndexableDoc } from './indexable'
import { absoluteUrl, sectionPaths } from './paths'

export type LlmsTxtSettings = {
  siteName?: string | null
  /** site-settings.defaultSeo.description per locale. */
  descriptions: Partial<Record<Locale, string | null | undefined>>
  contactEmail?: string | null
  phone?: string | null
  /** site-settings.company */
  legalName?: string | null
  companyId?: string | null
  /** site-settings.contact.address: the office, in lines or comma-separated parts. */
  address?: string | null
  /** site-settings.socials URLs; the GitHub one is the open-source code. */
  socials?: string[]
}

const SECTIONS: {
  collection: IndexableDoc['collection']
  heading: string
  /** Listing page of the section, with its title per locale. */
  index?: { path: '/blog' | '/case-studies'; titles: Record<Locale, string> }
}[] = [
  { collection: 'pages', heading: 'Stránky / Pages' },
  {
    collection: 'case-studies',
    heading: 'Případové studie / Case studies',
    index: { path: '/case-studies', titles: { cs: 'Případové studie', en: 'Case studies' } },
  },
  {
    collection: 'posts',
    heading: 'Blog',
    index: { path: '/blog', titles: { cs: 'Blog', en: 'Blog' } },
  },
]

const isHome = (doc: IndexableDoc) => doc.collection === 'pages' && doc.locales.cs?.path === '/cs'

/** Home first, then by Czech title (English title when there is no Czech version). */
const sortPages = (docs: IndexableDoc[]): IndexableDoc[] =>
  [...docs].sort((a, b) => {
    if (isHome(a) !== isHome(b)) return isHome(a) ? -1 : 1
    const title = (d: IndexableDoc) => d.locales.cs?.title ?? d.locales.en?.title ?? ''
    return title(a).localeCompare(title(b), 'cs')
  })

const linesFor = (doc: IndexableDoc): string[] =>
  locales.flatMap((loc) => {
    const entry = doc.locales[loc]
    if (!entry) return []
    const link = `- [${entry.title}](${absoluteUrl(entry.path)})`
    return [entry.description ? `${link}: ${entry.description}` : link]
  })

/** Office address on one line, without the company name line. */
const addressLine = (address: string | null | undefined, legalName?: string | null) =>
  (address ?? '')
    .split(/\n|,/)
    .map((part) => part.trim())
    .filter((part) => part && part !== legalName)
    .join(', ')

/** Key company facts, so a model that reads only this file knows who Robopipe is (issue #40). */
const aboutLines = (settings: LlmsTxtSettings): string[] => {
  const github = settings.socials?.find((url) => /^https:\/\/github\.com\//.test(url))
  const office = addressLine(settings.address, settings.legalName)
  return [
    '## O firmě / About',
    `- Založeno / Founded: ${COMPANY_FACTS.foundingDate}`,
    ...(office ? [`- Kancelář / Office: ${office}`] : []),
    `- Mateřská firma / Parent company: ${COMPANY_FACTS.parent.name}`,
    `- Tým / Team: ${COMPANY_FACTS.numberOfEmployees}`,
    ...(github ? [`- Otevřený zdrojový kód / Open source: ${github}`] : []),
    `- Dokumentace / Documentation: ${COMPANY_FACTS.docs}`,
    '',
  ]
}

/**
 * /llms.txt in the llmstxt.org format: a company summary and links to every
 * indexable page, use case and post. Built from the same list as the sitemap.
 */
export const buildLlmsTxt = (docs: IndexableDoc[], settings: LlmsTxtSettings): string => {
  const out: string[] = [`# ${settings.siteName || 'Robopipe'}`, '']

  const summary = locales.map((loc) => settings.descriptions[loc]).filter(Boolean)
  if (summary.length) out.push(...summary.map((line) => `> ${line}`), '')

  out.push(...aboutLines(settings))

  for (const { collection, heading, index } of SECTIONS) {
    const inSection = docs.filter((doc) => doc.collection === collection)
    if (!inSection.length) continue
    const ordered = collection === 'pages' ? sortPages(inSection) : inSection
    const indexLines = index
      ? locales.map(
          (loc) => `- [${index.titles[loc]}](${absoluteUrl(sectionPaths(index.path)[loc])})`,
        )
      : []
    out.push(`## ${heading}`, ...indexLines, ...ordered.flatMap(linesFor), '')
  }

  const contact = [settings.contactEmail, settings.phone].filter(Boolean)
  const company = [settings.legalName, settings.companyId && `IČO ${settings.companyId}`].filter(
    Boolean,
  )
  if (contact.length || company.length) {
    out.push('## Kontakt / Contact')
    if (company.length) out.push(`- ${company.join(', ')}`)
    if (contact.length) out.push(`- ${contact.join(', ')}`)
    out.push('')
  }

  return out.join('\n')
}
