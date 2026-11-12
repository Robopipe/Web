import type { Locale } from '@/i18n/routing'

/**
 * Blog listing pages (issue #40). The first page is /<locale>/blog, further
 * pages are /<locale>/blog/page/<n>. Path segments instead of `?page=` keep
 * every page static and cacheable, and give each one its own canonical URL.
 */

/** Large enough that every post of the first months of the blog is on the first page. */
export const POSTS_PER_PAGE = 24

export const blogPagePath = (locale: Locale, page: number): string =>
  page > 1 ? `/${locale}/blog/page/${page}` : `/${locale}/blog`

/** A page number written in its one canonical form ("2", not "02" or "2.0"), else null. */
export const parseBlogPage = (value: string | null | undefined): number | null =>
  value && /^[1-9]\d{0,5}$/.test(value) ? Number(value) : null
