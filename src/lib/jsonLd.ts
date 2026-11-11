import { convertLexicalToPlaintext } from '@payloadcms/richtext-lexical/plaintext'

import type { Locale } from '@/i18n/routing'
import type { Faq, Page, Post, PricingTableBlock, SiteSetting } from '@/payload-types'

import { ogImageUrl } from './meta'
import { absoluteUrl, SERVER_URL } from './paths'

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

/** Drops undefined, null, empty strings and empty arrays so the output stays minimal. */
const compact = <T extends Record<string, unknown>>(obj: T): T =>
  Object.fromEntries(
    Object.entries(obj).filter(
      ([, v]) => v !== undefined && v !== null && v !== '' && !(Array.isArray(v) && !v.length),
    ),
  ) as T

const isPopulated = <T>(value: T | number | null | undefined): value is T =>
  !!value && typeof value !== 'number'

/**
 * Company facts with a public source; issue #19. Change them here when they change.
 * - foundingDate: ARES, datum vzniku of robopipe s.r.o. (IČO 24111791).
 * - numberOfEmployees, parent: the /o-nas page ("spin-off of KOALA42",
 *   "The team has 5 people today").
 * - LinkedIn: the company page of Robopipe.
 */
const COMPANY_FACTS = {
  foundingDate: '2025-12-31',
  numberOfEmployees: 5,
  parent: { name: 'KOALA42', sameAs: 'https://www.linkedin.com/company/koala42' },
  linkedIn: 'https://www.linkedin.com/company/robopipe-io',
}

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
    logo: absoluteUrl('/logo.svg'),
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
        url: absoluteUrl(pricing!.path),
        priceSpecification: compact({
          '@type': 'UnitPriceSpecification',
          ...price,
          unitText: tier.period?.replace(/^\/\s*/, ''),
        }),
      }),
    ]
  })

/** The product is the home page offer. Prices come only from the pricing page content. */
export const productLd = (
  home: Page,
  locale: Locale,
  pricing: Pricing | null = null,
): JsonLdObject =>
  compact({
    '@context': CONTEXT,
    '@type': 'Product',
    name: home.title,
    description: home.seo?.description,
    image: ogImageUrl(home.seo?.image),
    url: absoluteUrl(`/${locale}`),
    brand: organizationRef,
    manufacturer: organizationRef,
    offers: offersFromPricing(pricing),
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
 * JSON for a `<script type="application/ld+json">`. `<` becomes `<`, so
 * CMS text such as `</script>` cannot close the tag.
 */
export const serializeJsonLd = (data: JsonLdObject | JsonLdObject[]): string =>
  JSON.stringify(data).replace(/</g, '\\u003c')
