import { createHash } from 'node:crypto'

import {
  expect,
  request as playwrightRequest,
  test,
  type APIRequestContext,
  type BrowserContext,
  type Page,
} from '@playwright/test'

import { login } from '../helpers/login'
import { cleanupTestUser, seedTestUser, testUser } from '../helpers/seedUser'

/**
 * Offline conversions for Google Ads, issue #26 (docs/specs/26-offline-conversions/product.md),
 * test plan in architecture.md chapter 13.2. Needs a seeded local database, a server at
 * E2E_BASE_URL and GOOGLE_ADS_EXPORT_USER / GOOGLE_ADS_EXPORT_PASSWORD in `.env`.
 *
 * Requests to Google are blocked, so the tests read the Google tag commands from
 * `window.dataLayer`, which our own `gtag` fills.
 */

const baseURL = process.env.E2E_BASE_URL || `http://localhost:${process.env.PORT || '3000'}`
const TEST_IDS = { googleAnalyticsId: 'G-TEST000000', googleAdsId: 'AW-000000000' }
type MeasurementIds = typeof TEST_IDS

const LOCALES = {
  cs: {
    home: '/cs',
    contact: '/cs/kontakt',
    accept: 'Přijmout vše',
    reject: 'Odmítnout',
    settings: 'Nastavení cookies',
    marketing: /Marketing/,
    save: 'Uložit volbu',
  },
  en: {
    home: '/en',
    contact: '/en/contact',
    accept: 'Accept all',
    reject: 'Reject',
    settings: 'Cookie settings',
    marketing: /Marketing/,
    save: 'Save choice',
  },
} as const
type Locale = keyof typeof LOCALES

const EDITOR = {
  name: 'E2E Editor 26',
  email: `e2e-editor-26-${Date.now()}@example.com`,
  password: 'e2e-editor-26-password',
}

let session: APIRequestContext
let token: string
let originalIds: MeasurementIds
let editorId: number | undefined
const leadEmails: string[] = []

const authHeaders = () => ({ Authorization: `JWT ${token}` })

const exportAuth = () => {
  const user = process.env.GOOGLE_ADS_EXPORT_USER
  const password = process.env.GOOGLE_ADS_EXPORT_PASSWORD
  if (!user || !password) throw new Error('Set GOOGLE_ADS_EXPORT_USER and _PASSWORD in .env')
  return { Authorization: `Basic ${Buffer.from(`${user}:${password}`).toString('base64')}` }
}

const sha256 = (email: string) => createHash('sha256').update(email).digest('hex')

/** Unique per test: the form allows 5 submissions per IP and hour. */
let ipCounter = 0
const uniqueIp = () => `10.26.${Math.floor(Date.now() / 1000) % 250}.${++ipCounter}`

const setMeasurement = async (ids: MeasurementIds) => {
  const response = await session.post('/api/globals/site-settings', {
    headers: authHeaders(),
    data: { measurement: ids },
  })
  expect(response.status()).toBe(200)
  const present = Boolean(ids.googleAnalyticsId)
  for (const url of ['/cs', '/en', '/cs/kontakt', '/en/contact']) {
    await expect
      .poll(
        async () => (await (await session.get(url)).text()).includes(TEST_IDS.googleAnalyticsId),
        {
          timeout: 30_000,
        },
      )
      .toBe(present)
  }
}

/** All `dataLayer` entries as plain arrays (gtag pushes `arguments` objects). */
const dataLayer = (page: Page) =>
  page.evaluate(() =>
    (window.dataLayer ?? []).map((entry) => Array.from(entry as ArrayLike<unknown>)),
  )

const userDataEntries = async (page: Page) =>
  (await dataLayer(page)).filter((entry) => entry[0] === 'set' && entry[1] === 'user_data')

const banner = (page: Page) =>
  page.getByRole('region', { name: /Cookies a měření|Cookies and measurement/ })

const clickCookie = async (context: BrowserContext) =>
  (await context.cookies()).find((cookie) => cookie.name === 'rp_click')

