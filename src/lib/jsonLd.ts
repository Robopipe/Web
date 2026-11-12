import { convertLexicalToPlaintext } from '@payloadcms/richtext-lexical/plaintext'

import type { Locale } from '@/i18n/routing'
import type {
  CaseStudy,
  Faq,
  Media,
  Page,
  Post,
  PricingTableBlock,
  SiteSetting,
  Video,
} from '@/payload-types'

import { COMPANY_FACTS } from './companyFacts'
import { ogImageUrl } from './meta'
import { absoluteUrl, SERVER_URL } from './paths'
import { isoDuration, youTubeId, youTubeWatchUrl } from './youtube'

/**
 * schema.org structured data built from the data a page already renders.
 * Pure functions, no database access. `JsonLd` serialises the result.
 */

export type JsonLdObject = { '@context'?: string; '@type': string; [key: string]: unknown }

const CONTEXT = 'https://schema.org'
export const ORGANIZATION_ID = `${SERVER_URL}/#organization`
export const WEBSITE_ID = `${SERVER_URL}/#website`
const organizationRef = { '@id': ORGANIZATION_ID }

const IN_LANGUAGE: Record<Locale, string> = { cs: 'cs-CZ', en: 'en' }

/** Square PNG of the wordmark in public/, for Organization.logo (issue #40). */
export const LOGO_PATH = '/logo.png'

/** Drops undefined, null, empty strings and empty arrays so the output stays minimal. */
const compact = <T extends Record<string, unknown>>(obj: T): T =>
  Object.fromEntries(
    Object.entries(obj).filter(
      ([, v]) => v !== undefined && v !== null && v !== '' && !(Array.isArray(v) && !v.length),
    ),
  ) as T

const isPopulated = <T>(value: T | number | null | undefined): value is T =>
  !!value && typeof value !== 'number'

const COUNTRY_CODES: [RegExp, string][] = [
  [/^(czech republic|czechia|česká republika|česko)$/i, 'CZ'],
]
const POSTCODE_LINE = /^(\d{3}\s?\d{2})\s+(.+)$/

/**
 * Site-settings address text (lines or comma-separated parts) as a schema.org
 * PostalAddress. The line with the postcode gives postalCode and locality, the
 * line before it the street. A known country name becomes its ISO code. Text
 * without a postcode stays in streetAddress as it is.
 */
export const postalAddressLd = (
  text: string | null | undefined,
  legalName?: string | null,
): JsonLdObject | undefined => {
  const parts = (text ?? '')
    .split(/\n|,/)
    .map((part) => part.trim())
    .filter((part) => part && part !== legalName)
  if (!parts.length) return undefined
  const postIndex = parts.findIndex((part) => POSTCODE_LINE.test(part))
  if (postIndex < 1) return { '@type': 'PostalAddress', streetAddress: parts.join(', ') }
  const [, postalCode, addressLocality] = parts[postIndex].match(POSTCODE_LINE) ?? []
  const country = parts.slice(postIndex + 1).join(', ')
  const countryCode = COUNTRY_CODES.find(([pattern]) => pattern.test(country))?.[1]
  return compact({
    '@type': 'PostalAddress',
    streetAddress: parts.slice(0, postIndex).join(', '),
    postalCode,
    addressLocality,
    addressCountry: countryCode ?? (country || undefined),
  })
}

export const organizationLd = (settings: SiteSetting): JsonLdObject => {
  const memberships = (settings.memberships ?? []).map((m) =>
    compact({
      '@type': 'Organization',
      name: m.name,
      url: m.url,
      logo: ogImageUrl(m.logo),
    }),
  )
  const company = settings.company
  return compact({
    '@context': CONTEXT,
    '@type': 'Organization',
    '@id': ORGANIZATION_ID,
    name: settings.siteName,
    legalName: company?.legalName,
    description: settings.defaultSeo?.description,
    identifier: company?.companyId
      ? { '@type': 'PropertyValue', propertyID: 'IČO', value: company.companyId }
      : undefined,
    url: SERVER_URL,
    // Google reads raster logos only (PNG, JPEG, WebP), at least 112 × 112 px.
    logo: absoluteUrl(LOGO_PATH),
    email: settings.contactEmail,
    telephone: settings.contact?.phone,
    address: postalAddressLd(settings.contact?.address, company?.legalName),
    foundingDate: COMPANY_FACTS.foundingDate,
    numberOfEmployees: { '@type': 'QuantitativeValue', value: COMPANY_FACTS.numberOfEmployees },
    parentOrganization: { '@type': 'Organization', ...COMPANY_FACTS.parent },
    sameAs: [...new Set([...(settings.socials ?? []).map((s) => s.url), COMPANY_FACTS.linkedIn])],
    memberOf: memberships,
  })
}

