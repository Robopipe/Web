import 'dotenv/config'

import config from '@payload-config'
import { getPayload } from 'payload'

import { assertLocalDatabase } from '@/lib/dbGuard'

import { parsePullArgs, pullProduction } from './pullProduction'
import { createRemoteClient } from './remoteClient'

/**
 * CLI of the local production copy (issue #8).
 *
 *   pnpm pull:prod --from=https://robopipe.io
 *
 * Reads production anonymously (no account, read-only) and writes only to a
 * local DATABASE_URL. There is no option to write to a remote database.
 */
const run = async (): Promise<void> => {
  const { from } = parsePullArgs(process.argv.slice(2))
  assertLocalDatabase(process.env.DATABASE_URL)
  if (process.env.PAYLOAD_ALLOW_ID_ON_CREATE !== '1') {
    throw new Error('pull:prod needs PAYLOAD_ALLOW_ID_ON_CREATE=1 to keep the production IDs.')
  }
  const payload = await getPayload({ config })
  const source = await createRemoteClient({ baseUrl: from, config: await config, readOnly: true })
  payload.logger.info(`Copying ${new URL(from).origin} (anonymous, read-only)`)
  const report = await pullProduction(payload, source, (line) => payload.logger.info(line))
  payload.logger.info(`Done: ${JSON.stringify(report)}`)
  process.exit(0)
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
