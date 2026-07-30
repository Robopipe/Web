import React from 'react'

/**
 * Design-system primitives shared across blocks and chrome.
 * Styling follows tokens/semantic.css of the Robopipe design system.
 */

type ButtonOptions = {
  variant?: 'filled' | 'outlined' | 'outlined-dark'
  size?: 'md' | 'lg'
  className?: string
}

export const buttonClasses = ({
  variant = 'filled',
  size = 'md',
  className,
}: ButtonOptions = {}): string => {
  const base =
    'inline-flex items-center justify-center rounded-sm font-semibold transition-colors whitespace-nowrap'
  const sizes = {
    md: 'h-10 px-5 text-[15px]',
    lg: 'h-12 px-6 text-base',
  }
  const variants = {
    filled: 'bg-brand text-brand-ink hover:bg-brand-hover',
    outlined: 'border border-border-12 text-text-90 hover:bg-surface-3',
    'outlined-dark': 'border border-border-invert-12 text-text-invert hover:bg-white/10',
  }
  return [base, sizes[size], variants[variant], className].filter(Boolean).join(' ')
}

type ChipProps = {
  children: React.ReactNode
  className?: string
}

/** Lime-tint pill used for eyebrows and category tags. */
export const Chip: React.FC<ChipProps> = ({ children, className }) => (
  <span
    className={[
      'inline-flex items-center rounded-full bg-brand-tint px-3 py-1 text-[13px] font-medium text-brand-fg',
      className,
    ]
      .filter(Boolean)
      .join(' ')}
  >
    {children}
  </span>
)

/** Small uppercase label above logo strips and similar rows. */
export const Eyebrow: React.FC<ChipProps> = ({ children, className }) => (
  <p
    className={[
      'text-xs font-medium uppercase tracking-[0.08em] text-text-38',
      className,
    ]
      .filter(Boolean)
      .join(' ')}
  >
    {children}
  </p>
)
