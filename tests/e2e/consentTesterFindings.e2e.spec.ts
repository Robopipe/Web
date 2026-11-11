import { expect, request as playwrightRequest, test, type Page } from '@playwright/test'

import { cleanupTestUser, seedTestUser, testUser } from '../helpers/seedUser'

/**
 * Tester findings for issue #21 (docs/specs/21-google-measurement/test-report.md).
 * They fail until the bugs are fixed. Same setup as consent.e2e.spec.ts: test IDs
 * through REST, original IDs back at the end, requests to Google blocked.
 */

const baseURL = process.env.E2E_BASE_URL || `http://localhost:${process.env.PORT || '3000'}`
const TEST_IDS = { googleAnalyticsId: 'G-TEST000000', googleAdsId: 'AW-000000000' }

let originalIds = { googleAnalyticsId: '', googleAdsId: '' }

const banner = (page: Page) =>
  page.getByRole('region', { name: /Cookies a měření|Cookies and measurement/ })

const withSession = async (ids: typeof TEST_IDS | null) => {
  const session = await playwrightRequest.newContext({ baseURL })
  const login = await session.post('/api/users/login', {
    data: { email: testUser.email, password: testUser.password },
  })
  expect(login.status()).toBe(200)
  const headers = { Authorization: `JWT ${((await login.json()) as { token: string }).token}` }
  if (ids === null) {
    const settings = await (
      await session.get('/api/globals/site-settings?depth=0', { headers })
    ).json()
    originalIds = {
      googleAnalyticsId: settings.measurement?.googleAnalyticsId ?? '',
      googleAdsId: settings.measurement?.googleAdsId ?? '',
    }
    ids = TEST_IDS
  }
  const response = await session.post('/api/globals/site-settings', {
    headers,
    data: { measurement: ids },
  })
  expect(response.status()).toBe(200)
  await expect
    .poll(async () => (await (await session.get('/cs')).text()).includes('G-TEST000000'), {
      timeout: 30_000,
    })
    .toBe(ids.googleAnalyticsId === TEST_IDS.googleAnalyticsId)
  await session.dispose()
}

test.beforeAll(async () => {
  await seedTestUser()
  await withSession(null)
})

test.afterAll(async () => {
  await withSession(originalIds)
  await cleanupTestUser()
})

test.beforeEach(async ({ page }) => {
  await page.route(/googletagmanager\.com|google-analytics\.com|doubleclick\.net/, (route) =>
    route.abort(),
  )
})

test('13, 16: with the banner open, the end of the page stays reachable (footer language switch)', async ({
  page,
}) => {
  await page.goto('/cs')
  await expect(banner(page)).toBeVisible()
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
  const covered = await page.evaluate(() => {
    const top = document.querySelector('section[role=region]')!.getBoundingClientRect().top
    return [...document.querySelectorAll('footer a, footer button')]
      .filter((el) => el.getBoundingClientRect().bottom > top)
      .map((el) => el.textContent?.trim())
  })
  expect(covered).toEqual([])
  await page.locator('footer a[data-locale-switch="en"]').click({ timeout: 5_000 })
  await expect(page).toHaveURL(/\/en$/)
})

test('8: a broken rp_consent value shows the banner and does not break the page', async ({
  page,
  context,
}) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await context.addCookies([
    { name: 'rp_consent', value: '%E0%A4%A', domain: new URL(baseURL).hostname, path: '/' },
  ])
  await page.goto('/cs/kontakt')
  await expect(banner(page)).toBeVisible()
  await expect(page.locator('form button[type=submit]')).toBeVisible()
  expect(errors).toEqual([])
})
