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

export const organizationLd = (settings: SiteSetting): JsonLdObject => {
  const memberships = (settings.memberships ?? []).map((m) =>
    compact({
      '@type': 'Organization',
      name: m.name,
      url: m.url,
      logo: ogImageUrl(m.logo),
    }),
  )
  return compact({
    '@context': CONTEXT,
    '@type': 'Organization',
    '@id': ORGANIZATION_ID,
    name: settings.siteName,
    url: SERVER_URL,
    logo: absoluteUrl('/logo.svg'),
    email: settings.contactEmail,
    telephone: settings.contact?.phone,
    address: settings.contact?.address
      ?.split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .join(', '),
    sameAs: (settings.socials ?? []).map((s) => s.url),
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

/** "9 900 Kč" → { price: "9900", priceCurrency: "CZK" }. Text without an amount and a currency gives null. */
export const parsePrice = (text: string | null | undefined) => {
  if (!text) return null
  const currency = CURRENCIES.find(([pattern]) => pattern.test(text))?.[1]
  const digits = text.replace(/[^\d,.]/g, '').replace(',', '.')
  if (!currency || !/\d/.test(digits)) return null
  return { price: String(Number(digits)), priceCurrency: currency }
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