export const websiteLd = (settings: SiteSetting, locale: Locale): JsonLdObject => ({
  '@context': CONTEXT,
  '@type': 'WebSite',
  '@id': WEBSITE_ID,
  name: settings.siteName,
  url: SERVER_URL,
  inLanguage: IN_LANGUAGE[locale],
  publisher: organizationRef,
})

const CURRENCIES: [RegExp, string][] = [
  [/kč|czk/i, 'CZK'],
  [/€|eur/i, 'EUR'],
  [/\$|usd/i, 'USD'],
]

/**
 * "1,290" or "9.900" → "1290" and "9900"; "1 490,50" → "1490.50". The last
 * separator is the decimal one when another kind comes before it or when it is
 * not followed by exactly three digits. Every other separator groups thousands.
 */
const normaliseAmount = (digits: string): string => {
  const last = Math.max(digits.lastIndexOf(','), digits.lastIndexOf('.'))
  if (last < 0) return digits
  const separator = digits[last]
  const other = separator === ',' ? '.' : ','
  const isDecimal = digits.slice(0, last).includes(other) || !/^\d{3}$/.test(digits.slice(last + 1))
  if (!isDecimal) return digits.replace(/[,.]/g, '')
  return `${digits.slice(0, last).replace(/[,.]/g, '')}.${digits.slice(last + 1)}`
}

/** "9 900 Kč" → { price: "9900", priceCurrency: "CZK" }. Text without an amount and a currency gives null. */
export const parsePrice = (text: string | null | undefined) => {
  if (!text) return null
  const currency = CURRENCIES.find(([pattern]) => pattern.test(text))?.[1]
  const digits = text.replace(/[^\d,.]/g, '')
  if (!currency || !/\d/.test(digits)) return null
  return { price: String(Number(normaliseAmount(digits))), priceCurrency: currency }
}

export type Pricing = { path: string; tiers: PricingTableBlock['tiers'] }

/**
 * The pricing table with tiers of its own: it marks the pricing page. A table
 * with source "pricingPage" (solution pages) only shows those tiers.
 */
export const ownPricingTable = (
  layout: Page['layout'] | null | undefined,
): PricingTableBlock | undefined =>
  layout?.find(
    (block): block is PricingTableBlock =>
      block.blockType === 'pricingTable' && block.source !== 'pricingPage',
  )

/** Solution pages are the pages chosen in site settings (footer, home and Service data). */
export const isSolutionPage = (page: Pick<Page, 'id'>, settings: Pick<SiteSetting, 'solutions'>) =>
  (settings.solutions ?? []).some(
    (value) => (typeof value === 'number' ? value : value.id) === page.id,
  )

/**
 * Offers from the pricing table on the pricing page. Tiers without an amount
 * and a currency ("Zdarma", "Individuálně") are left out.
 */
export const offersFromPricing = (pricing: Pricing | null): JsonLdObject[] =>
  (pricing?.tiers ?? []).flatMap((tier) => {
    const price = parsePrice(tier.price)
    if (!price) return []
    return [
      compact({
        '@type': 'Offer',
        name: tier.name,
        ...price,
        availability: 'https://schema.org/InStock',
        url: absoluteUrl(pricing!.path),
        priceSpecification: compact({
          '@type': 'UnitPriceSpecification',
          ...price,
          unitText: tier.period?.replace(/^\/\s*/, ''),
        }),
      }),
    ]
  })

type MediaRef = Media | number | null | undefined

/** Page image for Open Graph and structured data, else the site default image. */
const pageImage = (page: Pick<Page, 'seo'>, fallbackImage?: MediaRef) =>
  ogImageUrl(page.seo?.image) ?? ogImageUrl(fallbackImage)

/**
 * The product, on the home page and on the pricing page (issue #40). `name` is
 * the product name, not the page headline. Prices come only from the pricing
 * page content.
 */
export const productLd = ({
  name,
  page,
  path,
  pricing = null,
  fallbackImage,
}: {
  name: string
  page: Page
  path: string
  pricing?: Pricing | null
  fallbackImage?: MediaRef
}): JsonLdObject =>
  compact({
    '@context': CONTEXT,
    '@type': 'Product',
    name,
    description: page.seo?.description,
    image: pageImage(page, fallbackImage),
    url: absoluteUrl(path),
    brand: organizationRef,
    manufacturer: organizationRef,
    offers: offersFromPricing(pricing),
  })

/** A solution page (settings.solutions) as the service Robopipe provides (issue #40). */
export const serviceLd = (page: Page, path: string, fallbackImage?: MediaRef): JsonLdObject =>
  compact({
    '@context': CONTEXT,
    '@type': 'Service',
    name: page.title,
    description: page.seo?.description,
    image: pageImage(page, fallbackImage),
    url: absoluteUrl(path),
    provider: organizationRef,
  })

