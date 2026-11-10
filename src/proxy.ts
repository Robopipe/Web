import { hasLocale } from 'next-intl'
import createMiddleware from 'next-intl/middleware'
import { NextResponse, type NextRequest } from 'next/server'

import { LOCALE_COOKIE, routing } from './i18n/routing'

// Locale detection order: an explicit path prefix always wins. On the root `/`,
// a stored choice (NEXT_LOCALE, written only when the visitor picks a language
// in the footer or the locale suggestion) comes next. Otherwise the browser's
// Accept-Language is negotiated against cs/en (sk counts as cs), then en.
// next-intl itself neither reads nor writes the cookie (routing.localeCookie). `routing.defaultLocale` (Czech) stays
// the site's canonical default for slugs, sitemaps, etc., but when a visitor's
// browser names neither cs nor en we land them on English rather than Czech.
const intlMiddleware = createMiddleware({ ...routing, defaultLocale: 'en' })

const GEO_COOKIE = 'geo-country'
// Set by Vercel on every request (uppercase ISO 3166-1 alpha-2). Absent in local
// dev, so the geo locale-suggestion feature stays dormant there.
const GEO_HEADER = 'x-vercel-ip-country'
const VALID_COUNTRY = /^[A-Z]{2}$/

const rootRedirect = (request: NextRequest): NextResponse | undefined => {
  if (request.nextUrl.pathname !== '/') return undefined
  const stored = request.cookies.get(LOCALE_COOKIE)?.value
  if (!hasLocale(routing.locales, stored)) return undefined
  const url = request.nextUrl.clone()
  url.pathname = `/${stored}`
  return NextResponse.redirect(url, 307)
}

export default function proxy(request: NextRequest) {
  const response = rootRedirect(request) ?? intlMiddleware(request)

  const country = request.headers.get(GEO_HEADER)
  const isNewCountry = country && request.cookies.get(GEO_COOKIE)?.value !== country
  if (isNewCountry && VALID_COUNTRY.test(country)) {
    // No maxAge: a session cookie, re-evaluated on the visitor's next browser session.
    response.cookies.set(GEO_COOKIE, country, { sameSite: 'lax' })
  }

  return response
}

export const config = {
  // Exclude Payload admin/API, Next internals, draft-preview routes (/next/*),
  // media files and static assets
  matcher: ['/((?!api|admin|next|_next|media|.*\\..*).*)'],
}
