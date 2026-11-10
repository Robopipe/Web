import fs from 'node:fs'
import path from 'node:path'

import type { Locale } from '@/i18n/routing'
import { markdownToLexical } from '@/jobs/markdown'
import type { CaseStudy, Footer, Header, Page } from '@/payload-types'

import { nullIfNotFound, type SeoGeoClient } from './remoteClient'

/**
 * Content for issues #2 and #6 (SEO and GEO, stages 1 and 2): landing, task and
 * about pages, case study sections, FAQs, home page blocks, navigation,
 * memberships, solutions, company facts, pricing FAQs, the vision guide and
 * the auto annotation blog draft. All copy lives in seed-assets/copy/seo-geo.
 *
 * Idempotent: existing documents are found and kept, fields that already have
 * a value are never overwritten. See docs/specs/2-seo-geo/architecture.md, 7.1,
 * and docs/specs/6-seo-geo-stage2/architecture.md, 6.6.
 */

export type SeoGeoOptions = {
  /** draft: new draft versions only, published content and globals stay as they are. */
  status: 'draft' | 'published'
  dryRun?: boolean
}

export type SeoGeoReport = { created: string[]; updated: string[]; skipped: string[] }

type Localized<T> = Record<Locale, T>
type Pair = [string, string]

type LandingLocale = {
  title: string
  slug: string
  seo: { title: string; description: string }
  hero: { eyebrow: string; heading: string; text: string; button: string }
  /** Markdown file for the main content block. */
  content: string
  /** Markdown file for a second content block after the main one. */
  tasks?: string
  steps?: { heading: string; text: string; items: Pair[]; stats?: Pair[] }
  caseStudiesHeading?: string
  /** Pricing tiers from the pricing page (pricingTable with source "pricingPage"). */
  pricing?: { heading: string; text: string }
  faqHeading?: string
  /** Contact form with the sidebar (address, phone, company facts). */
  contact?: { heading: string; microcopy: string }
  cta?: { heading: string; text: string; button: string }
}

type LandingPage = {
  key: string
  /** Hero image. Without it the hero is centered. */
  image?: string
  caseStudies: string[]
  faqs: string[]
} & Localized<LandingLocale>

type LandingCopy = {
  pages: LandingPage[]
  /** Czech slugs of stage 1 pages that left the seed. Reported, never deleted. */
  obsolete: string[]
}

type FaqCopy = Localized<{ q: string; a: string }>

type CaseStudySections = Record<'problem' | 'solution' | 'result' | 'technique', string>
type CaseStudyCopy = { faqs: string[] } & Localized<CaseStudySections>

type HomeCopy = {
  /** New home SEO texts. A field changes only when it is empty or still has the replaceIf value. */
  seo: Localized<{
    title?: string
    description?: string
    replaceIf: { title?: string; description?: string }
  }>
  memberships: {
    blockName: string
    heading: Localized<string>
    items: { name: string; url: string; logo: string; logoOnDark: string }[]
  }
  autoAnnotation: {
    blockName: string
    image: string
    page: string
  } & Localized<{ heading: string; text: string; steps: Pair[]; button: string }>
  /** industryCards block with source "solutions", after the first industryCards block. */
  solutions: { blockName: string } & Localized<{ heading: string; text: string }>
}

type NavigationCopy = {
  renameLabels: Localized<{ from: string; to: string }>
  /** Footer column added by stage 1. Removed in published mode (site-settings.solutions replaces it). */
  removeFooterColumn: Localized<string>
  /** Link to a landing page, added to a footer column once the page is published. */
  aboutLink: { column: Localized<string>; page: string }
}

type SettingsCopy = {
  /** Landing page keys in display order. */
  solutions: string[]
  company: {
    legalName: string
    companyId: string
    registration: Localized<string>
    /** Values that may be replaced, e.g. the old footer copyright copied by the migration. */
    replaceIf?: { legalName?: string }
  }
}

type ReplaceIf = { replaceIf: string; value: string }

type ExistingPagesCopy = {
  pricing: { slug: string; faqs: string[] }
  guide: { slug: string; heading: ReplaceIf; seoTitle: ReplaceIf; paragraph: string }
}

type PostCopy = {
  title: string
  slug: string
  excerpt: string
  seoTitle: string
  seoDescription: string
  body: string
}

const ASSETS = path.resolve(process.cwd(), 'seed-assets')
const COPY = path.join(ASSETS, 'copy', 'seo-geo')
const LOCALES: Locale[] = ['cs', 'en']
const CASE_STUDY_SECTIONS = ['problem', 'solution', 'result', 'technique'] as const

const readJson = <T>(file: string): T => JSON.parse(fs.readFileSync(path.join(COPY, file), 'utf8'))
const readText = (file: string): string => fs.readFileSync(path.join(COPY, file), 'utf8')

