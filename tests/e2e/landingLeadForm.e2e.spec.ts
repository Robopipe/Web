import {
  expect,
  request as playwrightRequest,
  test,
  type APIRequestContext,
  type Page,
} from '@playwright/test'

import copy from '../../seed-assets/copy/landing-lead-form.json' with { type: 'json' }
import { cleanupTestUser, seedTestUser, testUser } from '../helpers/seedUser'

/**
 * Issue #65: the lead form on every landing page in seed-assets/copy/landing-lead-form.json,
 * phone optional. Needs a seeded local database after `pnpm seed:landing-lead-form` and a server at
 * E2E_BASE_URL. The suite sets test measurement IDs, so the cookie banner shows, and puts the
 * old IDs back after the run. Test leads use a koala42.com email (testLead). Every case study
 * shows the form from its template. Without a local case study, the suite makes one and deletes it.
 */

const baseURL = process.env.E2E_BASE_URL || `http://localhost:${process.env.PORT || '3000'}`
const TEST_IDS = { googleAnalyticsId: 'G-TEST000000', googleAdsId: 'AW-000000000' }
type MeasurementIds = typeof TEST_IDS

/** Pages of the ad campaign. The measurement checks poll them. */
const AD_PAGES = ['/cs', '/cs/kamerova-kontrola-kvality', '/cs/detekce-vad-na-vyrobni-lince']
const HEADING = { cs: 'Pošlete nám poptávku', en: 'Send us a message' }
const PHONE_LABEL = { cs: 'Telefon (nepovinné)', en: 'Phone (optional)' }

let session: APIRequestContext
let token: string
let originalIds: MeasurementIds
const leadEmails: string[] = []
/** Id of a case study that the suite made because the local database had none. */
let fixtureCaseStudyId: number | undefined

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
  for (const url of AD_PAGES) {
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
  if (fixtureCaseStudyId !== undefined) {
    await session.delete(`/api/case-studies/${fixtureCaseStudyId}`, { headers: authHeaders() })
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

/**
 * The path of a page in a locale, or undefined when the page is not published there. The copy
 * file names pages by their Czech slug, so the lookup always uses the Czech locale. Most English
 * slugs are different.
 */
const pagePath = async (slug: string, locale: 'cs' | 'en'): Promise<string | undefined> => {
  const response = await session.get(
    `/api/pages?depth=0&limit=1&locale=cs&where[slug][equals]=${slug}`,
  )
  const czech = ((await response.json()) as { docs: { id: number }[] }).docs[0]
  if (!czech) return undefined
  if (slug === 'home') return `/${locale}`
  const doc = await (await session.get(`/api/pages/${czech.id}?depth=0&locale=${locale}`)).json()
  return doc._status === 'published' && doc.slug ? `/${locale}/${doc.slug}` : undefined
}

for (const slug of copy.pages) {
  for (const locale of ['cs', 'en'] as const) {
    test(`${slug} (${locale}) shows one form without the sidebar, phone optional`, async ({
      page,
    }) => {
      const path = await pagePath(slug, locale)
      // Some landing pages exist only in production, where editors made them in the admin.
      test.skip(!path, `page ${slug} is not published in the local database`)
      await page.goto(path!)
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

/** Paths of one published case study in both locales. Makes a minimal one when none exists. */
const caseStudyPaths = async (): Promise<Record<'cs' | 'en', string>> => {
  const list = async () =>
    (
      (await (await session.get('/api/case-studies?depth=0&limit=1&locale=cs')).json()) as {
        docs: { id: number }[]
      }
    ).docs[0]
  let first = await list()
  if (!first) {
    const created = await session.post('/api/case-studies?locale=cs', {
      headers: authHeaders(),
      data: { title: 'TEST E2E 65', slug: 'test-e2e-65', customer: 'TEST', _status: 'published' },
    })
    expect(created.status()).toBe(201)
    fixtureCaseStudyId = ((await created.json()) as { doc: { id: number } }).doc.id
    await session.patch(`/api/case-studies/${fixtureCaseStudyId}?locale=en`, {
      headers: authHeaders(),
      data: { title: 'TEST E2E 65', slug: 'test-e2e-65-en', _status: 'published' },
    })
    first = await list()
  }
  const slugIn = async (locale: 'cs' | 'en') =>
    (
      (await (
        await session.get(`/api/case-studies/${first!.id}?depth=0&locale=${locale}`)
      ).json()) as {
        slug: string
      }
    ).slug
  return {
    cs: `/cs/case-studies/${await slugIn('cs')}`,
    en: `/en/case-studies/${await slugIn('en')}`,
  }
}

for (const locale of ['cs', 'en'] as const) {
  test(`a case study (${locale}) shows one form without the sidebar before the closing CTA`, async ({
    page,
  }) => {
    const path = (await caseStudyPaths())[locale]
    await page.goto(path)
    const section = page.locator('section#contact')
    await expect(section).toHaveCount(1)
    await expect(section.getByRole('heading', { name: HEADING[locale] })).toBeVisible()
    await expect(page.locator('form #lead-name')).toHaveCount(1)
    await expect(page.locator('#lead-phone')).not.toHaveAttribute('required')
    await expect(page.locator('label[for="lead-phone"]')).toHaveText(PHONE_LABEL[locale])
    await expect(section.locator('a[href^="mailto:"]')).toHaveCount(0)
    // The form sits after the article and before the dark CTA section.
    await expect(page.locator('article + section#contact + section.bg-surface-dark')).toHaveCount(1)
  })
}

test('the case study list and the industries page have no form', async ({ page }) => {
  for (const path of ['/cs/case-studies', '/en/case-studies', '/cs/obory']) {
    await page.goto(path)
    await expect(page.locator('section#contact'), path).toHaveCount(0)
  }
})

test('a lead from a case study keeps the case study path as its source page', async ({ page }) => {
  const path = (await caseStudyPaths()).cs
  const email = `e2e-65-cs-${Date.now()}@koala42.com`
  leadEmails.push(email)
  await page.goto(`${path}?utm_source=test-65-cs&utm_medium=cpc`)
  await page.locator('#lead-name').fill('TEST E2E case study 65')
  await page.locator('#lead-email').fill(email)
  await page.locator('#lead-message').fill('Test of the case study form (issue #65).')
  await page.locator('form button[type="submit"]').click()
  await expect(page.getByRole('status')).toBeVisible()
  const lead = await findLead(email)
  expect(lead?.sourcePage).toBe(path)
  expect(lead?.attribution).toMatchObject({ utmSource: 'test-65-cs', utmMedium: 'cpc' })
})

test('the industry select has its own arrow at the text inset, vertically centred', async ({
  page,
}) => {
  await page.goto('/cs/kontrola-etiket')
  const select = page.locator('#lead-industry')
  const chevron = page.getByTestId('lead-industry-chevron')
  await expect(select).toHaveCSS('appearance', 'none')
  const field = (await select.boundingBox())!
  const arrow = (await chevron.boundingBox())!
  // 3.5 spacing units are 14 px, the left text inset of every field.
  expect(Math.round(field.x + field.width - (arrow.x + arrow.width))).toBe(14)
  expect(Math.abs(field.y + field.height / 2 - (arrow.y + arrow.height / 2))).toBeLessThan(1)
})

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
