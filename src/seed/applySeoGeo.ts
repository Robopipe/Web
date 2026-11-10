import 'dotenv/config'

import config from '@payload-config'
import { getPayload } from 'payload'

import { assertLocalDatabase } from '@/lib/dbGuard'

import { applySeoGeo } from './seoGeo'

/**
 * CLI for the SEO and GEO content (issue #2).
 *
 *   pnpm seed:seo-geo                      drafts in the local database
 *   pnpm seed:seo-geo --status=published   publish in the local database
 *   pnpm seed:seo-geo --dry-run            only list the planned changes
 *   pnpm seed:seo-geo --production ...     allow a remote DATABASE_URL
 */
const run = async (): Promise<void> => {
  const args = process.argv.slice(2)
  const statusArg = args.find((arg) => arg.startsWith('--status='))?.split('=')[1] ?? 'draft'
  if (statusArg !== 'draft' && statusArg !== 'published') {
    throw new Error(`--status must be draft or published, not "${statusArg}".`)
  }
  assertLocalDatabase(process.env.DATABASE_URL, args.includes('--production'))

  const payload = await getPayload({ config })
  const report = await applySeoGeo(payload, {
    status: statusArg,
    dryRun: args.includes('--dry-run'),
  })

  const heading = args.includes('--dry-run') ? 'Planned changes (dry run)' : 'Done'
  payload.logger.info(`${heading}, status=${statusArg}`)
  for (const [kind, items] of Object.entries(report)) {
    payload.logger.info(`${kind} (${items.length}): ${items.join(', ') || '-'}`)
  }
  process.exit(0)
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
