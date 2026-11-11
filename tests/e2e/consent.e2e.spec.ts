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
 * Acceptance criteria of issue #21 (docs/specs/21-google-measurement/product.md),
 * test plan in architecture.md chapter 13.2. Needs a seeded local database
 * (pnpm seed) and a server at E2E_BASE_URL.
 *
 * Requests to Google are blocked, so the tests read the consent state from
 * `window.dataLayer`, which our own `gtag` fills. `_ga` after consent needs the
 * real GA4 service and is checked by hand on production.
 */

const baseURL = process.env.E2E_BASE_URL || `http://localhost:${process.env.PORT || '3000'}`
const TEST_IDS = { googleAnalyticsId: 'G-TEST000000', googleAdsId: 'AW-000000000' }
const NO_IDS = { googleAnalyticsId: '', googleAdsId: '' }
type MeasurementIds = typeof TEST_IDS

const HOME = { cs: '/cs', en: '/en' }
const CONTACT = '/cs/kontakt'
const AD_KEYS = ['ad_storage', 'ad_user_data', 'ad_personalization'] as const
const GOOGLE_COOKIE = /^(_ga|_ga_.+|_gid|_gat.*|_gcl_.+|_gac_.+)$/
const DAY_SECONDS = 24 * 60 * 60

let session: APIRequestContext
let token: string
let originalIds: MeasurementIds

const authHeaders = () => ({ Authorization: `JWT ${token}` })

/** Waits until a page renders with (or without) the test ID after the global changed. */
const waitForIds = async (url: string, present: boolean) => {
  await expect
    .poll(
      async () => (await (await session.get(url)).text()).includes(TEST_IDS.googleAnalyticsId),
      {
        message: `${url} ${present ? 'has' : 'has no'} the measurement ID`,
        timeout: 30_000,
      },
    )
    .toBe(present)
}

const setMeasurement = async (ids: MeasurementIds) => {
  const response = await session.post('/api/globals/site-settings', {
    headers: authHeaders(),
    data: { measurement: ids },
  })
  expect(response.status()).toBe(200)
  const present = Boolean(ids.googleAnalyticsId)
  for (const url of [HOME.cs, HOME.en, CONTACT]) await waitForIds(url, present)
}

/** All `dataLayer` entries as plain arrays (gtag pushes `arguments` objects). */
const dataLayer = (page: Page) =>
  page.evaluate(() =>
    (window.dataLayer ?? []).map((entry) => Array.from(entry as ArrayLike<unknown>)),
  )

const consentEntries = async (page: Page) =>
  (await dataLayer(page)).filter((entry) => entry[0] === 'consent')

const lastConsent = async (page: Page) => {
  const entries = await consentEntries(page)
  return entries[entries.length - 1] as [string, string, Record<string, string>]
}

const events = async (page: Page, name: string) =>
  (await dataLayer(page)).filter((entry) => entry[0] === 'event' && entry[1] === name)

const storedChoice = async (context: BrowserContext) => {
  const cookie = (await context.cookies()).find((c) => c.name === 'rp_consent')
  return cookie && { ...cookie, value: JSON.parse(decodeURIComponent(cookie.value)) }
}

const googleCookies = async (context: BrowserContext) =>
  (await context.cookies()).map((c) => c.name).filter((name) => GOOGLE_COOKIE.test(name))

const banner = (page: Page) =>
  page.getByRole('region', { name: /Cookies a měření|Cookies and measurement/ })

test.describe.configure({ mode: 'serial' })

test.beforeAll(async () => {
  await seedTestUser()
  session = await playwrightRequest.newContext({ baseURL })
  const login = await session.post('/api/users/login', {
    data: { email: testUser.email, password: testUser.password },
  })
  expect(login.status()).toBe(200)
  token = ((await login.json()) as { token: string }).token
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
  await setMeasurement(originalIds)
  await session.dispose()
  await cleanupTestUser()
})

test.beforeEach(async ({ page }) => {
  await page.route(/googletagmanager\.com|google-analytics\.com|doubleclick\.net/, (route) =>
    route.abort(),
  )
})

