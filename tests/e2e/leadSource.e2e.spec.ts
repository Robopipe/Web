import {
  expect,
  request as playwrightRequest,
  test,
  type APIRequestContext,
  type BrowserContext,
  type Page,
} from '@playwright/test'

import { cleanupTestUser, seedTestUser, testUser } from '../helpers/seedUser'

/**
 * Issue #61: utm values and the referrer with the lead. Needs a seeded local database and a
 * server at E2E_BASE_URL. The suite sets test measurement IDs, so the cookie banner shows,
 * and puts the old IDs back after the run. Test leads use a koala42.com email (testLead).
 */

const baseURL = process.env.E2E_BASE_URL || `http://localhost:${process.env.PORT || '3000'}`
const TEST_IDS = { googleAnalyticsId: 'G-TEST000000', googleAdsId: 'AW-000000000' }
type MeasurementIds = typeof TEST_IDS

let session: APIRequestContext
let token: string
let originalIds: MeasurementIds
const leadEmails: string[] = []

const authHeaders = () => ({ Authorization: `JWT ${token}` })

/** Unique per test: the form allows 5 submissions per IP and hour. */
let ipCounter = 0
const uniqueIp = () => `10.61.${Math.floor(Date.now() / 1000) % 250}.${++ipCounter}`

const setMeasurement = async (ids: MeasurementIds) => {
  const response = await session.post('/api/globals/site-settings', {
    headers: authHeaders(),
    data: { measurement: ids },
  })
  expect(response.status()).toBe(200)
  const present = Boolean(ids.googleAnalyticsId)
  for (const url of ['/cs', '/cs/kontakt']) {
    await expect
      .poll(
        async () => (await (await session.get(url)).text()).includes(TEST_IDS.googleAnalyticsId),
        { timeout: 30_000 },
      )
      .toBe(present)
  }
}

const banner = (page: Page) => page.getByRole('region', { name: /Cookies a měření/ })

const sourceCookie = async (context: BrowserContext) =>
  (await context.cookies()).find((cookie) => cookie.name === 'rp_source')

type StoredSource = {
  consentAnalytics?: boolean
  utmSource?: string | null
  utmMedium?: string | null
  utmCampaign?: string | null
  utmTerm?: string | null
  utmContent?: string | null
  referrer?: string | null
  sourceFrom?: string | null
  landedAt?: string | null
}

const findSource = async (email: string): Promise<StoredSource | undefined> => {
  const response = await session.get(
    `/api/leads?depth=0&where[email][equals]=${encodeURIComponent(email)}`,
    { headers: authHeaders() },
  )
  expect(response.status()).toBe(200)
  const { docs } = (await response.json()) as { docs: { attribution?: StoredSource }[] }
  return docs[0]?.attribution
}

const submitForm = async (page: Page, email: string) => {
  leadEmails.push(email)
  await page.locator('#lead-name').fill('TEST E2E utm 61')
  await page.locator('#lead-email').fill(email)
  await page.locator('#lead-phone').fill('+420 777 000 061')
  await page.locator('#lead-message').fill('Test of utm values with the lead (issue #61).')
  await page.locator('form button[type="submit"]').click()
  await expect(page.getByRole('status')).toBeVisible()
}

const email = (scenario: string) => `e2e-61-${scenario}-${Date.now()}@koala42.com`

test.describe.configure({ mode: 'serial' })

test.beforeAll(async () => {
  await seedTestUser()
  session = await playwrightRequest.newContext({ baseURL })
  const loginResponse = await session.post('/api/users/login', {
    data: { email: testUser.email, password: testUser.password },
  })
  expect(loginResponse.status()).toBe(200)
  token = ((await loginResponse.json()) as { token: string }).token
  const settings = await (
    await session.get('/api/globals/site-settings?depth=0', { headers: authHeaders() })
  ).json()
  originalIds = {
    googleAnalyticsId: settings.measurement?.googleAnalyticsId ?? '',
    googleAdsId: settings.measurement?.googleAdsId ?? '',
  }
  await setMeasurement(TEST_IDS)
})

test.afterAll(async () => {
  for (const address of leadEmails) {
    await session.delete(`/api/leads?where[email][equals]=${encodeURIComponent(address)}`, {
      headers: authHeaders(),
    })
  }
  await setMeasurement(originalIds)
  await session.dispose()
  await cleanupTestUser()
})

test.beforeEach(async ({ page }) => {
  await page.setExtraHTTPHeaders({ 'x-forwarded-for': uniqueIp() })
  await page.route(/googletagmanager\.com|google-analytics\.com|doubleclick\.net/, (route) =>
    route.abort(),
  )
})

test('a: utm on the form page without consent, no cookie', async ({ page, context }) => {
  const address = email('a')
  await page.goto('/cs/kontakt?utm_source=newsletter&utm_medium=email&utm_campaign=listopad', {
    referer: 'https://mail.example.com/inbox?id=secret',
  })
  await expect(banner(page)).toBeVisible()
  await submitForm(page, address)
  expect(await sourceCookie(context)).toBeUndefined()
  expect(await findSource(address)).toMatchObject({
    consentAnalytics: false,
    utmSource: 'newsletter',
    utmMedium: 'email',
    utmCampaign: 'listopad',
    referrer: 'https://mail.example.com/inbox',
    sourceFrom: 'formPage',
    landedAt: null,
  })
})

test('b: landing with utm, analytics consent, then the contact page', async ({ page, context }) => {
  const address = email('b')
  await page.goto('/cs?utm_source=linkedin&utm_medium=social&utm_campaign=podzim', {
    referer: 'https://www.linkedin.com/feed/?trk=x',
  })
  await banner(page).getByRole('button', { name: 'Přijmout vše' }).click()
  await expect.poll(() => sourceCookie(context)).toBeDefined()
  // A full page load: the form page has no utm and our own referrer.
  await page.goto('/cs/kontakt', { referer: `${baseURL}/cs` })
  await submitForm(page, address)
  expect(await findSource(address)).toMatchObject({
    consentAnalytics: true,
    utmSource: 'linkedin',
    utmMedium: 'social',
    utmCampaign: 'podzim',
    referrer: 'https://www.linkedin.com/feed/',
    sourceFrom: 'landing',
  })
  expect((await findSource(address))?.landedAt).toBeTruthy()
})

test('b2: a rejection of analytics deletes rp_source', async ({ page, context }) => {
  await page.goto('/cs?utm_source=linkedin')
  await banner(page).getByRole('button', { name: 'Přijmout vše' }).click()
  await expect.poll(() => sourceCookie(context)).toBeDefined()
  await page.getByRole('contentinfo').getByRole('button', { name: 'Nastavení cookies' }).click()
  const dialog = page.getByRole('dialog', { name: 'Nastavení cookies' })
  await dialog.getByRole('switch', { name: /Analyti/ }).uncheck()
  await dialog.getByRole('button', { name: 'Uložit volbu' }).click()
  await expect.poll(() => sourceCookie(context)).toBeUndefined()
})

test('c: no utm and no referrer, no source', async ({ page }) => {
  const address = email('c')
  await page.goto('/cs/kontakt')
  await banner(page).getByRole('button', { name: 'Přijmout vše' }).click()
  await submitForm(page, address)
  expect(await findSource(address)).toMatchObject({
    consentAnalytics: true,
    utmSource: null,
    referrer: null,
    sourceFrom: null,
  })
})
