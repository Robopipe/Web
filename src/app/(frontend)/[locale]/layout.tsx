import type { Metadata } from 'next'
import { NextIntlClientProvider, hasLocale } from 'next-intl'
import { setRequestLocale } from 'next-intl/server'
import { Barlow, Inter, Space_Grotesk, Space_Mono } from 'next/font/google'
import { notFound } from 'next/navigation'
import React from 'react'

import { Footer } from '@/components/Footer'
import { Header } from '@/components/Header'
import { LocaleSuggestion } from '@/components/LocaleSuggestion'
import { Plausible } from '@/components/Plausible'
import { routing, type Locale } from '@/i18n/routing'
import { SERVER_URL } from '@/lib/paths'
import { getGlobals } from '@/lib/queries'

import '../styles.css'

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-space-grotesk',
})

const barlow = Barlow({
  subsets: ['latin', 'latin-ext'],
  weight: ['500', '600', '700'],
  variable: '--font-barlow',
})

const spaceMono = Space_Mono({
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '700'],
  variable: '--font-space-mono',
})

const inter = Inter({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-inter',
})

export const metadata: Metadata = {
  metadataBase: new URL(SERVER_URL),
  title: 'Robopipe',
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

type Props = {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) notFound()
  setRequestLocale(locale)

  const { header, footer, settings } = await getGlobals(locale as Locale)

  return (
    <html
      lang={locale}
      className={`${spaceGrotesk.variable} ${barlow.variable} ${spaceMono.variable} ${inter.variable}`}
    >
      <body className="flex min-h-screen flex-col">
        <NextIntlClientProvider>
          <Header header={header} />
          <main className="flex-1">{children}</main>
          <Footer footer={footer} settings={settings} />
          <LocaleSuggestion />
        </NextIntlClientProvider>
        <Plausible />
      </body>
    </html>
  )
}
