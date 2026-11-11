import { expect, test } from '@playwright/test'

/**
 * Issue #19, finding 1 (docs/specs/19-seo-code). For every sitemap URL, the
 * footer language switcher in the server HTML (no JavaScript) links to the
 * page's hreflang alternate, and that link answers 200.
 */

const baseURL = process.env.E2E_BASE_URL || `http://localhost:${process.env.PORT || '3000'}`

const pathOf = (url: string) => new URL(url).pathname

test('footer language switch links answer 200 in the server HTML', async ({ request }) => {
  test.setTimeout(180_000)
  const sitemap = await (await request.get(`${baseURL}/sitemap.xml`)).text()
  const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1])
  expect(urls.length).toBeGreaterThan(0)

  const failures: string[] = []
  for (const url of urls) {
    const path = pathOf(url)
    const html = await (await request.get(`${baseURL}${path}`, { maxRedirects: 0 })).text()
    const switches = [...html.matchAll(/<a[^>]*data-locale-switch="([a-z]{2})"[^>]*>/g)]
    if (!switches.length) {
      failures.push(`${path}: no switch link`)
      continue
    }
    for (const [tag, target] of switches) {
      const href = tag.match(/href="([^"]+)"/)?.[1] ?? ''
      const alternate = html.match(
        new RegExp(`<link[^>]*rel="alternate"[^>]*hrefLang="${target}"[^>]*href="([^"]+)"`, 'i'),
      )?.[1]
      if (alternate && pathOf(alternate) !== href) {
        failures.push(`${path}: ${target} switch ${href}, hreflang ${pathOf(alternate)}`)
      }
      const status = (await request.get(`${baseURL}${href}`, { maxRedirects: 0 })).status()
      if (status !== 200) failures.push(`${path}: ${target} switch ${href} answers ${status}`)
    }
  }
  console.log(`checked ${urls.length} sitemap URLs`)
  expect(failures).toEqual([])
})
