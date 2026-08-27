import { getLocale, getTranslations } from 'next-intl/server'
import React, { Suspense } from 'react'

import { Icon } from '@/components/icons'
import { LeadForm } from '@/components/LeadForm'
import { Media } from '@/components/Media'
import { buttonClasses } from '@/components/ui'
import type { Locale } from '@/i18n/routing'
import { getGlobals } from '@/lib/queries'
import type { ContactFormBlock } from '@/payload-types'

export const ContactFormComponent: React.FC<ContactFormBlock> = async ({
  heading,
  microcopy,
  showSidebar,
}) => {
  const locale = (await getLocale()) as Locale
  const t = await getTranslations('contact')
  const { settings } = await getGlobals(locale)
  const contact = settings.contact
  const sidebar = showSidebar !== false

  return (
    <section className="container-site py-12 lg:py-16" id="contact">
      <div className={sidebar ? 'grid gap-8 lg:grid-cols-[1.2fr_1fr]' : 'mx-auto max-w-2xl'}>
        <div className="rounded-lg border border-border-12 bg-white p-6 sm:p-8">
          {heading && <h3 className="mb-6 text-2xl leading-8">{heading}</h3>}
          <Suspense>
            <LeadForm microcopy={microcopy} />
          </Suspense>
        </div>

        {sidebar && (
          <div className="flex flex-col gap-8">
            {contact?.bookingUrl && (
              <div className="rounded-lg border border-border-12 bg-white p-6 sm:p-8">
                <div className="flex items-start gap-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm bg-brand-tint text-brand-fg">
                    <Icon name="IcoCalendar" size={20} />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-text-heading">{t('bookingLabel')}</p>
                    {contact.bookingPerson && (
                      <p className="text-sm text-text-60">{contact.bookingPerson}</p>
                    )}
                  </div>
                </div>
                <p className="mt-4 text-sm text-text-60">{t('bookingText')}</p>
                <a
                  href={contact.bookingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={buttonClasses({ className: 'mt-4 w-full' })}
                >
                  {t('bookingCta')}
                </a>
              </div>
            )}
            <div className="flex flex-col gap-6 rounded-lg border border-border-12 bg-white p-6 sm:p-8">
              {settings.contactEmail && (
                <div className="flex items-start gap-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm bg-brand-tint text-brand-fg">
                    <Icon name="IcoMail" size={20} />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-text-heading">{t('salesLabel')}</p>
                    <a
                      href={`mailto:${settings.contactEmail}`}
                      className="text-sm text-brand-fg hover:text-brand-fg-hover"
                    >
                      {settings.contactEmail}
                    </a>
                  </div>
                </div>
              )}
              {contact?.phone && (
                <div className="flex items-start gap-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm bg-brand-tint text-brand-fg">
                    <Icon name="IcoSupport" size={20} />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-text-heading">{t('phoneLabel')}</p>
                    <a
                      href={`tel:${contact.phone.replace(/\s+/g, '')}`}
                      className="text-sm text-brand-fg hover:text-brand-fg-hover"
                    >
                      {contact.phone}
                    </a>
                    {contact.phoneHours && (
                      <p className="mt-0.5 text-[13px] text-text-38">{contact.phoneHours}</p>
                    )}
                  </div>
                </div>
              )}
              {contact?.address && (
                <div className="flex items-start gap-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm bg-brand-tint text-brand-fg">
                    <Icon name="IcoHome" size={20} />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-text-heading">{t('hqLabel')}</p>
                    <p className="text-sm whitespace-pre-line text-text-60">{contact.address}</p>
                  </div>
                </div>
              )}
            </div>
            {contact?.mapImage && typeof contact.mapImage !== 'number' && (
              <div className="h-[260px] overflow-hidden rounded-lg border border-border-12">
                <Media
                  media={contact.mapImage}
                  size="card"
                  className="h-full w-full object-cover"
                />
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
