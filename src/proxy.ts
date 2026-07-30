import createMiddleware from 'next-intl/middleware'
import type { NextRequest } from 'next/server'

import { routing } from './i18n/routing'

// Locale detection order: an explicit path prefix or a stored preference (cookie,
// set once a visitor uses the footer switcher) always wins. Otherwise the browser's
// Accept-Language is negotiated against cs/en. `routing.defaultLocale` (Czech) stays
// the site's canonical default for slugs, sitemaps, etc., but when a visitor's
// browser names neither cs nor en we land them on English rather than Czech.
const intlMiddleware = createMiddleware({ ...routing, defaultLocale: 'en' })

const GEO_COOKIE = 'geo-country'
// Set by Vercel on every request (uppercase ISO 3166-1 alpha-2). Absent in local
// dev, so the geo locale-suggestion feature stays dormant there.
const GEO_HEADER = 'x-vercel-ip-country'
const VALID_COUNTRY = /^[A-Z]{2}$/

export default function proxy(request: NextRequest) {
  const response = intlMiddleware(request)

  const country = request.headers.get(GEO_HEADER)
  const isNewCountry = country && request.cookies.get(GEO_COOKIE)?.value !== country
  if (isNewCountry && VALID_COUNTRY.test(country)) {
    // No maxAge: a session cookie, re-evaluated on the visitor's next browser session.
    response.cookies.set(GEO_COOKIE, country, { sameSite: 'lax' })
  }

  return response
}

export const config = {
  // Exclude Payload admin/API, Next internals, media files and static assets
  matcher: ['/((?!api|admin|_next|media|.*\\..*).*)'],
}
