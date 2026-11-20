import 'dotenv/config'

import config from '@payload-config'
import { getPayload } from 'payload'

import { assertLocalDatabase } from '@/lib/dbGuard'

import { applyLandingLeadForm, parseLandingLeadFormArgs } from './landingLeadForm'
import { createRemoteClient, type SeoGeoClient } from './remoteClient'

/**
 * CLI for the lead form on the landing pages (issue #65).
 *
 *   pnpm seed:landing-lead-form                     change the local database
 *   pnpm seed:landing-lead-form --dry-run           only list the planned changes
 *   pnpm seed:landing-lead-form --production        allow a remote DATABASE_URL
 *   pnpm seed:landing-lead-form --remote=<URL> ...  through the Payload REST API, no database access.
 *                                                   Account from SEED_REMOTE_EMAIL and SEED_REMOTE_PASSWORD.
 *
 * The script publishes the pages. Any other argument stops the run with exit code 1.
 */
const run = async (): Promise<void> => {
  const { dryRun, production, remote } = parseLandingLeadFormArgs(process.argv.slice(2))

  let client: SeoGeoClient
  let log: (line: string) => void
  if (remote) {
    const email = process.env.SEED_REMOTE_EMAIL
    const password = process.env.SEED_REMOTE_PASSWORD
    if (!email || !password) {
      throw new Error('--remote needs SEED_REMOTE_EMAIL and SEED_REMOTE_PASSWORD.')
    }
    // The config is only needed for the REST client. Payload does not connect to a database.
    client = await createRemoteClient({
      baseUrl: remote,
      email,
      password,
      config: await config,
      readOnly: dryRun,
    })
    log = (line) => console.log(line)
    log(`Remote ${new URL(remote).origin} as ${email}`)
  } else {
    assertLocalDatabase(process.env.DATABASE_URL, production)
    const payload = await getPayload({ config })
    client = payload
    log = (line) => payload.logger.info(line)
  }

  const report = await applyLandingLeadForm(client, { dryRun })

  log(dryRun ? 'Planned changes (dry run)' : 'Done')
  for (const [kind, items] of Object.entries(report)) {
    log(`${kind} (${items.length}): ${items.join(', ') || '-'}`)
  }
  process.exit(0)
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
