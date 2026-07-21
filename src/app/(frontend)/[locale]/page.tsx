import type { Metadata } from 'next'
import { setRequestLocale } from 'next-intl/server'
import { draftMode } from 'next/headers'
import { notFound } from 'next/navigation'
import React from 'react'

import { RenderBlocks } from '@/blocks/RenderBlocks'
import { LivePreviewListener } from '@/components/LivePreviewListener'
import type { Locale } from '@/i18n/routing'
import { buildMeta } from '@/lib/meta'
import { getLocalizedSlugs, getPageBySlug } from '@/lib/queries'

export const revalidate = 600

type Props = {
  params: Promise<{ locale: Locale }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const page = await getPageBySlug('home', locale)
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

export default async function HomePage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)

  const { isEnabled: draft } = await draftMode()
  const page = await getPageBySlug('home', locale, draft)
  if (!page) notFound()

  return (
    <>
      {draft && <LivePreviewListener />}
      <RenderBlocks blocks={page.layout} />
    </>
  )
}
