import fs from 'node:fs'
import path from 'node:path'
import type { Payload } from 'payload'

import type { Locale } from '@/i18n/routing'
import { markdownToLexical } from '@/jobs/markdown'
import type { CaseStudy, Footer, Header, Page } from '@/payload-types'

/**
 * Content for issue #2 (SEO and GEO): landing pages, the auto annotation page,
 * case study sections, FAQs, home page blocks, navigation, memberships and the
 * auto annotation blog draft. All copy lives in seed-assets/copy/seo-geo.
 *
 * Idempotent: existing documents are found and kept, fields that already have
 * a value are never overwritten. See docs/specs/2-seo-geo/architecture.md, 7.1.
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
  content: string
  steps: { heading: string; text: string; items: Pair[]; stats?: Pair[] }
  caseStudiesHeading: string
  faqHeading: string
  cta: { heading: string; text: string; button: string }
}

type LandingPage = {
  key: string
  image: string
  caseStudies: string[]
  faqs: string[]
} & Localized<LandingLocale>

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
}

type NavigationCopy = {
  renameLabels: Localized<{ from: string; to: string }>
  footerColumn: { title: Localized<string>; pages: string[] }
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
  payload: Payload,
  { status, dryRun = false }: SeoGeoOptions,
): Promise<SeoGeoReport> => {
  const report: SeoGeoReport = { created: [], updated: [], skipped: [] }
  const draft = status === 'draft'
  const write = !dryRun
  const md = (markdown: string) => markdownToLexical(payload.config, markdown)

  /* ------------------------- versions and publishing ------------------------ */

  type Versioned = 'pages' | 'case-studies'
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

  const landing = readJson<{ pages: LandingPage[] }>('landing-pages.json').pages
  const faqCopy = readJson<Record<string, FaqCopy>>('faqs.json')
  const caseStudyCopy = readJson<Record<string, CaseStudyCopy>>('case-studies.json')
  const home = readJson<HomeCopy>('home.json')
  const navigation = readJson<NavigationCopy>('navigation.json')

  /* --------------------------------- media --------------------------------- */

  const mediaIds = new Map<string, number>()
  const media = async (filename: string, alt: Localized<string>): Promise<number | undefined> => {
    if (mediaIds.has(filename)) return mediaIds.get(filename)
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

  const landingLayout = async (page: LandingPage, locale: Locale): Promise<Page['layout']> => {
    const c = page[locale]
    const id = (block: string) => `seo-geo-page-${page.key}-${block}`
    const image = await media(page.image, { cs: page.cs.title, en: page.en.title })
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
      {
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
      },
    ]
    if (caseStudies.length) {
      layout.push({
        id: id('case-studies'),
        blockType: 'caseStudyGrid',
        heading: c.caseStudiesHeading,
        caseStudies,
        limit: caseStudies.length,
      })
    }
    if (faqs.length) {
      layout.push({ id: id('faqs'), blockType: 'faqAccordion', heading: c.faqHeading, faqs })
    }
    layout.push({
      id: id('cta'),
      blockType: 'ctaBanner',
      heading: c.cta.heading,
      text: c.cta.text,
      links: [{ id: id('cta-link'), ...contactLink(c.cta.button) }],
    })
    return layout
  }

  const pageIds = new Map<string, number>()
  for (const page of landing) {
    const existing = await findPage(page.cs.slug, 'cs')
    if (existing) {
      pageIds.set(page.key, existing.id)
      managed.push({ collection: 'pages', id: existing.id, label: `page ${page.cs.slug}` })
      report.skipped.push(`page ${page.cs.slug}`)
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
    await saveDraft('pages', doc.id, 'en', {
      ...pageData('en'),
      layout: await landingLayout(page, 'en'),
    })
    pageIds.set(page.key, doc.id)
    managed.push({ collection: 'pages', id: doc.id, label: `page ${page.cs.slug}` })
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

  /* -------------------------------- globals -------------------------------- */

  // Globals have no drafts: they change only when publishing.
  if (draft) {
    report.skipped.push('globals header, footer, site-settings (draft mode)')
    return report
  }

  for (const doc of managed) {
    const { _status } = await latest(doc.collection, doc.id, 'cs')
    if (_status === 'published') continue
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

  // Footer: rename the case studies link, add the Solutions column.
  const columnId = 'seo-geo-solutions'
  const solutionLinks = (locale: Locale) =>
    navigation.footerColumn.pages.flatMap((key, i) => {
      const target = pageIds.get(key)
      const copy = landing.find((page) => page.key === key)
      if (!target || !copy) return []
      return [
        {
          id: `${columnId}-${i}`,
          link: { label: copy[locale].title, type: 'internal' as const, page: target },
        },
      ]
    })
  let footerChanged = false
  for (const locale of LOCALES) {
    const footer = await payload.findGlobal({
      slug: 'footer',
      locale,
      depth: 0,
      fallbackLocale: false,
    })
    const { from, to } = navigation.renameLabels[locale]
    const title = navigation.footerColumn.title[locale]
    let changed = false
    const columns: NonNullable<Footer['columns']> = (footer.columns ?? []).map((column) => {
      // The column exists from the other locale but has no text in this one yet.
      if (column.id === columnId && !column.title) {
        changed = true
        return { ...column, title, links: solutionLinks(locale) }
      }
      return {
        ...column,
        links: (column.links ?? []).map((item) => {
          if (item.link.label !== from) return item
          changed = true
          return { ...item, link: { ...item.link, label: to } }
        }),
      }
    })
    if (!columns.some((column) => column.id === columnId || column.title === title)) {
      changed = true
      columns.push({ id: columnId, title, links: solutionLinks(locale) })
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

  return report
}