/**
 * A case study as an Article (issue #40). It has no author field: Robopipe
 * writes them, so the organization is the author. Google wants the author's
 * name in place, so it is not only an `@id` reference. The dates are the CMS dates.
 */
export const caseStudyArticleLd = (
  caseStudy: CaseStudy,
  locale: Locale,
  path: string,
  siteName: string,
): JsonLdObject =>
  compact({
    '@context': CONTEXT,
    '@type': 'Article',
    headline: caseStudy.title,
    description: caseStudy.seo?.description || caseStudy.excerpt,
    datePublished: caseStudy.createdAt,
    dateModified: caseStudy.updatedAt,
    image: ogImageUrl(caseStudy.seo?.image) ?? ogImageUrl(caseStudy.heroImage),
    author: { '@type': 'Organization', ...organizationRef, name: siteName, url: SERVER_URL },
    publisher: organizationRef,
    inLanguage: IN_LANGUAGE[locale],
    mainEntityOfPage: absoluteUrl(path),
    url: absoluteUrl(path),
  })

export const blogPostingLd = (post: Post, locale: Locale, path: string): JsonLdObject => {
  const authors = (post.authors ?? []).filter(isPopulated)
  return compact({
    '@context': CONTEXT,
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.excerpt,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt,
    image: ogImageUrl(post.heroImage),
    author: authors.map((author) => ({ '@type': 'Person', name: author.name })),
    publisher: organizationRef,
    inLanguage: IN_LANGUAGE[locale],
    mainEntityOfPage: absoluteUrl(path),
    url: absoluteUrl(path),
  })
}

export type FaqItem = Pick<Faq, 'id' | 'question' | 'answer'>

export const faqPageLd = (faqs: FaqItem[]): JsonLdObject | null => {
  if (!faqs.length) return null
  return {
    '@context': CONTEXT,
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: convertLexicalToPlaintext({ data: faq.answer as never }).trim(),
      },
    })),
  }
}

export type BreadcrumbItem = { name: string; path: string }

export const breadcrumbLd = (items: BreadcrumbItem[]): JsonLdObject => ({
  '@context': CONTEXT,
  '@type': 'BreadcrumbList',
  itemListElement: items.map((item, i) => ({
    '@type': 'ListItem',
    position: i + 1,
    name: item.name,
    item: absoluteUrl(item.path),
  })),
})

/**
 * FAQs visible on a page: `faqAccordion` blocks and the FAQ column of
 * `splitSection`. A question used in two blocks appears once.
 */
export const faqsFromLayout = (layout: Page['layout'] | null | undefined): FaqItem[] => {
  const seen = new Map<number, FaqItem>()
  for (const block of layout ?? []) {
    const faqs =
      block.blockType === 'faqAccordion'
        ? block.faqs
        : block.blockType === 'splitSection'
          ? block.faq?.faqs
          : undefined
    for (const faq of faqs ?? []) {
      if (isPopulated(faq) && !seen.has(faq.id)) seen.set(faq.id, faq)
    }
  }
  return [...seen.values()]
}

/**
 * VideoObject for a YouTube video shown with the `videoEmbed` block (issue #22).
 * The thumbnail is the preview image from this site. `embedUrl` is the standard
 * YouTube player: only crawlers read it, visitors get youtube-nocookie.com.
 */
export const videoObjectLd = (video: Video): JsonLdObject | null => {
  const id = youTubeId(video.url)
  const thumbnail = isPopulated(video.thumbnail) ? video.thumbnail.url : undefined
  if (!id || !thumbnail) return null
  return compact({
    '@context': CONTEXT,
    '@type': 'VideoObject',
    name: video.title,
    description: video.description,
    thumbnailUrl: thumbnail.startsWith('/') ? absoluteUrl(thumbnail) : thumbnail,
    uploadDate: video.uploadDate?.slice(0, 10),
    duration: isoDuration(video.duration),
    embedUrl: `https://www.youtube.com/embed/${id}`,
    url: youTubeWatchUrl(id),
    inLanguage: IN_LANGUAGE[video.language],
    publisher: organizationRef,
  })
}

/** Videos of the `videoEmbed` blocks on a page. A video used twice appears once. */
export const videosFromLayout = (layout: Page['layout'] | null | undefined): Video[] => {
  const seen = new Map<number, Video>()
  for (const block of layout ?? []) {
    if (block.blockType === 'videoEmbed' && isPopulated(block.video)) {
      seen.set(block.video.id, block.video)
    }
  }
  return [...seen.values()]
}

/**
 * JSON for a `<script type="application/ld+json">`. `<` becomes `<`, so
 * CMS text such as `</script>` cannot close the tag.
 */
export const serializeJsonLd = (data: JsonLdObject | JsonLdObject[]): string =>
  JSON.stringify(data).replace(/</g, '\\u003c')
