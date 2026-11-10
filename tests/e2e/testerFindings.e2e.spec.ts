import {
  expect,
  request as playwrightRequest,
  test,
  type APIRequestContext,
} from '@playwright/test'

/**
 * Defects found in the tester review of issue #2 (docs/specs/2-seo-geo/test-report.md).
 * Each test fails until its defect is fixed. Needs a server at E2E_BASE_URL.
 */

const baseURL = process.env.E2E_BASE_URL || 'http://localhost:3000'

let api: APIRequestContext
test.beforeAll(async () => {
  api = await playwrightRequest.newContext({ baseURL })
})
test.afterAll(async () => {
  await api.dispose()
})

const rootTarget = async (acceptLanguage: string) => {
  const response = await api.get('/', {
    headers: { 'Accept-Language': acceptLanguage },
    maxRedirects: 0,
  })
  expect(response.status()).toBe(307)
  return new URL(response.headers().location, baseURL).pathname
}

// T1: Chrome and Firefox in Slovak send a region tag and English as a fallback.
// next-intl matches "en" exactly and prefers it to the approximate sk → cs match.
test('a Slovak browser with English as a fallback goes to /cs', async () => {
  expect(await rootTarget('sk-SK,sk;q=0.9,en-US;q=0.8,en;q=0.7')).toBe('/cs')
  expect(await rootTarget('sk-SK,en;q=0.5')).toBe('/cs')
  expect(await rootTarget('cs-CZ,cs;q=0.9,en;q=0.8')).toBe('/cs')
})

// T4: the locale check is only in [locale]/page.tsx. Nested routes query
// Payload with the locale "foo.txt" and the database rejects it with a 500.
test('a nested path under a segment with a dot answers 404, not 500', async () => {
  for (const path of ['/foo.txt/bar', '/foo.txt/case-studies/x', '/foo.txt/blog/x']) {
    expect((await api.get(path)).status(), path).toBe(404)
  }
})
