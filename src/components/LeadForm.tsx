'use client'

import { useLocale, useTranslations } from 'next-intl'
import { usePathname, useSearchParams } from 'next/navigation'
import React, { useActionState } from 'react'

import { submitLead, type LeadFormState } from '@/actions/submitLead'
import type { Locale } from '@/i18n/routing'

const initialState: LeadFormState = { status: 'idle' }

const inputClasses =
  'h-12 w-full rounded-sm border border-border-12 bg-white px-3.5 text-sm text-text-90 placeholder:text-text-38 focus:border-border-focus focus:outline-none focus:ring-2 focus:ring-brand-tint'

const labelClasses = 'mb-1.5 block text-sm font-medium text-text-heading'

const INDUSTRIES = ['food', 'pharma', 'retail', 'logistics', 'other'] as const

type Props = {
  microcopy?: string | null
}

export const LeadForm: React.FC<Props> = ({ microcopy }) => {
  const t = useTranslations('contact')
  const tIndustries = useTranslations('industries')
  const locale = useLocale() as Locale
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [state, formAction, pending] = useActionState(submitLead, initialState)
  // Remount the form after a successful submission to reset it.
  const [formKey, setFormKey] = React.useState(0)
  const [fieldErrors, setFieldErrors] = React.useState<{
    name?: boolean
    email?: boolean
    message?: boolean
  }>({})

  // The form is noValidate — required fields get localized messages instead
  // of the browser's native bubbles.
  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    const data = new FormData(event.currentTarget)
    const errors = {
      name: !String(data.get('name') ?? '').trim(),
      email: !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(data.get('email') ?? '').trim()),
      message: !String(data.get('message') ?? '').trim(),
    }
    setFieldErrors(errors)
    if (errors.name || errors.email || errors.message) event.preventDefault()
  }

  const clearFieldError = (field: 'name' | 'email' | 'message') => () =>
    setFieldErrors((prev) => (prev[field] ? { ...prev, [field]: false } : prev))

  if (state.status === 'success') {
    return (
      <div role="status" className="flex flex-col items-center gap-4 py-10 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-tint text-brand-fg">
          <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7" aria-hidden="true">
            <path
              d="M5 12.5l5 5L19 7"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          </svg>
        </span>
        <h3 className="text-2xl leading-8">{t('successTitle')}</h3>
        <p className="max-w-sm text-sm text-text-60">{t('successText')}</p>
        <button
          type="button"
          onClick={() => setFormKey((k) => k + 1)}
          className="text-sm font-medium text-brand-fg hover:text-brand-fg-hover"
        >
          {t('sendAnother')}
        </button>
      </div>
    )
  }

  return (
    <form key={formKey} action={formAction} onSubmit={handleSubmit} className="space-y-4" noValidate>
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
          <label htmlFor="lead-name" className={labelClasses}>
            {t('name')} *
          </label>
          <input
            id="lead-name"
            name="name"
            required
            maxLength={200}
            placeholder={t('namePlaceholder')}
            className={inputClasses}
            aria-invalid={fieldErrors.name || undefined}
            onInput={clearFieldError('name')}
          />
          {fieldErrors.name && (
            <p role="alert" className="mt-1.5 text-sm text-danger">
              {t('validation.nameRequired')}
            </p>
          )}
        </div>
        <div>
          <label htmlFor="lead-company" className={labelClasses}>
            {t('company')}
          </label>
          <input
            id="lead-company"
            name="company"
            maxLength={200}
            placeholder={t('companyPlaceholder')}
            className={inputClasses}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="lead-email" className={labelClasses}>
            {t('email')} *
          </label>
          <input
            id="lead-email"
            name="email"
            type="email"
            required
            maxLength={320}
            placeholder={t('emailPlaceholder')}
            className={inputClasses}
            aria-invalid={fieldErrors.email || undefined}
            onInput={clearFieldError('email')}
          />
          {fieldErrors.email && (
            <p role="alert" className="mt-1.5 text-sm text-danger">
              {t('validation.emailInvalid')}
            </p>
          )}
        </div>
        <div>
          <label htmlFor="lead-phone" className={labelClasses}>
            {t('phone')}
          </label>
          <input
            id="lead-phone"
            name="phone"
            type="tel"
            maxLength={50}
            placeholder="+420"
            className={inputClasses}
          />
        </div>
      </div>

      <div>
        <label htmlFor="lead-industry" className={labelClasses}>
          {t('industry')}
        </label>
        <select id="lead-industry" name="industry" defaultValue="" className={inputClasses}>
          <option value="" />
          {INDUSTRIES.map((value) => (
            <option key={value} value={value}>
              {tIndustries(value)}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="lead-message" className={labelClasses}>
          {t('message')} *
        </label>
        <textarea
          id="lead-message"
          name="message"
          required
          rows={4}
          maxLength={5000}
          placeholder={t('messagePlaceholder')}
          className={`${inputClasses} h-auto py-3`}
          aria-invalid={fieldErrors.message || undefined}
          onInput={clearFieldError('message')}
        />
        {fieldErrors.message && (
          <p role="alert" className="mt-1.5 text-sm text-danger">
            {t('validation.messageRequired')}
          </p>
        )}
      </div>

      {state.status === 'error' && (
        <p role="alert" className="text-sm font-medium text-danger">
          {t('error')}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-4 pt-2">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-12 items-center justify-center rounded-sm bg-brand px-6 text-base font-semibold text-brand-ink transition-colors hover:bg-brand-hover disabled:opacity-60"
        >
          {pending ? t('submitting') : t('submit')}
        </button>
        {microcopy && <p className="text-[13px] text-text-38">{microcopy}</p>}
      </div>
    </form>
  )
}
