'use client'

import { useLocale } from 'next-intl'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import React from 'react'

import type { Locale } from '@/i18n/routing'
import type { Header as HeaderType } from '@/payload-types'

import { CMSLink, hrefFor } from './CMSLink'
import { MobileNav } from './MobileNav'
import { buttonClasses } from './ui'

type Props = {
  header: HeaderType
}

export const Header: React.FC<Props> = ({ header }) => {
  const locale = useLocale() as Locale
  const pathname = usePathname()
  const navItems = header.navItems ?? []
  const secondary = header.secondaryLink?.link
  const cta = header.cta?.link

  const isActive = (href: string | null): boolean => {
    if (!href) return false
    if (href === `/${locale}`) return pathname === href
    return pathname === href || pathname.startsWith(`${href}/`)
  }

  return (
    <header className="sticky top-0 z-50 border-b border-border-12 bg-white">
      <div className="container-site flex h-18 items-center gap-4">
        <div className="flex flex-1 items-center">
          <Link href={`/${locale}`} className="shrink-0" aria-label="Robopipe">
            <Image
              src="/logo.svg"
              alt="Robopipe"
              width={214}
              height={38}
              priority
              className="h-[22px] w-auto"
            />
          </Link>
        </div>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Main">
          {navItems.map((item, i) => {
            const active = isActive(hrefFor(item.link, locale))
            return (
              <CMSLink
                key={i}
                link={item.link}
                className={`rounded-sm px-3 py-2 text-[15px] transition-colors hover:bg-surface-3 ${
                  active ? 'font-semibold text-brand-fg' : 'text-text-90'
                }`}
              />
            )
          })}
        </nav>

        <div className="flex flex-1 items-center justify-end gap-4">
          {secondary?.label && (
            <CMSLink
              link={secondary}
              className="hidden text-[15px] font-medium text-text-90 transition-colors hover:text-brand-fg lg:inline-block"
            />
          )}
          {cta?.label && (
            <CMSLink link={cta} className={buttonClasses({ className: 'hidden lg:inline-flex' })} />
          )}
          <MobileNav header={header} />
        </div>
      </div>
    </header>
  )
}
