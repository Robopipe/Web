import type { Metadata } from 'next'
import { setRequestLocale } from 'next-intl/server'
import { draftMode } from 'next/headers'
import { notFound, permanentRedirect, redirect } from 'next/navigation'
import React from 'react'

import { RenderBlocks } from '@/blocks/RenderBlocks'
import { LivePreviewListener } from '@/components/LivePreviewListener'
import { locales, type Locale } from '@/i18n/routing'
import { buildMeta } from '@/lib/meta'
import { getLocalizedSlugs, getPageBySlug, getPayloadClient, getRedirect } from '@/lib/queries'

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
    })
    for (const page of pages.docs) {
      if (page.slug && page.slug !== 'home') params.push({ locale, slug: page.slug })
    }
  }
  return params
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params
  const page = await getPageBySlug(slug, locale)
  if (!page) return {}
  const slugs = await getLocalizedSlugs('pages', page.id)
  return buildMeta({
    title: page.title,
    seo: page.seo,
    collection: 'pages',
    locale,
    slugs,
  })
}

export default async function CMSPage({ params }: Props) {
  const { locale, slug } = await params
  setRequestLocale(locale)

  // Home renders at the locale root, never at /home.
  if (slug === 'home') redirect(`/${locale}`)

  const { isEnabled: draft } = await draftMode()
  const page = await getPageBySlug(slug, locale, draft)

  if (!page) {
    const redirectDoc = await getRedirect(`/${locale}/${slug}`)
    if (redirectDoc) {
      if (redirectDoc.permanent) permanentRedirect(redirectDoc.to)
      redirect(redirectDoc.to)
    }
    notFound()
  }

  return (
    <>
      {draft && <LivePreviewListener />}
      <RenderBlocks blocks={page.layout} />
    </>
  )
}
