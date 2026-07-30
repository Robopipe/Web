import { useLocale, useTranslations } from 'next-intl'
import Image from 'next/image'
import Link from 'next/link'
import React from 'react'

import { Icon, iconData, type IconName } from '@/components/icons'
import type { Locale } from '@/i18n/routing'
import type { Footer as FooterType, SiteSetting } from '@/payload-types'

import { CMSLink } from './CMSLink'
import { LanguageSwitcher } from './LanguageSwitcher'

const SOCIAL_ICONS: Record<string, IconName> = {
  github: 'IcoSocialsSocialGithub',
  linkedin: 'IcoSocialsSocialLinkedin',
  x: 'IcoSocialsSocialXTwitter',
  youtube: 'IcoSocialsSocialYoutube',
}

type Props = {
  footer: FooterType
  settings: SiteSetting
}

export const Footer: React.FC<Props> = ({ footer, settings }) => {
  const locale = useLocale() as Locale
  const t = useTranslations('footer')
  const columns = footer.columns ?? []
  const legalLinks = footer.legalLinks ?? []
  const year = new Date().getFullYear()

  return (
    <footer className="bg-surface-dark text-text-invert-60">
      <div className="container-site grid gap-10 py-16 md:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div className="space-y-5">
          <Link href={`/${locale}`} aria-label="Robopipe" className="inline-block">
            <Image
              src="/logo-white.svg"
              alt="Robopipe"
              width={214}
              height={38}
              className="h-6 w-auto"
            />
          </Link>
          {footer.note && (
            <p className="max-w-xs text-sm leading-relaxed text-text-invert-60">{footer.note}</p>
          )}
          {(settings.socials ?? []).length > 0 && (
            <div className="flex items-center gap-4">
              {(settings.socials ?? []).map((social, i) => {
                const iconName = SOCIAL_ICONS[social.platform]
                return (
                  <a
                    key={i}
                    href={social.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={social.platform}
                    className="text-text-invert-60 transition-colors hover:text-text-invert"
                  >
                    {iconName && iconData[iconName] ? (
                      <Icon name={iconName} size={20} />
                    ) : (
                      <span className="text-sm capitalize">{social.platform}</span>
                    )}
                  </a>
                )
              })}
            </div>
          )}
        </div>

        {columns.map((column, i) => (
          <div key={i}>
            <h2 className="mb-4 text-sm font-semibold text-text-invert">{column.title}</h2>
            <ul className="space-y-2.5">
              {(column.links ?? []).map((item, j) => (
                <li key={j}>
                  <CMSLink
                    link={item.link}
                    className="text-sm text-text-invert-60 transition-colors hover:text-text-invert"
                  />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t border-border-invert-12">
        <div className="container-site flex flex-col items-start justify-between gap-2 py-5 text-xs text-text-invert-60 sm:flex-row sm:items-center">
          <p>
            © {year} {footer.copyright || settings.siteName || 'Robopipe'}. {t('rights')}
          </p>
          <div className="flex items-center gap-5">
            {legalLinks.length > 0 && (
              <div className="flex gap-5">
                {legalLinks.map((item, i) => (
                  <CMSLink
                    key={i}
                    link={item.link}
                    className="transition-colors hover:text-text-invert"
                  />
                ))}
              </div>
            )}
            <LanguageSwitcher />
          </div>
        </div>
      </div>
    </footer>
  )
}
