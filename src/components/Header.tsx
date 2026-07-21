import { useLocale } from 'next-intl'
import Image from 'next/image'
import Link from 'next/link'
import React from 'react'

import type { Locale } from '@/i18n/routing'
import type { Header as HeaderType } from '@/payload-types'

import { CMSLink } from './CMSLink'
import { LanguageSwitcher } from './LanguageSwitcher'
import { MobileNav } from './MobileNav'

type Props = {
  header: HeaderType
}

export const Header: React.FC<Props> = ({ header }) => {
  const locale = useLocale() as Locale
  const navItems = header.navItems ?? []
  const cta = header.cta?.link

  return (
    <header className="sticky top-0 z-40 border-b border-ink-100 bg-white/90 backdrop-blur">
      <div className="container-site flex h-16 items-center justify-between gap-6">
        <Link href={`/${locale}`} className="flex shrink-0 items-center" aria-label="Robopipe">
          <Image src="/logo.svg" alt="Robopipe" width={113} height={20} priority />
        </Link>

        <nav className="hidden items-center gap-6 md:flex" aria-label="Main">
          {navItems.map((item, i) => (
            <CMSLink
              key={i}
              link={item.link}
              className="text-sm font-medium text-ink-600 transition-colors hover:text-ink-900"
            />
          ))}
        </nav>

        <div className="flex items-center gap-4">
          <LanguageSwitcher />
          {cta?.label && (
            <CMSLink
              link={cta}
              className="hidden rounded-md bg-brand-500 px-4 py-2 text-sm font-semibold text-ink-900 transition-colors hover:bg-brand-400 md:inline-block"
            />
          )}
          <MobileNav header={header} />
        </div>
      </div>
    </header>
  )
}
