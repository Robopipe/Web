'use client'

import { useLocale, useTranslations } from 'next-intl'
import { usePathname, useSearchParams } from 'next/navigation'
import React, { useActionState } from 'react'

import { submitLead, type LeadFormState } from '@/actions/submitLead'
import type { Locale } from '@/i18n/routing'

const initialState: LeadFormState = { status: 'idle' }

const inputClasses =
  'w-full rounded-md border border-ink-200 bg-white px-3.5 py-2.5 text-sm text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200'

type Props = {
  showUseCase?: boolean
}

export const LeadForm: React.FC<Props> = ({ showUseCase = true }) => {
  const t = useTranslations('contact')
  const locale = useLocale() as Locale
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [state, formAction, pending] = useActionState(submitLead, initialState)

  if (state.status === 'success') {
    return (
      <div
        role="status"
        className="rounded-lg border border-brand-300 bg-brand-100 px-6 py-8 text-center"
      >
        <p className="text-lg font-semibold text-ink-900">{t('success')}</p>
      </div>
    )
  }

  return (
    <form action={formAction} className="space-y-4" noValidate>
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="sourcePage" value={pathname} />
      {searchParams.get('tier') && (
        <input type="hidden" name="tier" value={searchParams.get('tier') ?? ''} />
      )}
      {/* Honeypot — visually hidden, real users never fill it */}
      <div className="absolute -left-[9999px]" aria-hidden="true">
        <label>
          Website
          <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="lead-name" className="mb-1.5 block text-sm font-medium text-ink-700">
            {t('name')} *
          </label>
          <input id="lead-name" name="name" required maxLength={200} className={inputClasses} />
        </div>
        <div>
          <label htmlFor="lead-email" className="mb-1.5 block text-sm font-medium text-ink-700">
            {t('email')} *
          </label>
          <input
            id="lead-email"
            name="email"
            type="email"
            required
            maxLength={320}
            className={inputClasses}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="lead-company" className="mb-1.5 block text-sm font-medium text-ink-700">
            {t('company')}
          </label>
          <input id="lead-company" name="company" maxLength={200} className={inputClasses} />
        </div>
        {showUseCase && (
          <div>
            <label htmlFor="lead-usecase" className="mb-1.5 block text-sm font-medium text-ink-700">
              {t('useCase')}
            </label>
            <input id="lead-usecase" name="useCase" maxLength={500} className={inputClasses} />
          </div>
        )}
      </div>

      <div>
        <label htmlFor="lead-message" className="mb-1.5 block text-sm font-medium text-ink-700">
          {t('message')} *
        </label>
        <textarea
          id="lead-message"
          name="message"
          required
          rows={5}
          maxLength={5000}
          className={inputClasses}
        />
      </div>

      {state.status === 'error' && (
        <p role="alert" className="text-sm font-medium text-red-600">
          {t('error')}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-brand-500 px-6 py-3 text-sm font-semibold text-ink-900 transition-colors hover:bg-brand-400 disabled:opacity-60"
      >
        {pending ? t('submitting') : t('submit')}
      </button>
    </form>
  )
}
