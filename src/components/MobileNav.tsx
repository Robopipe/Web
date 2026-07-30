'use client'

import { useTranslations } from 'next-intl'
import { usePathname } from 'next/navigation'
import React, { useState } from 'react'

import type { Header as HeaderType } from '@/payload-types'

import { CMSLink } from './CMSLink'
import { buttonClasses } from './ui'

type Props = {
  header: HeaderType
}

export const MobileNav: React.FC<Props> = ({ header }) => {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const t = useTranslations('nav')

  // Close the menu on navigation — render-time state adjustment, not an effect.
  const [lastPathname, setLastPathname] = useState(pathname)
  if (lastPathname !== pathname) {
    setLastPathname(pathname)
    setOpen(false)
  }

  const navItems = header.navItems ?? []
  const secondary = header.secondaryLink?.link
  const cta = header.cta?.link

  return (
    <div className="lg:hidden">
      <button
        type="button"
        aria-expanded={open}
        aria-label={open ? t('closeMenu') : t('menu')}
        onClick={() => setOpen((v) => !v)}
        className="flex h-10 w-10 items-center justify-center rounded-sm text-text-90 hover:bg-surface-3"
      >
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
          {open ? (
            <path d="M4 4l14 14M18 4L4 18" stroke="currentColor" strokeWidth="2" />
          ) : (
            <path d="M3 6h16M3 11h16M3 16h16" stroke="currentColor" strokeWidth="2" />
          )}
        </svg>
      </button>

      {open && (
        <div className="absolute inset-x-0 top-18 border-b border-border-12 bg-white shadow-popup">
          <nav className="container-site flex flex-col gap-1 py-4" aria-label="Mobile">
            {navItems.map((item, i) => (
              <CMSLink
                key={i}
                link={item.link}
                className="rounded-sm px-2 py-2 text-base font-medium text-text-90 hover:bg-surface-3"
              />
            ))}
            {secondary?.label && (
              <CMSLink
                link={secondary}
                className="rounded-sm px-2 py-2 text-base font-medium text-text-60 hover:bg-surface-3"
              />
            )}
            {cta?.label && (
              <CMSLink link={cta} className={buttonClasses({ className: 'mt-2 w-full' })} />
            )}
          </nav>
        </div>
      )}
    </div>
  )
}
