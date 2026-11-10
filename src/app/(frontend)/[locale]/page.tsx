import type { Metadata } from 'next'
import { hasLocale } from 'next-intl'
import { setRequestLocale } from 'next-intl/server'
import { draftMode } from 'next/headers'
import { notFound } from 'next/navigation'
import React from 'react'

import { RenderBlocks } from '@/blocks/RenderBlocks'
import { JsonLd } from '@/components/JsonLd'
import { LivePreviewListener } from '@/components/LivePreviewListener'
import { routing, type Locale } from '@/i18n/routing'
import { faqPageLd, faqsFromLayout, productLd } from '@/lib/jsonLd'
import { buildMeta } from '@/lib/meta'
import { localizedPaths } from '@/lib/paths'
import { getGlobals, getLocalizedSlugs, getPageBySlug, getPricing } from '@/lib/queries'

export const revalidate = 600

type Props = {
  params: Promise<{ locale: Locale }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  // Paths such as /foo.txt arrive here as locale "foo.txt". The layout answers 404.
  if (!hasLocale(routing.locales, locale)) return {}
  const page = await getPageBySlug('home', locale)
  if (!page) return {}
  const [slugs, { settings }] = await Promise.all([
    getLocalizedSlugs('pages', page.id),
    getGlobals(locale),
  ])
  return buildMeta({
    title: page.title,
    seo: page.seo,
    locale,
    paths: localizedPaths('pages', slugs),
    fallbackImage: settings.defaultSeo?.image,
  })
}

export default async function HomePage({ params }: Props) {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) notFound()
  setRequestLocale(locale)

  const { isEnabled: draft } = await draftMode()
  const page = await getPageBySlug('home', locale, draft)
  if (!page) notFound()
  const pricing = await getPricing(locale)

  return (
    <>
      {draft && <LivePreviewListener />}
      <JsonLd data={[productLd(page, locale, pricing), faqPageLd(faqsFromLayout(page.layout))]} />
      <RenderBlocks blocks={page.layout} />
    </>
  )
}
