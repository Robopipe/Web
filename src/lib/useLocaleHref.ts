'use client'

import { usePathname } from 'next/navigation'
import { createContext, createElement, useContext, type ReactNode } from 'react'

import type { Locale } from '@/i18n/routing'

import { localeSwitchHref, type LocaleSwitchPaths } from './paths'

const LocaleSwitchContext = createContext<LocaleSwitchPaths>({})

/** Gives the layout's language-switch map to the switcher and the locale suggestion. */
export const LocaleSwitchProvider = ({
  paths,
  children,
}: {
  paths: LocaleSwitchPaths
  children: ReactNode
}) => createElement(LocaleSwitchContext.Provider, { value: paths }, children)

/**
 * Resolves the translated-slug URL for each locale from the layout's map, the
 * same paths each page gives as hreflang. It works in the server render too,
 * so crawlers without JavaScript get a link that answers 200. A page without
 * a version in the target locale links to that locale's homepage.
 */
export function useLocaleHref(): (target: Locale) => string {
  const paths = useContext(LocaleSwitchContext)
  const pathname = usePathname()
  return (target: Locale) => localeSwitchHref(paths, pathname, target)
}
