import { locales, type Locale } from '@/i18n/routing'

import type { IndexableDoc } from './indexable'
import { absoluteUrl } from './paths'

export type LlmsTxtSettings = {
  siteName?: string | null
  /** site-settings.defaultSeo.description per locale. */
  descriptions: Partial<Record<Locale, string | null | undefined>>
  contactEmail?: string | null
  phone?: string | null
}

const SECTIONS: { collection: IndexableDoc['collection']; heading: string }[] = [
  { collection: 'pages', heading: 'Stránky / Pages' },
  { collection: 'case-studies', heading: 'Případy užití / Use cases' },
  { collection: 'posts', heading: 'Blog' },
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

/**
 * /llms.txt in the llmstxt.org format: a company summary and links to every
 * indexable page, use case and post. Built from the same list as the sitemap.
 */
export const buildLlmsTxt = (docs: IndexableDoc[], settings: LlmsTxtSettings): string => {
  const out: string[] = [`# ${settings.siteName || 'Robopipe'}`, '']

  const summary = locales.map((loc) => settings.descriptions[loc]).filter(Boolean)
  if (summary.length) out.push(...summary.map((line) => `> ${line}`), '')

  for (const { collection, heading } of SECTIONS) {
    const inSection = docs.filter((doc) => doc.collection === collection)
    if (!inSection.length) continue
    const ordered = collection === 'pages' ? sortPages(inSection) : inSection
    out.push(`## ${heading}`, ...ordered.flatMap(linesFor), '')
  }

  const contact = [settings.contactEmail, settings.phone].filter(Boolean)
  if (contact.length) out.push('## Kontakt / Contact', `- ${contact.join(', ')}`, '')

  return out.join('\n')
}
