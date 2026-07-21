import { useLocale, useTranslations } from 'next-intl'
import Image from 'next/image'
import Link from 'next/link'
import React from 'react'

import type { Locale } from '@/i18n/routing'
import type { Footer as FooterType, SiteSetting } from '@/payload-types'

import { CMSLink } from './CMSLink'

type Props = {
  footer: FooterType
  settings: SiteSetting
}

export const Footer: React.FC<Props> = ({ footer, settings }) => {
  const locale = useLocale() as Locale
  const t = useTranslations('footer')
  const columns = footer.columns ?? []
  const year = new Date().getFullYear()

  return (
    <footer className="bg-ink-900 text-ink-300">
      <div className="container-site grid gap-10 py-14 md:grid-cols-4">
        <div className="space-y-4">
          <Link href={`/${locale}`} aria-label="Robopipe">
            <Image src="/logo-white.svg" alt="Robopipe" width={113} height={20} />
          </Link>
          {footer.note && <p className="text-sm leading-relaxed">{footer.note}</p>}
          {settings.contactEmail && (
            <a
              href={`mailto:${settings.contactEmail}`}
              className="block text-sm text-brand-300 hover:text-brand-200"
            >
              {settings.contactEmail}
            </a>
          )}
        </div>

        {columns.map((column, i) => (
          <div key={i}>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-white">
              {column.title}
            </h2>
            <ul className="space-y-2">
              {(column.links ?? []).map((item, j) => (
                <li key={j}>
                  <CMSLink link={item.link} className="text-sm hover:text-white" />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t border-ink-700">
        <div className="container-site flex flex-col items-start justify-between gap-2 py-5 text-xs text-ink-400 sm:flex-row sm:items-center">
          <p>
            © {year} {settings.siteName || 'Robopipe'} · KOALA42. {t('rights')}
          </p>
          <div className="flex gap-4">
            {(settings.socials ?? []).map((social, i) => (
              <a
                key={i}
                href={social.url}
                target="_blank"
                rel="noopener noreferrer"
                className="capitalize hover:text-white"
              >
                {social.platform}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}
