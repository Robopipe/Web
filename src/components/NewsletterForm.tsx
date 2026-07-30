'use client'

import { useLocale, useTranslations } from 'next-intl'
import { usePathname } from 'next/navigation'
import React, { useActionState } from 'react'

import { subscribeNewsletter, type NewsletterFormState } from '@/actions/subscribeNewsletter'
import type { Locale } from '@/i18n/routing'

const initialState: NewsletterFormState = { status: 'idle' }

export const NewsletterForm: React.FC = () => {
  const t = useTranslations('newsletter')
  const locale = useLocale() as Locale
  const pathname = usePathname()
  const [state, formAction, pending] = useActionState(subscribeNewsletter, initialState)

  if (state.status === 'success') {
    return (
      <p role="status" className="text-base font-medium text-brand">
        {t('success')}
      </p>
    )
  }

  return (
    <form action={formAction} className="flex w-full max-w-md flex-col gap-3 sm:flex-row" noValidate>
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="sourcePage" value={pathname} />
      {/* Honeypot — visually hidden, real users never fill it */}
      <div className="absolute -left-[9999px]" aria-hidden="true">
        <label>
          Website
          <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <label htmlFor="newsletter-email" className="sr-only">
        {t('emailLabel')}
      </label>
      <input
        id="newsletter-email"
        name="email"
        type="email"
        required
        maxLength={320}
        placeholder="you@company.com"
        className="h-12 flex-1 rounded-sm border border-border-invert-12 bg-white/5 px-3.5 text-sm text-text-invert placeholder:text-text-invert-60 focus:border-brand focus:outline-none"
      />
      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-12 items-center justify-center rounded-sm bg-brand px-6 text-base font-semibold text-brand-ink transition-colors hover:bg-brand-hover disabled:opacity-60"
      >
        {pending ? t('submitting') : t('subscribe')}
      </button>
      {state.status === 'error' && (
        <p role="alert" className="w-full text-sm text-danger sm:order-last">
          {t('error')}
        </p>
      )}
    </form>
  )
}