test('1, 2: a new visitor sees the banner, accept and reject look the same, default is denied before config', async ({
  page,
  context,
}) => {
  await page.goto(HOME.cs)
  await expect(banner(page)).toBeVisible()
  const accept = banner(page).getByRole('button', { name: 'Přijmout vše' })
  const reject = banner(page).getByRole('button', { name: 'Odmítnout' })
  await expect(banner(page).getByRole('button')).toHaveCount(3)
  await expect(banner(page).getByRole('button', { name: 'Nastavení' })).toBeVisible()

  const [acceptBox, rejectBox] = [await accept.boundingBox(), await reject.boundingBox()]
  expect(acceptBox?.width).toBe(rejectBox?.width)
  expect(acceptBox?.height).toBe(rejectBox?.height)
  expect(await accept.getAttribute('class')).toBe(await reject.getAttribute('class'))

  const entries = await dataLayer(page)
  const firstConsent = entries.findIndex((entry) => entry[0] === 'consent')
  const firstConfig = entries.findIndex((entry) => entry[0] === 'config')
  expect(entries[firstConsent]).toEqual([
    'consent',
    'default',
    {
      analytics_storage: 'denied',
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
    },
  ])
  expect(firstConsent).toBeLessThan(firstConfig)
  expect(entries.filter((entry) => entry[0] === 'config').map((entry) => entry[1])).toEqual([
    TEST_IDS.googleAnalyticsId,
    TEST_IDS.googleAdsId,
  ])
  // Criterion 14: the tag script is added only after the page load.
  await expect(
    page.locator('script[src*="googletagmanager.com/gtag/js?id=G-TEST000000"]'),
  ).toHaveCount(1)
  // Criterion 4 before the choice.
  expect(await googleCookies(context)).toEqual([])
  expect(await storedChoice(context)).toBeUndefined()
})

test('3: reject hides the banner, stores the choice and leaves no Google cookie', async ({
  page,
  context,
}) => {
  await page.goto(HOME.cs)
  await banner(page).getByRole('button', { name: 'Odmítnout' }).click()
  await expect(banner(page)).toBeHidden()
  expect((await storedChoice(context))?.value).toMatchObject({
    v: 1,
    analytics: false,
    marketing: false,
  })
  expect((await lastConsent(page))[2]).toEqual({
    analytics_storage: 'denied',
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
  })
  expect(await googleCookies(context)).toEqual([])
})

test('4, 8: accept all grants everything and stores the choice for 180 days', async ({
  page,
  context,
}) => {
  await page.goto(HOME.cs)
  await banner(page).getByRole('button', { name: 'Přijmout vše' }).click()
  await expect(banner(page)).toBeHidden()
  const [, kind, state] = await lastConsent(page)
  expect(kind).toBe('update')
  expect(state).toEqual({
    analytics_storage: 'granted',
    ad_storage: 'granted',
    ad_user_data: 'granted',
    ad_personalization: 'granted',
  })
  const cookie = await storedChoice(context)
  expect(cookie?.value).toMatchObject({ v: 1, analytics: true, marketing: true })
  const days = ((cookie?.expires ?? 0) - Date.now() / 1000) / DAY_SECONDS
  expect(days).toBeGreaterThan(179)
  expect(days).toBeLessThan(181)
})

test('3, 5: settings start with both categories off, analytics only grants only analytics_storage', async ({
  page,
}) => {
  await page.goto(HOME.cs)
  await banner(page).getByRole('button', { name: 'Nastavení' }).click()
  const dialog = page.getByRole('dialog', { name: 'Nastavení cookies' })
  await expect(dialog).toBeVisible()
  await expect(dialog.getByRole('switch', { name: /Nezbytné/ })).toBeChecked()
  await expect(dialog.getByRole('switch', { name: /Nezbytné/ })).toBeDisabled()
  await expect(dialog.getByRole('switch', { name: /Analytika/ })).not.toBeChecked()
  await expect(dialog.getByRole('switch', { name: /Marketing/ })).not.toBeChecked()

  await dialog.getByRole('switch', { name: /Analytika/ }).check()
  await dialog.getByRole('button', { name: 'Uložit volbu' }).click()
  await expect(dialog).toBeHidden()
  await expect(banner(page)).toBeHidden()
  const state = (await lastConsent(page))[2]
  expect(state.analytics_storage).toBe('granted')
  for (const key of AD_KEYS) expect(state[key]).toBe('denied')
})

