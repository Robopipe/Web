import {
  expect,
  request as playwrightRequest,
  test,
  type APIRequestContext,
  type Page,
} from '@playwright/test'

import { cleanupTestUser, seedTestUser, testUser } from '../helpers/seedUser'

/**
 * Issue #65: the lead form on the landing pages of the Google Ads search campaign, phone
 * optional. Needs a seeded local database after `pnpm seed:landing-lead-form` and a server at
 * E2E_BASE_URL. The suite sets test measurement IDs, so the cookie banner shows, and puts the
 * old IDs back after the run. Test leads use a koala42.com email (testLead).
 */

const baseURL = process.env.E2E_BASE_URL || `http://localhost:${process.env.PORT || '3000'}`
const TEST_IDS = { googleAnalyticsId: 'G-TEST000000', googleAdsId: 'AW-000000000' }
type MeasurementIds = typeof TEST_IDS

const PAGES = {
  cs: ['/cs', '/cs/kamerova-kontrola-kvality', '/cs/detekce-vad-na-vyrobni-lince'],
  en: ['/en', '/en/camera-quality-inspection', '/en/defect-detection'],
}
const HEADING = { cs: 'Pošlete nám poptávku', en: 'Send us a message' }
const PHONE_LABEL = { cs: 'Telefon (nepovinné)', en: 'Phone (optional)' }

let session: APIRequestContext
let token: string
let originalIds: MeasurementIds
const leadEmails: string[] = []

const authHeaders = () => ({ Authorization: `JWT ${token}` })

/** Unique per test: the form allows 5 submissions per IP and hour. */
let ipCounter = 0
const uniqueIp = () => `10.65.${Math.floor(Date.now() / 1000) % 250}.${++ipCounter}`

const setMeasurement = async (ids: MeasurementIds) => {
  const response = await session.post('/api/globals/site-settings', {
    headers: authHeaders(),
    data: { measurement: ids },
  })
  expect(response.status()).toBe(200)
  const present = Boolean(ids.googleAnalyticsId)
  for (const url of PAGES.cs) {
    await expect
      .poll(
        async () => (await (await session.get(url)).text()).includes(TEST_IDS.googleAnalyticsId),
        { timeout: 30_000 },
      )
      .toBe(present)
  }
}

const banner = (page: Page) => page.getByRole('region', { name: /Cookies a měření/ })

const dataLayer = (page: Page) =>
  page.evaluate(() =>
    (window.dataLayer ?? []).map((entry) => Array.from(entry as ArrayLike<unknown>)),
  )

type StoredLead = {
  phone?: string | null
  sourcePage?: string | null
  attribution?: {
    consentAnalytics?: boolean
    consentMarketing?: boolean
    gclid?: string | null
    utmSource?: string | null
    utmMedium?: string | null
  }
}

const findLead = async (email: string): Promise<StoredLead | undefined> => {
  const response = await session.get(
    `/api/leads?depth=0&where[email][equals]=${encodeURIComponent(email)}`,
    { headers: authHeaders() },
  )
  expect(response.status()).toBe(200)
  return ((await response.json()) as { docs: StoredLead[] }).docs[0]
}

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

for (const locale of ['cs', 'en'] as const) {
  for (const path of PAGES[locale]) {
    test(`${path} shows one form without the sidebar, phone optional`, async ({ page }) => {
      await page.goto(path)
      const section = page.locator('section#contact')
      await expect(section).toHaveCount(1)
      await expect(section.getByRole('heading', { name: HEADING[locale] })).toBeVisible()
      await expect(page.locator('form #lead-name')).toHaveCount(1)
      await expect(page.locator('#lead-phone')).not.toHaveAttribute('required')
      await expect(page.locator('label[for="lead-phone"]')).toHaveText(PHONE_LABEL[locale])
      await expect(page.locator('label[for="lead-name"]')).toContainText('*')
      // No sidebar: no booking card, no company details next to the form.
      await expect(section.locator('a[href^="mailto:"]')).toHaveCount(0)
    })
  }
}

test('a lead without a phone from an ad click keeps utm, consent, click and the conversion', async ({
  page,
}) => {
  const path = '/cs/kamerova-kontrola-kvality'
  const email = `e2e-65-${Date.now()}@koala42.com`
  const gclid = `E2E_65_${Date.now()}`
  leadEmails.push(email)
  await page.goto(`${path}?utm_source=test-65&utm_medium=cpc&gclid=${gclid}`)
  await banner(page).getByRole('button', { name: 'Přijmout vše' }).click()

  // Name, email and message stay required.
  await page.locator('form button[type="submit"]').click()
  await expect(page.locator('form [role="alert"]')).toHaveCount(3)

  await page.locator('#lead-name').fill('TEST E2E landing 65')
  await page.locator('#lead-email').fill(email)
  await page.locator('#lead-message').fill('Test of the landing page form (issue #65).')
  await page.locator('form button[type="submit"]').click()
  await expect(page.getByRole('status')).toBeVisible()

  // Give a second event the chance to appear before the count.
  await page.waitForTimeout(500)
  const leads = (await dataLayer(page)).filter((e) => e[0] === 'event' && e[1] === 'generate_lead')
  expect(leads).toEqual([['event', 'generate_lead', { form_location: path }]])

  const lead = await findLead(email)
  expect(lead?.phone || null).toBeNull()
  expect(lead?.sourcePage).toBe(path)
  expect(lead?.attribution).toMatchObject({
    consentAnalytics: true,
    consentMarketing: true,
    gclid,
    utmSource: 'test-65',
    utmMedium: 'cpc',
  })
})