const exportBody = async () => {
  const response = await session.get('/api/google-ads/company-leads.csv', { headers: exportAuth() })
  expect(response.status()).toBe(200)
  return response.text()
}

type StoredLead = {
  id: number
  attribution?: {
    consentAnalytics?: boolean
    consentMarketing?: boolean
    gclid?: string | null
  }
  businessEmail?: boolean
  googleAdsExport?: boolean
}

const findLead = async (email: string): Promise<StoredLead | undefined> => {
  const response = await session.get(
    `/api/leads?depth=0&where[email][equals]=${encodeURIComponent(email)}`,
    { headers: authHeaders() },
  )
  expect(response.status()).toBe(200)
  return ((await response.json()) as { docs: StoredLead[] }).docs[0]
}

/** Moves to the form with a link click, so the app keeps its state (no page load). */
const goToFormInApp = async (page: Page, locale: Locale) => {
  await page.evaluate(() => {
    ;(window as unknown as { __sameDocument: boolean }).__sameDocument = true
  })
  await page.locator(`header a[href="${LOCALES[locale].contact}"]`).first().click()
  await page.waitForURL(`**${LOCALES[locale].contact}`)
  await expect(page.locator('#lead-email')).toBeVisible()
  expect(
    await page.evaluate(() => (window as unknown as { __sameDocument?: boolean }).__sameDocument),
  ).toBe(true)
}

const submitForm = async (page: Page, email: string, name = 'E2E Offline Conversions') => {
  leadEmails.push(email)
  await page.locator('#lead-name').fill(name)
  await page.locator('#lead-email').fill(email)
  await page.locator('#lead-phone').fill('+420 777 000 026')
  await page.locator('#lead-message').fill('Test of offline conversions (issue #26).')
  await page.locator('form button[type="submit"]').click()
  await expect(page.getByRole('status')).toBeVisible()
}

/** Every request the page sends, with its body, to check that no readable email leaves. */
const recordRequests = (page: Page) => {
  const requests: { url: string; body: string }[] = []
  page.on('request', (request) => {
    requests.push({ url: request.url(), body: request.postData() ?? '' })
  })
  return requests
}

const GOOGLE_HOST =
  /(^|\.)(google|googletagmanager|google-analytics|doubleclick|googleadservices|googlesyndication)\.[a-z.]+$/

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
  const editor = await session.post('/api/users', {
    headers: authHeaders(),
    data: { ...EDITOR, role: 'editor' },
  })
  expect(editor.status()).toBe(201)
  editorId = ((await editor.json()) as { doc: { id: number } }).doc.id
})

