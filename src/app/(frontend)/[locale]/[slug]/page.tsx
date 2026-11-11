import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { draftMode } from 'next/headers'
import { redirect } from 'next/navigation'
import React from 'react'

import { RenderBlocks } from '@/blocks/RenderBlocks'
import { JsonLd } from '@/components/JsonLd'
import { LivePreviewListener } from '@/components/LivePreviewListener'
import { locales, type Locale } from '@/i18n/routing'
import { checkedParams } from '@/lib/checkedParams'
import {
  breadcrumbLd,
  faqPageLd,
  faqsFromLayout,
  videoObjectLd,
  videosFromLayout,
} from '@/lib/jsonLd'
import { buildMeta } from '@/lib/meta'
import { localizedPaths, pathFor } from '@/lib/paths'
import { getGlobals, getLocalizedSlugs, getPageBySlug, getPayloadClient } from '@/lib/queries'
import { redirectOrNotFound } from '@/lib/redirects'

export const revalidate = 600

type Props = {
  params: Promise<{ locale: Locale; slug: string }>
}

export async function generateStaticParams() {
  const payload = await getPayloadClient()
  const params: { locale: Locale; slug: string }[] = []
  for (const locale of locales) {
    const pages = await payload.find({
      collection: 'pages',
      locale,
      fallbackLocale: false,
      where: { slug: { exists: true } },
      limit: 200,
      depth: 0,
      select: { slug: true },
      // Drafts 404 for visitors, so don't prerender routes for them.
      overrideAccess: false,
    })
    for (const page of pages.docs) {
      if (page.slug && page.slug !== 'home') params.push({ locale, slug: page.slug })
    }
  }
  return params
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await checkedParams(params)
  const page = await getPageBySlug(slug, locale)
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

export default async function CMSPage({ params }: Props) {
  const { locale, slug } = await checkedParams(params)
  setRequestLocale(locale)

  // Home renders at the locale root, never at /home.
  if (slug === 'home') redirect(`/${locale}`)

  const { isEnabled: draft } = await draftMode()
  const page = await getPageBySlug(slug, locale, draft)

  // Also match unprefixed entries: old-site URLs reach here with whichever
  // locale prefix the middleware guessed (e.g. /old-page → /cs/old-page).
  if (!page) return redirectOrNotFound([`/${locale}/${slug}`, `/${slug}`])

  const t = await getTranslations('common')

  return (
    <>
      {draft && <LivePreviewListener />}
      <JsonLd
        data={[
          breadcrumbLd([
            { name: t('home'), path: `/${locale}` },
            { name: page.title, path: pathFor('pages', slug, locale) },
          ]),
          faqPageLd(faqsFromLayout(page.layout)),
          ...videosFromLayout(page.layout).map(videoObjectLd),
        ]}
      />
      <RenderBlocks blocks={page.layout} />
    </>
  )
}