test('6: after a reload the banner stays away and the stored choice is applied before config', async ({
  page,
}) => {
  await page.goto(HOME.cs)
  await banner(page).getByRole('button', { name: 'Přijmout vše' }).click()
  await page.reload()
  await expect(page.locator('script[src*="googletagmanager.com"]')).toHaveCount(1)
  await expect(banner(page)).toHaveCount(0)
  const entries = await dataLayer(page)
  const update = entries.findIndex((entry) => entry[0] === 'consent' && entry[1] === 'update')
  const config = entries.findIndex((entry) => entry[0] === 'config')
  expect(update).toBeGreaterThan(-1)
  expect(update).toBeLessThan(config)
})

test('7, 9: the footer link changes the choice at once and deletes old Google cookies', async ({
  page,
  context,
}) => {
  await page.goto(HOME.cs)
  await banner(page).getByRole('button', { name: 'Přijmout vše' }).click()
  const host = new URL(baseURL).hostname
  await context.addCookies([
    { name: '_ga', value: 'GA1.1.1.1', domain: host, path: '/' },
    { name: '_ga_TEST000000', value: 'GS1.1.1', domain: host, path: '/' },
    { name: '_gcl_au', value: '1.1.1', domain: host, path: '/' },
  ])

  await page.getByRole('contentinfo').getByRole('button', { name: 'Nastavení cookies' }).click()
  const dialog = page.getByRole('dialog', { name: 'Nastavení cookies' })
  await expect(dialog.getByRole('switch', { name: /Analytika/ })).toBeChecked()
  await expect(dialog.getByRole('switch', { name: /Marketing/ })).toBeChecked()
  await dialog.getByRole('switch', { name: /Analytika/ }).uncheck()
  await dialog.getByRole('switch', { name: /Marketing/ }).uncheck()
  await dialog.getByRole('button', { name: 'Uložit volbu' }).click()

  await expect(dialog).toBeHidden()
  expect((await lastConsent(page))[2]).toEqual({
    analytics_storage: 'denied',
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
  })
  expect(await googleCookies(context)).toEqual([])
  expect((await storedChoice(context))?.value).toMatchObject({ analytics: false, marketing: false })
})

test('1, 9: /en has English texts and the "Cookie settings" link', async ({ page }) => {
  await page.goto(HOME.en)
  await expect(banner(page)).toContainText('Cookies and measurement')
  await expect(banner(page).getByRole('button', { name: 'Accept all' })).toBeVisible()
  await expect(banner(page).getByRole('button', { name: 'Reject' })).toBeVisible()
  await expect(banner(page).getByRole('button', { name: 'Settings' })).toBeVisible()
  await expect(banner(page).getByRole('link', { name: 'Privacy policy' })).toHaveAttribute(
    'href',
    '/en/privacy-policy',
  )
  await expect(
    page.getByRole('contentinfo').getByRole('button', { name: 'Cookie settings' }),
  ).toBeVisible()
})

