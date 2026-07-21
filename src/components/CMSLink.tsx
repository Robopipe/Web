import { useLocale } from 'next-intl'
import NextLink from 'next/link'
import React from 'react'

import type { Locale } from '@/i18n/routing'
import { pathFor } from '@/lib/paths'
import type { Page } from '@/payload-types'

export type LinkData = {
  label?: string | null
  type?: 'internal' | 'external' | null
  page?: (number | null) | Page
  url?: string | null
  newTab?: boolean | null
}

export const hrefFor = (link: LinkData | null | undefined, locale: Locale): string | null => {
  if (!link) return null
  if (link.type === 'external') return link.url || null
  const page = link.page
  if (!page || typeof page === 'number') return null
  if (!page.slug) return null
  return pathFor('pages', page.slug, locale)
}

type Props = {
  link: LinkData | null | undefined
  className?: string
  children?: React.ReactNode
}

export const CMSLink: React.FC<Props> = ({ link, className, children }) => {
  const locale = useLocale() as Locale
  const href = hrefFor(link, locale)
  if (!href || !link) return null

  const external = link.type === 'external'
  return (
    <NextLink
      href={href}
      className={className}
      {...(external && link.newTab ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
    >
      {children ?? link.label}
    </NextLink>
  )
}
