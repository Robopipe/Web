'use client'

import { useTranslations } from 'next-intl'
import React, { useEffect, useRef, useState } from 'react'

import type { ConsentChoice } from '@/lib/consent'

import { choiceButtonClasses } from './CookieBanner'

type Props = {
  choice: ConsentChoice | null
  onSave: (analytics: boolean, marketing: boolean) => void
  onAcceptAll: () => void
  onClose: () => void
}

const switchClasses =
  'relative h-6 w-11 shrink-0 cursor-pointer appearance-none rounded-full bg-surface-12 transition-colors ' +
  'before:absolute before:top-0.5 before:left-0.5 before:h-5 before:w-5 before:rounded-full before:bg-white ' +
  'before:shadow-card before:transition-transform checked:bg-brand checked:before:translate-x-5 ' +
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-tint focus-visible:ring-offset-2 ' +
  'disabled:cursor-not-allowed disabled:opacity-60'

type RowProps = {
  id: string
  title: string
  text: string
  checked: boolean
  disabled?: boolean
  onChange?: (checked: boolean) => void
}

const CategoryRow: React.FC<RowProps> = ({ id, title, text, checked, disabled, onChange }) => (
  <div className="flex items-start justify-between gap-4 border-t border-border-12 py-4">
    <label htmlFor={id} className="cursor-pointer">
      <span className="block text-sm font-semibold text-text-heading">{title}</span>
      <span className="mt-0.5 block text-sm text-text-60">{text}</span>
    </label>
    <input
      id={id}
      type="checkbox"
      role="switch"
      checked={checked}
      disabled={disabled}
      onChange={(event) => onChange?.(event.target.checked)}
      className={switchClasses}
    />
  </div>
)

/**
 * Native modal `<dialog>`: the browser keeps focus inside and closes it on Escape.
 * Mounted only while open. Closing without "save" keeps the stored choice.
 */
export const CookieSettingsDialog: React.FC<Props> = ({ choice, onSave, onAcceptAll, onClose }) => {
  const t = useTranslations('consent')
  const dialogRef = useRef<HTMLDialogElement>(null)
  // Without a stored choice both categories start off (issue #21, criterion 3).
  const [analytics, setAnalytics] = useState(choice?.analytics ?? false)
  const [marketing, setMarketing] = useState(choice?.marketing ?? false)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null
    // Strict Mode runs this twice. Calling close() here would fire `close` and unmount the dialog.
    if (!dialog.open) dialog.showModal()
    // Unmounting removes the dialog from the top layer. Focus goes back to the opener.
    return () => opener?.focus()
  }, [])

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="cookie-settings-title"
      onClose={onClose}
      className="m-auto w-[calc(100%-2rem)] max-w-lg rounded-md bg-white p-6 text-text-90 shadow-popup backdrop:bg-black/40"
    >
      <h2 id="cookie-settings-title" className="text-xl leading-7 font-semibold text-text-heading">
        {t('dialogTitle')}
      </h2>
      <div className="mt-4">
        <CategoryRow
          id="cookie-necessary"
          title={t('necessaryTitle')}
          text={t('necessaryText')}
          checked
          disabled
        />
        <CategoryRow
          id="cookie-analytics"
          title={t('analyticsTitle')}
          text={t('analyticsText')}
          checked={analytics}
          onChange={setAnalytics}
        />
        <CategoryRow
          id="cookie-marketing"
          title={t('marketingTitle')}
          text={t('marketingText')}
          checked={marketing}
          onChange={setMarketing}
        />
      </div>
      <div className="mt-2 flex flex-col gap-2 border-t border-border-12 pt-4 sm:flex-row sm:items-center sm:gap-3">
        <button
          type="button"
          onClick={() => onSave(analytics, marketing)}
          className={choiceButtonClasses}
        >
          {t('save')}
        </button>
        <button type="button" onClick={onAcceptAll} className={choiceButtonClasses}>
          {t('acceptAll')}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="text-sm font-medium text-text-60 transition-colors hover:text-text-90 sm:ml-auto"
        >
          {t('close')}
        </button>
      </div>
    </dialog>
  )
}