test.afterAll(async () => {
  for (const email of leadEmails) {
    await session.delete(`/api/leads?where[email][equals]=${encodeURIComponent(email)}`, {
      headers: authHeaders(),
    })
  }
  if (editorId) await session.delete(`/api/users/${editorId}`, { headers: authHeaders() })
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

const scenarioOne: Partial<Record<Locale, { email: string; gclid: string }>> = {}

for (const locale of ['cs', 'en'] as const) {
  const t = LOCALES[locale]

  test.describe(locale, () => {
    test('1, 2, 3, 5, 6: scenario 1, ad click, consent, company email, row in the export', async ({
      page,
      context,
    }) => {
      const stamp = `${Date.now()}`
      const gclid = `E2E_${locale}_${stamp}`
      const email = `e2e-${locale}-${stamp}@firma-e2e.cz`
      const requests = recordRequests(page)

      await page.goto(`${t.home}?gclid=${gclid}`)
      await banner(page).getByRole('button', { name: t.accept }).click()
      expect(
        JSON.parse(decodeURIComponent((await clickCookie(context))?.value ?? '')),
      ).toMatchObject({ v: 1, type: 'gclid', id: gclid })
      await goToFormInApp(page, locale)
      await submitForm(page, email)
      scenarioOne[locale] = { email, gclid }

      const layer = await dataLayer(page)
      const lead = layer.findIndex((entry) => entry[0] === 'event' && entry[1] === 'generate_lead')
      const userData = layer.findIndex((entry) => entry[0] === 'set' && entry[1] === 'user_data')
      const formSubmit = layer.findIndex((e) => e[0] === 'event' && e[1] === 'form_submit')
      expect(lead).toBeGreaterThan(-1)
      // GA4 gets generate_lead before the user data is set (architecture 7.3).
      expect(userData).toBeGreaterThan(lead)
      expect(formSubmit).toBeGreaterThan(userData)
      expect(layer[userData][2]).toEqual({ sha256_email_address: sha256(email) })
      expect(layer[formSubmit][2]).toEqual({ send_to: TEST_IDS.googleAdsId })
      expect(JSON.stringify(layer)).not.toContain(email)
      expect(JSON.stringify(layer)).not.toContain(encodeURIComponent(email))

      for (const request of requests) {
        if (!GOOGLE_HOST.test(new URL(request.url).hostname)) continue
        expect(request.url).not.toContain(email)
        expect(request.url).not.toContain(encodeURIComponent(email))
        expect(request.body).not.toContain(email)
      }

      const stored = await findLead(email)
      expect(stored?.attribution).toMatchObject({ consentMarketing: true, gclid })
      expect(stored).toMatchObject({ businessEmail: true, googleAdsExport: true })

      const rows = (await exportBody()).split('\n').filter((line) => line.includes(gclid))
      expect(rows).toHaveLength(1)
      const fields = rows[0].split(',')
      expect(fields[0]).toBe(`lead-${stored?.id}`)
      expect(fields[2]).toMatch(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/)
      expect(fields[6]).toBe(sha256(email))
      expect(fields[7]).toBe('Granted')
    })

    test('2: the click ID survives navigation before the choice', async ({ page, context }) => {
      const gclid = `E2E_nav_${locale}_${Date.now()}`
      await page.goto(`${t.home}?gclid=${gclid}`)
      expect(await clickCookie(context)).toBeUndefined()
      await goToFormInApp(page, locale)
      expect(await clickCookie(context)).toBeUndefined()
      await banner(page).getByRole('button', { name: t.accept }).click()
      expect(decodeURIComponent((await clickCookie(context))?.value ?? '')).toContain(gclid)
    })

    test('2: withdrawing marketing consent deletes rp_click', async ({ page, context }) => {
      await page.goto(`${t.home}?gclid=E2E_off_${locale}_${Date.now()}`)
      await banner(page).getByRole('button', { name: t.accept }).click()
      expect(await clickCookie(context)).toBeDefined()
      await page.getByRole('contentinfo').getByRole('button', { name: t.settings }).click()
      const dialog = page.getByRole('dialog', { name: t.settings })
      await dialog.getByRole('switch', { name: t.marketing }).uncheck()
      await dialog.getByRole('button', { name: t.save }).click()
      await expect(dialog).toBeHidden()
      expect(await clickCookie(context)).toBeUndefined()
    })

    test('1, 6: scenario 2, Gmail is stored with the click but not exported', async ({ page }) => {
      const stamp = `${Date.now()}`
      const gclid = `E2E_gmail_${locale}_${stamp}`
      const email = `e2e.${locale}.${stamp}@gmail.com`
      await page.goto(`${t.home}?gclid=${gclid}`)
      await banner(page).getByRole('button', { name: t.accept }).click()
      await goToFormInApp(page, locale)
      await submitForm(page, email)

      await page.waitForTimeout(500)
      expect(await userDataEntries(page)).toEqual([])
      const stored = await findLead(email)
      expect(stored?.attribution).toMatchObject({ consentMarketing: true, gclid })
      expect(stored).toMatchObject({ businessEmail: false, googleAdsExport: false })
      expect(await exportBody()).not.toContain(gclid)
    })

    test('1, 2, 3: scenario 3, rejected cookies: no click, no hash, no row', async ({
      page,
      context,
    }) => {
      const stamp = `${Date.now()}`
      const gclid = `E2E_reject_${locale}_${stamp}`
      const email = `e2e-reject-${locale}-${stamp}@firma-e2e.cz`
      await page.goto(`${t.home}?gclid=${gclid}`)
      await banner(page).getByRole('button', { name: t.reject }).click()
      await goToFormInApp(page, locale)
      await submitForm(page, email)

      expect(await clickCookie(context)).toBeUndefined()
      await page.waitForTimeout(500)
      expect(await userDataEntries(page)).toEqual([])
      const stored = await findLead(email)
      expect(stored?.attribution?.consentMarketing).toBe(false)
      expect(stored?.attribution?.gclid ?? null).toBeNull()
      expect(stored).toMatchObject({ businessEmail: true, googleAdsExport: false })
      expect(await exportBody()).not.toContain(gclid)
    })
  })
}

test('7: the export answers 401 without login', async () => {
  const anonymous = await playwrightRequest.newContext({ baseURL })
  try {
    const response = await anonymous.get('/api/google-ads/company-leads.csv')
    expect(response.status()).toBe(401)
    expect(response.headers()['www-authenticate']).toMatch(/^Basic /)
    const wrong = await anonymous.get('/api/google-ads/company-leads.csv', {
      headers: { Authorization: `Basic ${Buffer.from('google-ads:wrong').toString('base64')}` },
    })
    expect(wrong.status()).toBe(401)
  } finally {
    await anonymous.dispose()
  }
})

test('11: a Google tag that throws does not stop the form', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  // Wraps our own gtag when the app sets it, so the tag init still runs.
  // A string, not a function: tsx adds `__name` helpers to functions it serializes.
  await page.addInitScript(`
    let current
    Object.defineProperty(window, 'gtag', {
      configurable: true,
      get: () => current,
      set: (real) => {
        current = (...args) => {
          if (args[0] === 'set' && args[1] === 'user_data') {
            window.__gtagThrew = true
            throw new Error('gtag broke')
          }
          real(...args)
        }
      },
    })
  `)
  const email = `e2e-throw-${Date.now()}@firma-e2e.cz`
  await page.goto(`/cs?gclid=E2E_throw_${Date.now()}`)
  await banner(page).getByRole('button', { name: LOCALES.cs.accept }).click()
  await goToFormInApp(page, 'cs')
  await submitForm(page, email)
  expect((await findLead(email))?.attribution?.consentMarketing).toBe(true)
  expect(await page.evaluate(() => (window as { __gtagThrew?: boolean }).__gtagThrew)).toBe(true)
  expect(errors).toEqual([])
})

test('11: broken rp_click and rp_consent cookies do not stop the form', async ({
  page,
  context,
}) => {
  const host = new URL(baseURL).hostname
  await context.addCookies([
    { name: 'rp_consent', value: '%7Bbroken', domain: host, path: '/' },
    { name: 'rp_click', value: 'not-json', domain: host, path: '/' },
  ])
  const email = `e2e-broken-${Date.now()}@firma-e2e.cz`
  await page.goto(LOCALES.cs.contact)
  await submitForm(page, email)
  const stored = await findLead(email)
  expect(stored?.attribution).toMatchObject({ consentMarketing: false })
  expect(stored?.attribution?.gclid ?? null).toBeNull()
})

test('13: an editor sees the read-only attribution of the scenario 1 lead', async ({ page }) => {
  const lead = scenarioOne.cs
  expect(lead, 'scenario 1 (cs) ran first').toBeDefined()
  const stored = await findLead(lead!.email)
  await login({ page, user: EDITOR })
  await page.goto(`/admin/collections/leads/${stored?.id}`)

  await expect(page.locator('#field-businessEmail')).toBeChecked()
  await expect(page.locator('#field-googleAdsExport')).toBeChecked()
  await expect(page.locator('#field-testLead')).not.toBeChecked()
  await expect(page.locator('#field-businessEmail')).toBeDisabled()
  const gclid = page.locator('#field-attribution__gclid')
  await expect(gclid).toHaveValue(lead!.gclid)
  await expect(gclid).toBeDisabled()
  await expect(page.locator('#field-attribution__consentMarketing')).toBeChecked()
})
