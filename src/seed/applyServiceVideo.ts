import 'dotenv/config'

import config from '@payload-config'
import { getPayload } from 'payload'

import { assertLocalDatabase } from '@/lib/dbGuard'

import { createRemoteClient, type SeoGeoClient } from './remoteClient'
import { applyServiceVideo, parseServiceVideoArgs } from './serviceVideo'

/**
 * CLI for the explainer video on the service pages (issue #22).
 *
 *   pnpm seed:service-video                     change the local database
 *   pnpm seed:service-video --dry-run           only list the planned changes
 *   pnpm seed:service-video --production        allow a remote DATABASE_URL
 *   pnpm seed:service-video --remote=<URL> ...  through the Payload REST API, no database access.
 *                                               Account from SEED_REMOTE_EMAIL and SEED_REMOTE_PASSWORD.
 *
 * The script publishes the pages. Any other argument stops the run with exit code 1.
 */
const run = async (): Promise<void> => {
  const { dryRun, production, remote } = parseServiceVideoArgs(process.argv.slice(2))

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

  const report = await applyServiceVideo(client, { dryRun })

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
