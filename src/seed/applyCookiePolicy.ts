import 'dotenv/config'

import config from '@payload-config'
import { getPayload } from 'payload'

import { assertLocalDatabase } from '@/lib/dbGuard'

import { applyCookiePolicy, parseCookiePolicyArgs } from './cookiePolicy'
import { createRemoteClient, type SeoGeoClient } from './remoteClient'

/**
 * CLI for the cookie paragraph on the privacy policy page (issue #21).
 *
 *   pnpm seed:cookie-policy                     change the local database
 *   pnpm seed:cookie-policy --dry-run           only list the planned changes
 *   pnpm seed:cookie-policy --production        allow a remote DATABASE_URL
 *   pnpm seed:cookie-policy --remote=<URL> ...  through the Payload REST API, no database access.
 *                                               Account from SEED_REMOTE_EMAIL and SEED_REMOTE_PASSWORD.
 *
 * The script publishes the page. Any other argument stops the run with exit code 1.
 */
const run = async (): Promise<void> => {
  const { dryRun, production, remote } = parseCookiePolicyArgs(process.argv.slice(2))

  let client: SeoGeoClient
  let log: (line: string) => void
  if (remote) {
    const email = process.env.SEED_REMOTE_EMAIL
    const password = process.env.SEED_REMOTE_PASSWORD
    if (!email || !password) {
      throw new Error('--remote needs SEED_REMOTE_EMAIL and SEED_REMOTE_PASSWORD.')
    }
    client = await createRemoteClient({
      baseUrl: remote,
      email,
      password,
      config: await config,
      readOnly: dryRun,
    })
    log = (line) => console.log(line)
    log(`Remote ${remote} as ${email}`)
  } else {
    assertLocalDatabase(process.env.DATABASE_URL, production)
    const payload = await getPayload({ config })
    client = payload
    log = (line) => payload.logger.info(line)
  }

  const report = await applyCookiePolicy(client, { dryRun })

  log(dryRun ? 'Planned changes (dry run)' : 'Done')
  for (const [kind, items] of Object.entries(report)) {
    log(`${kind} (${items.length}): ${items.join(', ') || '-'}`)
  }
  process.exit(report.missing.length > 0 ? 2 : 0)
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
