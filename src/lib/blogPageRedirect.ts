import { NextResponse, type NextRequest } from 'next/server'

import type { Locale } from '@/i18n/routing'

import { blogPagePath, parseBlogPage } from './blogPages'

const BLOG_LISTING = /^\/(cs|en)\/blog\/?$/

/**
 * The blog listing used `?page=<n>` until issue #40. Old links get a 301 to
 * /blog/page/<n> (or to /blog for page 1 or an invalid number). Other query
 * parameters such as utm_* stay.
 */
export const blogPageRedirect = (request: NextRequest): NextResponse | undefined => {
  const match = request.nextUrl.pathname.match(BLOG_LISTING)
  if (!match || !request.nextUrl.searchParams.has('page')) return undefined
  const locale = match[1] as Locale
  // A plain URL: NextURL would keep a trailing slash of the old address.
  const url = new URL(request.nextUrl.href)
  url.pathname = blogPagePath(locale, parseBlogPage(url.searchParams.get('page')) ?? 1)
  url.searchParams.delete('page')
  return NextResponse.redirect(url, 301)
}
