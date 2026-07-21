import { hasLocale } from 'next-intl'
import { getTranslations } from 'next-intl/server'

import { routing, type Locale } from '@/i18n/routing'
import { pathFor, SERVER_URL } from '@/lib/paths'
import { getPosts } from '@/lib/queries'

export const revalidate = 600

const escapeXml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ locale: string }> },
): Promise<Response> {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) {
    return new Response('Not found', { status: 404 })
  }

  const t = await getTranslations({ locale, namespace: 'blog' })
  const posts = await getPosts(locale as Locale, { limit: 50 })

  const items = posts.docs
    .filter((post) => post.slug)
    .map((post) => {
      const url = `${SERVER_URL}${pathFor('posts', post.slug as string, locale)}`
      return [
        '    <item>',
        `      <title>${escapeXml(post.title)}</title>`,
        `      <link>${url}</link>`,
        `      <guid isPermaLink="true">${url}</guid>`,
        post.excerpt ? `      <description>${escapeXml(post.excerpt)}</description>` : '',
        post.publishedAt
          ? `      <pubDate>${new Date(post.publishedAt).toUTCString()}</pubDate>`
          : '',
        '    </item>',
      ]
        .filter(Boolean)
        .join('\n')
    })
    .join('\n')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Robopipe — ${escapeXml(t('title'))}</title>
    <link>${SERVER_URL}/${locale}/blog</link>
    <description>${escapeXml(t('description'))}</description>
    <language>${locale}</language>
    <atom:link href="${SERVER_URL}/${locale}/blog/rss.xml" rel="self" type="application/rss+xml"/>
${items}
  </channel>
</rss>`

  return new Response(xml, {
    headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' },
  })
}
