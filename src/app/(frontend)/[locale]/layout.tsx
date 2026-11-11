import type { Metadata } from 'next'
import { NextIntlClientProvider, hasLocale } from 'next-intl'
import { setRequestLocale } from 'next-intl/server'
import { Barlow, Inter, Space_Grotesk, Space_Mono } from 'next/font/google'
import { notFound } from 'next/navigation'
import React from 'react'

import { ConsentProvider } from '@/components/consent/ConsentProvider'
import { Footer } from '@/components/Footer'
import { Header } from '@/components/Header'
import { JsonLd } from '@/components/JsonLd'
import { LocaleSuggestion } from '@/components/LocaleSuggestion'
import { routing, type Locale } from '@/i18n/routing'
import { organizationLd, websiteLd } from '@/lib/jsonLd'
import { verificationMeta } from '@/lib/meta'
import { SERVER_URL } from '@/lib/paths'
import { getGlobals, getLocaleSwitchPaths, getSolutionPages } from '@/lib/queries'
import { LocaleSwitchProvider } from '@/lib/useLocaleHref'

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

export async function generateMetadata({ params }: Pick<Props, 'params'>): Promise<Metadata> {
  const { locale } = await params
  const metadata: Metadata = { metadataBase: new URL(SERVER_URL), title: 'Robopipe' }
  // Unknown locales get a 404 from the layout. Do not ask Payload with them.
  if (!hasLocale(routing.locales, locale)) return metadata
  const { settings } = await getGlobals(locale)
  return { ...metadata, verification: verificationMeta(settings) }
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

  const [{ header, footer, settings }, solutions, switchPaths] = await Promise.all([
    getGlobals(locale as Locale),
    getSolutionPages(locale as Locale),
    getLocaleSwitchPaths(locale as Locale),
  ])
  const { googleAnalyticsId, googleAdsId } = settings.measurement ?? {}

  return (
    <html
      lang={locale}
      className={`${spaceGrotesk.variable} ${barlow.variable} ${spaceMono.variable} ${inter.variable}`}
    >
      <body className="flex min-h-screen flex-col">
        <JsonLd data={[organizationLd(settings), websiteLd(settings, locale as Locale)]} />
        <NextIntlClientProvider>
          <ConsentProvider analyticsId={googleAnalyticsId} adsId={googleAdsId}>
            <LocaleSwitchProvider paths={switchPaths}>
              <Header header={header} />
              <main className="flex-1">{children}</main>
              <Footer footer={footer} settings={settings} solutions={solutions} />
              <LocaleSuggestion />
            </LocaleSwitchProvider>
          </ConsentProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