/** Copy markers that must never reach a published page. */
export const COPY_MARKERS = ['[doplnit Filip]', '[ověřit]'] as const

/** True when the document (any shape, all locales) still contains a copy marker. */
export const hasCopyMarkers = (value: unknown): boolean => {
  const text = JSON.stringify(value) ?? ''
  return COPY_MARKERS.some((marker) => text.includes(marker))
}

type LexicalNode = { type?: string; tag?: string; text?: string; children?: LexicalNode[] }

const plainText = (node: LexicalNode): string =>
  node.text ?? (node.children ?? []).map(plainText).join('')

/** Splits the `---` header (key: value lines) from the markdown body. */
export const parseFrontmatter = (source: string): PostCopy => {
  const match = source.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/)
  if (!match) throw new Error('Post copy needs a --- frontmatter header.')
  const meta = Object.fromEntries(
    match[1].split('\n').map((line) => {
      const i = line.indexOf(':')
      return [line.slice(0, i).trim(), line.slice(i + 1).trim()]
    }),
  )
  return { ...(meta as Omit<PostCopy, 'body'>), body: match[2].trim() }
}

const isEmptyRichText = (value: unknown): boolean => {
  const root = (value as { root?: { children?: unknown[] } } | null | undefined)?.root
  return !root?.children?.length
}

const idOf = (value: unknown): number | undefined =>
  typeof value === 'number' ? value : (value as { id?: number } | null)?.id

/**
 * Applies the SEO and GEO content. Run twice, it changes nothing the second time.
 */