test('10: a successful form submission sends exactly one generate_lead', async ({ page }) => {
  const email = `e2e-consent-${Date.now()}@example.com`
  await page.goto(CONTACT)
  await banner(page).getByRole('button', { name: 'Odmítnout' }).click()
  await page.locator('#lead-name').fill('E2E Consent')
  await page.locator('#lead-email').fill(email)
  await page.locator('#lead-phone').fill('+420 777 000 000')
  await page.locator('#lead-message').fill('Test of the generate_lead event (issue #21).')
  try {
    // An invalid submission is no conversion.
    await page.locator('#lead-email').fill('')
    await page.locator('form button[type="submit"]').click()
    expect(await events(page, 'generate_lead')).toEqual([])

    await page.locator('#lead-email').fill(email)
    await page.locator('form button[type="submit"]').click()
    await expect(page.getByRole('status')).toBeVisible()
    // Give a second event the chance to appear before the count.
    await page.waitForTimeout(500)
    expect(await events(page, 'generate_lead')).toEqual([
      ['event', 'generate_lead', { form_location: CONTACT }],
    ])
  } finally {
    await session.delete(`/api/leads?where[email][equals]=${encodeURIComponent(email)}`, {
      headers: authHeaders(),
    })
  }
})

test('11: clicks on mailto: and tel: links send contact_click', async ({ page }) => {
  await page.goto(CONTACT)
  await banner(page).getByRole('button', { name: 'Odmítnout' }).click()
  // Stop the mail and phone apps. The window listener runs before ours on `document`.
  await page.evaluate(() =>
    window.addEventListener('click', (event) => event.preventDefault(), { capture: true }),
  )
  await page.locator('main a[href^="mailto:"]').first().click()
  await page.locator('main a[href^="tel:"]').first().click()
  expect(await events(page, 'contact_click')).toEqual([
    ['event', 'contact_click', { method: 'email' }],
    ['event', 'contact_click', { method: 'phone' }],
  ])
})

test('13: the banner is first in the Tab order and Escape closes the dialog', async ({ page }) => {
  await page.goto(HOME.cs)
  await expect(banner(page)).toBeVisible()
  await page.keyboard.press('Tab')
  await expect(banner(page).getByRole('button', { name: 'Přijmout vše' })).toBeFocused()

  const settings = banner(page).getByRole('button', { name: 'Nastavení' })
  await settings.focus()
  await page.keyboard.press('Enter')
  const dialog = page.getByRole('dialog', { name: 'Nastavení cookies' })
  await expect(dialog).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  // Escape saves nothing: without a choice the banner stays and focus goes back.
  await expect(banner(page)).toBeVisible()
  await expect(settings).toBeFocused()
})

test('13: after a choice with the keyboard, focus goes to the content, not to the page top', async ({
  page,
}) => {
  await page.goto(HOME.cs)
  await expect(banner(page)).toBeVisible()
  await page.keyboard.press('Tab')
  await expect(banner(page).getByRole('button', { name: 'Přijmout vše' })).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(banner(page)).toBeHidden()
  await expect(page.locator('main')).toBeFocused()
  // The next Tab goes into the content. Before the fix it went to the logo in the header.
  await page.keyboard.press('Tab')
  expect(await page.evaluate(() => document.activeElement?.closest('header') === null)).toBe(true)
})

test('13: a choice saved in the settings dialog from the banner also moves focus to the content', async ({
  page,
}) => {
  await page.goto(HOME.cs)
  await banner(page).getByRole('button', { name: 'Nastavení' }).focus()
  await page.keyboard.press('Enter')
  const dialog = page.getByRole('dialog', { name: 'Nastavení cookies' })
  await dialog.getByRole('button', { name: 'Uložit volbu' }).focus()
  await page.keyboard.press('Enter')
  await expect(dialog).toBeHidden()
  await expect(banner(page)).toBeHidden()
  await expect(page.locator('main')).toBeFocused()
})

