import 'dotenv/config'

import config from '@payload-config'
import { getPayload } from 'payload'

import { assertLocalDatabase } from '@/lib/dbGuard'

import { createRemoteClient, type SeoGeoClient } from './remoteClient'
import { applySeoGeo } from './seoGeo'

/**
 * CLI for the SEO and GEO content (issues #2 and #6).
 *
 *   pnpm seed:seo-geo                      drafts in the local database
 *   pnpm seed:seo-geo --status=published   publish in the local database
 *   pnpm seed:seo-geo --dry-run            only list the planned changes
 *   pnpm seed:seo-geo --production ...     allow a remote DATABASE_URL
 *   pnpm seed:seo-geo --remote=<URL> ...   through the Payload REST API, no database access.
 *                                          Account from SEED_REMOTE_EMAIL and SEED_REMOTE_PASSWORD.
 */
const run = async (): Promise<void> => {
  const args = process.argv.slice(2)
  const statusArg = args.find((arg) => arg.startsWith('--status='))?.split('=')[1] ?? 'draft'
  if (statusArg !== 'draft' && statusArg !== 'published') {
    throw new Error(`--status must be draft or published, not "${statusArg}".`)
  }
  const dryRun = args.includes('--dry-run')
  const remote = args.find((arg) => arg.startsWith('--remote='))?.slice('--remote='.length)

  let client: SeoGeoClient
  let log: (line: string) => void
  if (remote) {
    const email = process.env.SEED_REMOTE_EMAIL
    const password = process.env.SEED_REMOTE_PASSWORD
    if (!email || !password) {
      throw new Error('--remote needs SEED_REMOTE_EMAIL and SEED_REMOTE_PASSWORD.')
    }
    // The config is only needed to convert Markdown. Payload does not connect to a database.
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
    assertLocalDatabase(process.env.DATABASE_URL, args.includes('--production'))
    const payload = await getPayload({ config })
    client = payload
    log = (line) => payload.logger.info(line)
  }

  const report = await applySeoGeo(client, { status: statusArg, dryRun })

  log(`${dryRun ? 'Planned changes (dry run)' : 'Done'}, status=${statusArg}`)
  for (const [kind, items] of Object.entries(report)) {
    log(`${kind} (${items.length}): ${items.join(', ') || '-'}`)
  }
  process.exit(0)
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