export const applySeoGeo = async (
  payload: SeoGeoClient,
  { status, dryRun = false }: SeoGeoOptions,
): Promise<SeoGeoReport> => {
  const report: SeoGeoReport = { created: [], updated: [], skipped: [] }
  const draft = status === 'draft'
  const write = !dryRun
  const md = (markdown: string) => markdownToLexical(payload.config, markdown)

  /* ------------------------- versions and publishing ------------------------ */

  type Versioned = 'pages' | 'case-studies' | 'posts'
  // Documents this script manages. Published mode publishes their latest draft.
  const managed: { collection: Versioned; id: number; label: string }[] = []

  const latest = <C extends Versioned>(collection: C, id: number, locale: Locale | 'all') =>
    payload.findByID({ collection, id, locale, draft: true, depth: 0, fallbackLocale: false })

  /** Changes are always saved as a new draft version. The published version stays as it is. */
  const saveDraft = async (
    collection: Versioned,
    id: number,
    locale: Locale,
    data: Record<string, unknown>,
  ) => {
    if (write) {
      await payload.update({
        collection,
        id,
        locale,
        draft: true,
        data: { ...data, _status: 'draft' },
      })
    }
  }

  /**
   * Publishes the latest draft as it is. For versioned collections Payload
   * builds an update on the latest version, so only the status changes.
   */
  const publishLatest = async (collection: Versioned, id: number) => {
    await payload.update({ collection, id, data: { _status: 'published' } })
  }

  const { pages: landing, obsolete } = readJson<LandingCopy>('landing-pages.json')
  const faqCopy = readJson<Record<string, FaqCopy>>('faqs.json')
  const caseStudyCopy = readJson<Record<string, CaseStudyCopy>>('case-studies.json')
  const home = readJson<HomeCopy>('home.json')
  const navigation = readJson<NavigationCopy>('navigation.json')
  const settingsCopy = readJson<SettingsCopy>('settings.json')
  const existingPages = readJson<ExistingPagesCopy>('existing-pages.json')

  /* --------------------------------- media --------------------------------- */

  // A dry run creates nothing, so planned media and FAQs have no id. List each once.
  const planned = new Set<string>()
  const mediaIds = new Map<string, number>()
  const media = async (filename: string, alt: Localized<string>): Promise<number | undefined> => {
    if (mediaIds.has(filename)) return mediaIds.get(filename)
    if (planned.has(`media ${filename}`)) return undefined
    const found = await payload.find({
      collection: 'media',
      where: { filename: { equals: filename } },
      limit: 1,
      depth: 0,
    })
    let id = found.docs[0]?.id
    if (id) {
      report.skipped.push(`media ${filename}`)
    } else {
      report.created.push(`media ${filename}`)
      planned.add(`media ${filename}`)
      if (write) {
        const doc = await payload.create({
          collection: 'media',
          data: { alt: alt.cs },
          filePath: path.join(ASSETS, 'img', filename),
        })
        await payload.update({
          collection: 'media',
          id: doc.id,
          locale: 'en',
          data: { alt: alt.en },
        })
        id = doc.id
      }
    }
    if (id) mediaIds.set(filename, id)
    return id
  }

  /* ---------------------------------- FAQs --------------------------------- */

  // The faqs collection has no key field. The Czech question identifies a FAQ.
  const faqIds = new Map<string, number>()
  const faq = async (key: string): Promise<number | undefined> => {
    if (faqIds.has(key)) return faqIds.get(key)
    if (planned.has(`faq ${key}`)) return undefined
    const copy = faqCopy[key]
    if (!copy) throw new Error(`faqs.json has no entry "${key}".`)
    const found = await payload.find({
      collection: 'faqs',
      where: { question: { equals: copy.cs.q } },
      locale: 'cs',
      limit: 1,
      depth: 0,
    })
    let id = found.docs[0]?.id
    if (id) {
      report.skipped.push(`faq ${key}`)
    } else {
      report.created.push(`faq ${key}`)
      planned.add(`faq ${key}`)
      if (write) {
        const doc = await payload.create({
          collection: 'faqs',
          locale: 'cs',
          data: { question: copy.cs.q, answer: await md(copy.cs.a) },
        })
        await payload.update({
          collection: 'faqs',
          id: doc.id,
          locale: 'en',
          data: { question: copy.en.q, answer: await md(copy.en.a) },
        })
        id = doc.id
      }
    }
    if (id) faqIds.set(key, id)
    return id
  }
  const faqList = async (keys: string[]) =>
    (await Promise.all(keys.map(faq))).filter((id): id is number => id !== undefined)

  /* ------------------------------ case studies ----------------------------- */

  const caseStudyIds = new Map<string, number>()
  const findCaseStudy = async (enSlug: string): Promise<CaseStudy | undefined> => {
    const found = await payload.find({
      collection: 'case-studies',
      where: { slug: { equals: enSlug } },
      locale: 'en',
      draft: true,
      limit: 1,
      depth: 0,
    })
    return found.docs[0]
  }

  for (const [enSlug, copy] of Object.entries(caseStudyCopy)) {
    const study = await findCaseStudy(enSlug)
    if (!study) {
      report.skipped.push(`case study ${enSlug} (not found)`)
      continue
    }
    caseStudyIds.set(enSlug, study.id)
    managed.push({ collection: 'case-studies', id: study.id, label: `case study ${enSlug}` })
    const current = await latest('case-studies', study.id, 'all')
    const faqs = await faqList(copy.faqs)
    let changed = false
    for (const locale of LOCALES) {
      const data: Record<string, unknown> = {}
      for (const section of CASE_STUDY_SECTIONS) {
        const value = (current[section] as unknown as Record<string, unknown> | null)?.[locale]
        if (isEmptyRichText(value)) data[section] = await md(copy[locale][section])
      }
      if (locale === 'cs' && !current.faqs?.length && faqs.length) data.faqs = faqs
      if (!Object.keys(data).length) continue
      changed = true
      await saveDraft('case-studies', study.id, locale, data)
    }
    report[changed ? 'updated' : 'skipped'].push(`case study ${enSlug}`)
  }

  /* --------------------------------- pages --------------------------------- */

  const findPage = async (slug: string, locale: Locale): Promise<Page | undefined> => {
    const found = await payload.find({
      collection: 'pages',
      where: { slug: { equals: slug } },
      locale,
      draft: true,
      limit: 1,
      depth: 0,
    })
    return found.docs[0]
  }

  const contactPage = await findPage('kontakt', 'cs')
  const contactLink = (label: string) =>
    contactPage
      ? { link: { label, type: 'internal' as const, page: contactPage.id } }
      : { link: { label, type: 'external' as const, url: '/cs/kontakt' } }

  /**
   * Blocks in this order: hero, content, tasks, steps, case studies, pricing,
   * FAQs, contact form, CTA. An optional block without copy is left out.
   */
  const landingLayout = async (page: LandingPage, locale: Locale): Promise<Page['layout']> => {
    const c = page[locale]
    const id = (block: string) => `seo-geo-page-${page.key}-${block}`
    const image = page.image
      ? await media(page.image, { cs: page.cs.title, en: page.en.title })
      : undefined
    const caseStudies = page.caseStudies
      .map((slug) => caseStudyIds.get(slug))
      .filter((studyId): studyId is number => studyId !== undefined)
    const faqs = await faqList(page.faqs)
    const layout: Page['layout'] = [
      {
        id: id('hero'),
        blockType: 'hero',
        eyebrow: c.hero.eyebrow,
        heading: c.hero.heading,
        text: c.hero.text,
        links: [{ id: id('hero-link'), ...contactLink(c.hero.button) }],
        image,
        variant: image ? 'split' : 'centered',
      },
      {
        id: id('content'),
        blockType: 'content',
        content: await md(readText(c.content)),
        width: 'narrow',
      },
    ]
    if (c.tasks) {
      layout.push({
        id: id('tasks'),
        blockType: 'content',
        content: await md(readText(c.tasks)),
        width: 'narrow',
      })
    }
    if (c.steps) {
      layout.push({
        id: id('steps'),
        blockType: 'processSteps',
        heading: c.steps.heading,
        text: c.steps.text,
        steps: c.steps.items.map(([title, text], i) => ({ id: id(`step-${i}`), title, text })),
        stats: (c.steps.stats ?? []).map(([value, label], i) => ({
          id: id(`stat-${i}`),
          value,
          label,
        })),
      })
    }
    if (caseStudies.length && c.caseStudiesHeading) {
      layout.push({
        id: id('case-studies'),
        blockType: 'caseStudyGrid',
        heading: c.caseStudiesHeading,
        caseStudies,
        limit: caseStudies.length,
      })
    }
    if (c.pricing) {
      layout.push({
        id: id('pricing'),
        blockType: 'pricingTable',
        source: 'pricingPage',
        heading: c.pricing.heading,
        text: c.pricing.text,
      })
    }
    if (faqs.length && c.faqHeading) {
      layout.push({ id: id('faqs'), blockType: 'faqAccordion', heading: c.faqHeading, faqs })
    }
    if (c.contact) {
      layout.push({
        id: id('contact'),
        blockType: 'contactForm',
        heading: c.contact.heading,
        microcopy: c.contact.microcopy,
        showSidebar: true,
      })
    }
    if (c.cta) {
      layout.push({
        id: id('cta'),
        blockType: 'ctaBanner',
        heading: c.cta.heading,
        text: c.cta.text,
        links: [{ id: id('cta-link'), ...contactLink(c.cta.button) }],
      })
    }
    return layout
  }

  type Block = NonNullable<Page['layout']>[number]

  /**
   * Adds the blocks of `target` whose id is missing in `current`, each right
   * after the block that precedes it in `target`. Existing blocks stay as they are.
   */
  const withMissingBlocks = (current: Block[], target: Block[]): Block[] => {
    const out = [...current]
    target.forEach((block, i) => {
      if (out.some((b) => b.id === block.id)) return
      const before = target
        .slice(0, i)
        .reverse()
        .map((b) => out.findIndex((o) => o.id === b.id))
        .find((index) => index !== -1)
      out.splice(before === undefined ? 0 : before + 1, 0, block)
    })
    return out
  }

  const pageIds = new Map<string, number>()
  for (const page of landing) {
    const existing = await findPage(page.cs.slug, 'cs')
    if (existing) {
      pageIds.set(page.key, existing.id)
      managed.push({ collection: 'pages', id: existing.id, label: `page ${page.cs.slug}` })
      const targets = { cs: await landingLayout(page, 'cs'), en: await landingLayout(page, 'en') }
      const current = (await latest('pages', existing.id, 'cs')).layout ?? []
      const missing = targets.cs.filter((block) => !current.some((b) => b.id === block.id))
      if (!missing.length) {
        report.skipped.push(`page ${page.cs.slug}`)
        continue
      }
      report.updated.push(`page ${page.cs.slug} (blocks ${missing.map((b) => b.id).join(', ')})`)
      const missingIds = new Set(missing.map((block) => block.id))
      for (const locale of LOCALES) {
        // Re-read in this locale so existing blocks keep their values in it. Payload
        // copies the Czech values of a new block to English, so new blocks are replaced.
        const localeLayout = ((await latest('pages', existing.id, locale)).layout ?? []).filter(
          (block) => !missingIds.has(block.id),
        )
        await saveDraft('pages', existing.id, locale, {
          layout: withMissingBlocks(localeLayout, targets[locale]),
        })
      }
      continue
    }
    report.created.push(`page ${page.cs.slug}`)
    // Built before the write check, so a dry run also lists the FAQs and media.
    const layouts = { cs: await landingLayout(page, 'cs'), en: await landingLayout(page, 'en') }
    if (!write) continue
    const pageData = (locale: Locale) => ({
      title: page[locale].title,
      slug: page[locale].slug,
      seo: { title: page[locale].seo.title, description: page[locale].seo.description },
    })
    const doc = await payload.create({
      collection: 'pages',
      locale: 'cs',
      draft: true,
      data: { ...pageData('cs'), layout: layouts.cs, _status: 'draft' },
    })
    await saveDraft('pages', doc.id, 'en', { ...pageData('en'), layout: layouts.en })
    pageIds.set(page.key, doc.id)
    managed.push({ collection: 'pages', id: doc.id, label: `page ${page.cs.slug}` })
  }

  for (const slug of obsolete) {
    // Stage 1 pages that left the seed. Never deleted here, see architecture 11.3.
    if (await findPage(slug, 'cs')) report.skipped.push(`obsolete: ${slug}`)
  }

  /* ------------------------------- home page ------------------------------- */

  const homePage = await findPage('home', 'cs')
  if (!homePage) {
    report.skipped.push('home page (not found)')
  } else {
    const blocks = (homePage.layout ?? []).map((block) => ({ ...block }))
    const has = (name: string) => blocks.some((block) => block.blockName === name)
    const addedBlocks: { id: string; locale: Record<Locale, Record<string, unknown>> }[] = []

    if (!has(home.memberships.blockName)) {
      const id = home.memberships.blockName
      const at = blocks.findIndex((block) => block.blockType === 'logoCloud')
      blocks.splice(at === -1 ? 1 : at + 1, 0, {
        id,
        blockType: 'logoCloud',
        blockName: id,
        source: 'memberships',
        heading: home.memberships.heading.cs,
      })
      addedBlocks.push({
        id,
        locale: {
          cs: { heading: home.memberships.heading.cs },
          en: { heading: home.memberships.heading.en },
        },
      })
    }

    if (!has(home.autoAnnotation.blockName)) {
      const id = home.autoAnnotation.blockName
      const aa = home.autoAnnotation
      const target = pageIds.get(aa.page)
      const stepsFor = (locale: Locale) =>
        aa[locale].steps.map(([title, text], i) => ({ id: `home-${id}-step-${i}`, title, text }))
      const ctaFor = (locale: Locale) => ({
        link: target
          ? { label: aa[locale].button, type: 'internal' as const, page: target }
          : { label: aa[locale].button, type: 'external' as const, url: `/${locale}` },
      })
      const at = blocks.findIndex((block) => block.blockType === 'testimonialBar')
      blocks.splice(at === -1 ? blocks.length : at, 0, {
        id,
        blockType: 'processSteps',
        blockName: id,
        heading: aa.cs.heading,
        text: aa.cs.text,
        image: await media(aa.image, { cs: aa.cs.heading, en: aa.en.heading }),
        steps: stepsFor('cs'),
        cta: ctaFor('cs'),
      })
      const localized = (locale: Locale) => ({
        heading: aa[locale].heading,
        text: aa[locale].text,
        steps: stepsFor(locale),
        cta: ctaFor(locale),
      })
      addedBlocks.push({ id, locale: { cs: localized('cs'), en: localized('en') } })
    }

    if (!has(home.solutions.blockName)) {
      const id = home.solutions.blockName
      const at = blocks.findIndex((block) => block.blockType === 'industryCards')
      blocks.splice(at === -1 ? blocks.length : at + 1, 0, {
        id,
        blockType: 'industryCards',
        blockName: id,
        source: 'solutions',
        heading: home.solutions.cs.heading,
        text: home.solutions.cs.text,
      })
      addedBlocks.push({
        id,
        locale: {
          cs: { heading: home.solutions.cs.heading, text: home.solutions.cs.text },
          en: { heading: home.solutions.en.heading, text: home.solutions.en.text },
        },
      })
    }

    managed.push({ collection: 'pages', id: homePage.id, label: 'home page' })
    const current = await latest('pages', homePage.id, 'all')
    const seoFor = (locale: Locale) => {
      const seo = current.seo as unknown as Record<
        'title' | 'description',
        Record<string, string> | null
      >
      const copy = home.seo[locale]
      const out: Record<string, string> = {}
      for (const field of ['title', 'description'] as const) {
        const next = copy[field]
        const value = seo?.[field]?.[locale]
        if (next && (!value || value === copy.replaceIf[field]) && value !== next) out[field] = next
      }
      return out
    }

    for (const locale of LOCALES) {
      const seo = seoFor(locale)
      if (!addedBlocks.length && !Object.keys(seo).length) continue
      // Re-read in this locale so existing blocks keep their values in it.
      const localeDoc = await latest('pages', homePage.id, locale)
      const layout = blocks.map((block) => {
        const added = addedBlocks.find((b) => b.id === block.id)
        if (added) return { ...block, ...added.locale[locale] }
        return localeDoc.layout?.find((b) => b.id === block.id) ?? block
      })
      await saveDraft('pages', homePage.id, locale, {
        layout,
        ...(Object.keys(seo).length ? { seo: { ...localeDoc.seo, ...seo } } : {}),
      })
    }
    const changed = addedBlocks.length > 0 || LOCALES.some((l) => Object.keys(seoFor(l)).length > 0)
    report[changed ? 'updated' : 'skipped'].push('home page')
  }

  /* ---------------------------- blog post draft ---------------------------- */

  const post = {
    cs: parseFrontmatter(readText('post-auto-annotation.cs.md')),
    en: parseFrontmatter(readText('post-auto-annotation.md')),
  }
  const existingPost = await payload.find({
    collection: 'posts',
    where: { slug: { equals: post.cs.slug } },
    locale: 'cs',
    draft: true,
    limit: 1,
    depth: 0,
  })
  if (existingPost.docs.length) {
    report.skipped.push(`post ${post.cs.slug}`)
  } else {
    report.created.push(`post ${post.cs.slug} (draft)`)
    if (write) {
      const heroImage = await media(home.autoAnnotation.image, {
        cs: post.cs.title,
        en: post.en.title,
      })
      const postData = async (locale: Locale) => ({
        title: post[locale].title,
        slug: post[locale].slug,
        excerpt: post[locale].excerpt,
        content: await md(post[locale].body),
        seo: { title: post[locale].seoTitle, description: post[locale].seoDescription },
        // Never published by this script. Filip approves the text first.
        _status: 'draft' as const,
      })
      const doc = await payload.create({
        collection: 'posts',
        locale: 'cs',
        draft: true,
        data: { ...(await postData('cs')), heroImage },
      })
      await payload.update({
        collection: 'posts',
        id: doc.id,
        locale: 'en',
        draft: true,
        data: await postData('en'),
      })
    }
  }

  /* ------------------------------ pricing FAQs ----------------------------- */

  // Appended to the first FAQ block of the pricing page. The published version
  // decides whether the page is managed, so a draft run is published later.
  const pricingPage = await findPage(existingPages.pricing.slug, 'cs')
  if (!pricingPage) {
    report.skipped.push(`page ${existingPages.pricing.slug} (not found)`)
  } else {
    const wanted = await faqList(existingPages.pricing.faqs)
    const faqBlockOf = (doc: Page) =>
      doc.layout?.find((block) => block.blockType === 'faqAccordion')
    const missingIn = (doc: Page) => {
      const block = faqBlockOf(doc)
      if (block?.blockType !== 'faqAccordion') return []
      const present = (block.faqs ?? []).map(idOf)
      return wanted.filter((faqId) => !present.includes(faqId))
    }
    const current = await latest('pages', pricingPage.id, 'cs')
    const block = faqBlockOf(current)
    const published = await payload
      .findByID({ collection: 'pages', id: pricingPage.id, locale: 'cs', depth: 0, draft: false })
      .catch(nullIfNotFound)
    const toAdd = missingIn(current)
    if (block?.blockType !== 'faqAccordion') {
      report.skipped.push(`page ${existingPages.pricing.slug} FAQs (no FAQ block)`)
    } else if (!write && wanted.length < existingPages.pricing.faqs.length) {
      // Dry run: the new FAQs do not exist yet, so they have no id to compare.
      const count = existingPages.pricing.faqs.length - wanted.length + toAdd.length
      report.updated.push(`page ${existingPages.pricing.slug} FAQs (+${count})`)
    } else if (toAdd.length) {
      report.updated.push(`page ${existingPages.pricing.slug} FAQs (+${toAdd.length})`)
      // The FAQ relation is not localized. One locale carries the change to both.
      await saveDraft('pages', pricingPage.id, 'cs', {
        layout: (current.layout ?? []).map((b) =>
          b.id === block.id ? { ...block, faqs: [...(block.faqs ?? []).map(idOf), ...toAdd] } : b,
        ),
      })
    } else {
      report.skipped.push(`page ${existingPages.pricing.slug} FAQs`)
    }
    if (toAdd.length || (published && missingIn(published).length)) {
      managed.push({
        collection: 'pages',
        id: pricingPage.id,
        label: `page ${existingPages.pricing.slug}`,
      })
    }
  }

  /* ------------------------------ vision guide ----------------------------- */

  // Czech only. Changes the first H2 and seo.title only from their exact
  // current value and adds one paragraph at the end of the first section.
  const guideCopy = existingPages.guide
  const guideSearch = await payload.find({
    collection: 'posts',
    where: { slug: { equals: guideCopy.slug } },
    locale: 'cs',
    draft: true,
    limit: 1,
    depth: 0,
  })
  const guide = guideSearch.docs[0]
  if (!guide) {
    report.skipped.push(`post ${guideCopy.slug} (not found)`)
  } else {
    const paragraph = (await md(readText(guideCopy.paragraph))).root.children as LexicalNode[]
    const paragraphStart = paragraph.map(plainText).join(' ').slice(0, 60)
    const pending = (doc: { content?: unknown; seo?: { title?: string | null } | null }) => {
      const nodes = ((doc.content as { root?: LexicalNode } | null)?.root?.children ??
        []) as LexicalNode[]
      const h2s = nodes.flatMap((node, i) =>
        node.type === 'heading' && node.tag === 'h2' ? [i] : [],
      )
      return {
        nodes,
        h2s,
        heading: h2s.length > 0 && plainText(nodes[h2s[0]]) === guideCopy.heading.replaceIf,
        paragraph: !nodes.map(plainText).join(' ').includes(paragraphStart),
        seoTitle: doc.seo?.title === guideCopy.seoTitle.replaceIf,
      }
    }
    const isPending = (p: ReturnType<typeof pending>) => p.heading || p.paragraph || p.seoTitle

    const current = await payload.findByID({
      collection: 'posts',
      id: guide.id,
      locale: 'cs',
      draft: true,
      depth: 0,
      fallbackLocale: false,
    })
    const todo = pending(current)
    if (isPending(todo)) {
      report.updated.push(
        `post ${guideCopy.slug} (${(['heading', 'paragraph', 'seoTitle'] as const).filter((k) => todo[k]).join(', ')})`,
      )
      const nodes = todo.nodes.map((node, i) =>
        todo.heading && i === todo.h2s[0]
          ? { ...node, children: [{ ...node.children?.[0], text: guideCopy.heading.value }] }
          : node,
      )
      // Last node of the first section: right before the second H2 (or at the end).
      if (todo.paragraph) nodes.splice(todo.h2s[1] ?? nodes.length, 0, ...paragraph)
      const content = current.content as unknown as { root: Record<string, unknown> }
      if (write) {
        await payload.update({
          collection: 'posts',
          id: guide.id,
          locale: 'cs',
          draft: true,
          data: {
            content: {
              ...content,
              root: { ...content.root, children: nodes },
            } as typeof current.content,
            ...(todo.seoTitle ? { seo: { ...current.seo, title: guideCopy.seoTitle.value } } : {}),
            _status: 'draft',
          },
        })
      }
    } else {
      report.skipped.push(`post ${guideCopy.slug}`)
    }
    const published = await payload
      .findByID({ collection: 'posts', id: guide.id, locale: 'cs', depth: 0, draft: false })
      .catch(nullIfNotFound)
    if (isPending(todo) || (published && isPending(pending(published)))) {
      managed.push({ collection: 'posts', id: guide.id, label: `post ${guideCopy.slug}` })
    }
  }

  /* -------------------------------- globals -------------------------------- */

  // Globals have no drafts: they change only when publishing.
  if (draft) {
    report.skipped.push('globals header, footer, site-settings (draft mode)')
    return report
  }

  for (const doc of managed) {
    const current = await latest(doc.collection, doc.id, 'all')
    if (current._status === 'published') continue
    if (hasCopyMarkers(current)) {
      // Never publish copy that still waits for a fact. It stays a draft.
      report.skipped.push(`draft (markers): ${doc.label}`)
      continue
    }
    report.updated.push(`${doc.label} published`)
    if (write) await publishLatest(doc.collection, doc.id)
  }

  // Header: rename the case studies nav label.
  const header = await payload.findGlobal({ slug: 'header', locale: 'all', depth: 0 })
  const navLabels = (header.navItems ?? []) as unknown as {
    id: string
    link: { label: Record<string, string> }
  }[]
  let headerChanged = false
  for (const locale of LOCALES) {
    const { from, to } = navigation.renameLabels[locale]
    if (!navLabels.some((item) => item.link.label?.[locale] === from)) continue
    headerChanged = true
    if (!write) continue
    const localeHeader = await payload.findGlobal({
      slug: 'header',
      locale,
      depth: 0,
      fallbackLocale: false,
    })
    await payload.updateGlobal({
      slug: 'header',
      locale,
      data: {
        navItems: (localeHeader.navItems ?? []).map((item) =>
          item.link.label === from ? { ...item, link: { ...item.link, label: to } } : item,
        ),
      } as Partial<Header>,
    })
  }
  report[headerChanged ? 'updated' : 'skipped'].push('header navigation label')

  // Footer: rename the case studies link, remove the stage 1 Solutions column
  // (the layout renders it from site-settings.solutions), link the about page.
  const allFooter = await payload.findGlobal({ slug: 'footer', locale: 'all', depth: 0 })
  type LocalizedTitle = Partial<Record<Locale, string | null>> | null | undefined
  const titleIn = (column: unknown, locale: Locale) =>
    ((column as { title?: LocalizedTitle }).title ?? {})[locale]
  const columnIdOf = (titles: Localized<string>) =>
    (allFooter.columns ?? []).find((column) =>
      LOCALES.every((locale) => titleIn(column, locale) === titles[locale]),
    )?.id
  const removeColumnId = columnIdOf(navigation.removeFooterColumn)
  const aboutColumnId = columnIdOf(navigation.aboutLink.column)
  const aboutKey = navigation.aboutLink.page
  const aboutId = pageIds.get(aboutKey)
  const aboutCopy = landing.find((page) => page.key === aboutKey)
  const aboutPublished =
    aboutId !== undefined && (await latest('pages', aboutId, 'cs'))._status === 'published'
  const aboutLinkId = `seo-geo-${aboutKey}-link`

  let footerChanged = false
  for (const locale of LOCALES) {
    const footer = await payload.findGlobal({
      slug: 'footer',
      locale,
      depth: 0,
      fallbackLocale: false,
    })
    const { from, to } = navigation.renameLabels[locale]
    let changed = false
    const columns: NonNullable<Footer['columns']> = []
    for (const column of footer.columns ?? []) {
      if (removeColumnId && column.id === removeColumnId) {
        changed = true
        continue
      }
      const links = (column.links ?? []).map((item) => {
        if (item.link.label === from) {
          changed = true
          return { ...item, link: { ...item.link, label: to } }
        }
        // The link exists from the other locale but has no label in this one yet.
        if (item.id === aboutLinkId && !item.link.label && aboutCopy) {
          changed = true
          return { ...item, link: { ...item.link, label: aboutCopy[locale].title } }
        }
        return item
      })
      const linksAbout = links.some((item) => idOf(item.link.page) === aboutId)
      if (column.id === aboutColumnId && aboutPublished && aboutCopy && !linksAbout) {
        changed = true
        links.push({
          id: aboutLinkId,
          link: { label: aboutCopy[locale].title, type: 'internal', page: aboutId },
        })
      }
      columns.push({ ...column, links })
    }
    if (!changed) continue
    footerChanged = true
    if (write) await payload.updateGlobal({ slug: 'footer', locale, data: { columns } })
  }
  report[footerChanged ? 'updated' : 'skipped'].push('footer')

  // Site settings: memberships (not localized).
  const settings = await payload.findGlobal({ slug: 'site-settings', depth: 0 })
  const memberships = [...(settings.memberships ?? [])]
  let membershipsChanged = false
  for (const item of home.memberships.items) {
    if (memberships.some((m) => m.name === item.name)) continue
    membershipsChanged = true
    const alt = { cs: item.name, en: item.name }
    const logo = await media(item.logo, alt)
    const logoOnDark = await media(item.logoOnDark, alt)
    if (logo) memberships.push({ name: item.name, url: item.url, logo, logoOnDark })
  }
  report[membershipsChanged ? 'updated' : 'skipped'].push('site-settings memberships')
  if (membershipsChanged && write) {
    await payload.updateGlobal({
      slug: 'site-settings',
      data: {
        memberships: memberships.map((m) => ({
          ...m,
          logo: idOf(m.logo)!,
          logoOnDark: idOf(m.logoOnDark),
        })),
      },
    })
  }

  // Site settings: solutions and company facts. Written only while empty.
  const current = await payload.findGlobal({ slug: 'site-settings', locale: 'all', depth: 0 })
  const solutions = settingsCopy.solutions.flatMap((key) => {
    const pageId = pageIds.get(key)
    return pageId === undefined ? [] : [pageId]
  })
  const settingsData: Record<string, unknown> = {}
  if (!current.solutions?.length && solutions.length) settingsData.solutions = solutions
  const company = { ...current.company } as Record<string, unknown>
  const registration = (company.registration ?? {}) as Partial<Record<Locale, string | null>>
  let companyChanged = false
  for (const field of ['legalName', 'companyId'] as const) {
    const replaceable =
      field === 'legalName' && company[field] === settingsCopy.company.replaceIf?.legalName
    if (company[field] && !replaceable) continue
    if (company[field] === settingsCopy.company[field]) continue
    company[field] = settingsCopy.company[field]
    companyChanged = true
  }
  const registrationLocales = LOCALES.filter((locale) => !registration[locale])
  report[settingsData.solutions ? 'updated' : 'skipped'].push('site-settings solutions')
  report[companyChanged || registrationLocales.length ? 'updated' : 'skipped'].push(
    'site-settings company',
  )
  if (!write) return report
  for (const locale of LOCALES) {
    // verification is never written here. Arthur sets the tokens through the API.
    const data: Record<string, unknown> = locale === 'cs' ? { ...settingsData } : {}
    if (registrationLocales.includes(locale) || (locale === 'cs' && companyChanged)) {
      data.company = {
        legalName: company.legalName,
        companyId: company.companyId,
        registration: registrationLocales.includes(locale)
          ? settingsCopy.company.registration[locale]
          : registration[locale],
      }
    }
    if (Object.keys(data).length)
      await payload.updateGlobal({ slug: 'site-settings', locale, data })
  }

  return report
}
