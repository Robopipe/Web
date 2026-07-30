'use client'

import { useLocale } from 'next-intl'
import Link from 'next/link'
import React, { useEffect, useState } from 'react'

import type { Locale } from '@/i18n/routing'
import { trackEvent } from '@/lib/analytics'
import { commitLocaleChoice, isLocaleSuggestionSuppressed, suggestedLocale } from '@/lib/localeSuggestion'
import { useLocaleHref } from '@/lib/useLocaleHref'

// Only two locales exist, so whichever isn't suggested is always the current one —
// the decline copy below is deliberately hardcoded to that other language.
const COPY: Record<Locale, { headline: string; accept: string; decline: string }> = {
  cs: {
    headline: 'Vypadá to, že jste z Česka — přepnout do češtiny?',
    accept: 'Pokračovat česky',
    decline: 'Stay in English',
  },
  en: {
    headline: "Looks like you're visiting from elsewhere — switch to English?",
    accept: 'Continue in English',
    decline: 'Zůstat u češtiny',
  },
}

export const LocaleSuggestion: React.FC = () => {
  const locale = useLocale() as Locale
  const hrefFor = useLocaleHref()
  const [suggestion, setSuggestion] = useState<Locale | null>(null)

  useEffect(() => {
    if (isLocaleSuggestionSuppressed()) return
    const suggested = suggestedLocale()
    if (!suggested || suggested === locale) return
    // Reacting to cookies (an external system) on mount — the sanctioned use of an effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSuggestion(suggested)
    trackEvent('Locale Suggest: Shown', { suggested })
  }, [locale])

  if (!suggestion) return null

  const copy = COPY[suggestion]

  const decline = () => {
    commitLocaleChoice(locale)
    trackEvent('Locale Suggest: Declined', { suggested: suggestion })
    setSuggestion(null)
  }

  const accept = () => {
    commitLocaleChoice(suggestion)
    trackEvent('Locale Suggest: Accepted', { suggested: suggestion })
  }

  return (
    <div
      role="dialog"
      aria-labelledby="locale-suggestion-headline"
      className="fixed inset-x-4 bottom-4 z-40 mx-auto max-w-sm rounded-md border border-border-12 bg-white p-4 shadow-popup sm:inset-x-auto sm:right-4 sm:left-auto"
    >
      <p id="locale-suggestion-headline" className="text-sm text-text-90">
        {copy.headline}
      </p>
      <div className="mt-3 flex items-center gap-4">
        <Link
          href={hrefFor(suggestion)}
          onClick={accept}
          className="rounded-sm bg-brand px-3 py-1.5 text-sm font-semibold text-brand-ink transition-colors hover:bg-brand-hover"
        >
          {copy.accept}
        </Link>
        <button
          type="button"
          onClick={decline}
          className="text-sm text-text-60 transition-colors hover:text-text-90"
        >
          {copy.decline}
        </button>
      </div>
    </div>
  )
}
