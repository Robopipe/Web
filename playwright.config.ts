import { defineConfig, devices } from '@playwright/test'

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
import 'dotenv/config'

/**
 * Server under test. E2E_BASE_URL wins (any host and port). Otherwise PORT
 * picks a local port when 3000 is taken.
 */
const baseURL = process.env.E2E_BASE_URL || `http://localhost:${process.env.PORT || '3000'}`
const port = new URL(baseURL).port || '3000'

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './tests/e2e',
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* One worker: specs that boot Payload against the one local database would
     race on the dev schema push (same reason as fileParallelism in vitest). */
  workers: 1,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: 'html',
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL,

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        channel: 'chromium',
        // Optional: a Chromium binary other than the one Playwright downloaded.
        launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined },
      },
    },
    {
      // iOS Safari engine, for checks that differ on iPhone (hero video autoplay).
      name: 'webkit-iphone',
      testMatch: /heroVideo\.e2e\.spec\.ts/,
      use: { ...devices['iPhone 14'] },
    },
  ],
  webServer: {
    command: `pnpm dev --port ${port}`,
    reuseExistingServer: true,
    url: baseURL,
  },
})