test('6, 7: a choice in one tab reaches the other open tabs at once', async ({ context }) => {
  const first = await context.newPage()
  const second = await context.newPage()
  for (const page of [first, second]) {
    await page.route(/googletagmanager\.com|google-analytics\.com|doubleclick\.net/, (route) =>
      route.abort(),
    )
    await page.goto(HOME.cs)
    await expect(banner(page)).toBeVisible()
  }

  await banner(first).getByRole('button', { name: 'Přijmout vše' }).click()
  await expect(banner(second)).toBeHidden()
  await expect.poll(async () => (await lastConsent(second))[2].analytics_storage).toBe('granted')

  await second.getByRole('button', { name: 'Nastavení cookies' }).click()
  const dialog = second.getByRole('dialog', { name: 'Nastavení cookies' })
  await dialog.getByRole('switch', { name: 'Analytika' }).click()
  await dialog.getByRole('switch', { name: 'Marketing' }).click()
  await dialog.getByRole('button', { name: 'Uložit volbu' }).click()
  // The first tab stops measuring without a reload.
  await expect.poll(async () => (await lastConsent(first))[2]).toEqual({
    analytics_storage: 'denied',
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
  })
})

test.describe('phone', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('13: at 390 px the banner has no horizontal scroll and covers at most half the screen', async ({
    page,
  }) => {
    await page.goto(HOME.cs)
    await expect(banner(page)).toBeVisible()
    const size = await banner(page).evaluate((el) => ({
      scrollWidth: el.scrollWidth,
      clientWidth: el.clientWidth,
      height: el.getBoundingClientRect().height,
      pageScrollWidth: document.documentElement.scrollWidth,
    }))
    expect(size.scrollWidth).toBeLessThanOrEqual(size.clientWidth)
    expect(size.pageScrollWidth).toBeLessThanOrEqual(390)
    expect(size.height).toBeLessThanOrEqual(844 * 0.3)
    // Accept and reject sit side by side with the same size (criterion 2).
    const accept = await banner(page).getByRole('button', { name: 'Přijmout vše' }).boundingBox()
    const reject = await banner(page).getByRole('button', { name: 'Odmítnout' }).boundingBox()
    expect(accept?.width).toBe(reject?.width)
    expect(accept?.height).toBe(reject?.height)
    expect(reject!.y).toBe(accept!.y)
  })
})

for (const viewport of [
  { width: 390, height: 844 },
  { width: 320, height: 568 },
]) {
  test.describe(`${viewport.width} px`, () => {
    test.use({ viewport })

    test(`13, 16: at ${viewport.width} px the footer language switch is reachable with the banner open`, async ({
      page,
    }) => {
      await page.goto(HOME.cs)
      await expect(banner(page)).toBeVisible()
      await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
      const bannerTop = (await banner(page).boundingBox())!.y
      const footerBottom = (await page.locator('footer').boundingBox())!
      expect(footerBottom.y + footerBottom.height).toBeLessThanOrEqual(bannerTop + 1)
      await page.locator('footer a[data-locale-switch="en"]').click({ timeout: 5_000 })
      await expect(page).toHaveURL(/\/en$/)
      await expect(banner(page)).toBeVisible()
    })
  })
}

test('16: the locale suggestion waits until the banner is closed', async ({ page, context }) => {
  await context.addCookies([
    { name: 'geo-country', value: 'US', domain: new URL(baseURL).hostname, path: '/' },
  ])
  await page.goto(HOME.cs)
  await expect(banner(page)).toBeVisible()
  const suggestion = page.getByRole('dialog', { name: /Switch to English/ })
  await expect(suggestion).toHaveCount(0)
  await banner(page).getByRole('button', { name: 'Odmítnout' }).click()
  await expect(suggestion).toBeVisible()
  expect(await events(page, 'locale_suggest_shown')).toEqual([
    ['event', 'locale_suggest_shown', { suggested: 'en' }],
  ])
})

test('12: without IDs there is no banner, no Google script and no dataLayer', async ({ page }) => {
  await setMeasurement(NO_IDS)
  try {
    await page.goto(HOME.cs)
    await page.waitForLoadState('load')
    await expect(banner(page)).toHaveCount(0)
    await expect(page.locator('script[src*="googletagmanager.com"]')).toHaveCount(0)
    expect(await page.evaluate(() => typeof window.dataLayer)).toBe('undefined')
    await expect(
      page.getByRole('contentinfo').getByRole('button', { name: 'Nastavení cookies' }),
    ).toHaveCount(0)
  } finally {
    await setMeasurement(TEST_IDS)
  }
})
