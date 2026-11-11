import 'dotenv/config'

import fs from 'node:fs'
import path from 'node:path'

import type { SanitizedConfig } from 'payload'

import {
  applyChangeFile,
  CHANGES_DIR,
  listChangeFiles,
  parseChangeFile,
  parseContentArgs,
} from './contentChanges'
import { createRemoteClient } from './remoteClient'

/**
 * CLI for content change files (issue #8, architecture chapter 9).
 *
 *   pnpm content:apply --remote=http://127.0.0.1:3810           every file, local web
 *   pnpm content:apply --remote=https://robopipe.io --dry-run   only list what would change
 *   pnpm content:apply --remote=<URL> --file=<path>             one file
 *
 * Account from SEED_REMOTE_EMAIL and SEED_REMOTE_PASSWORD. A conflict stops the
 * file before it writes. After a conflict, later files are only checked, not written.
 * Exit code 1 when any file has a conflict.
 */
const run = async (): Promise<void> => {
  const { remote, dryRun, file } = parseContentArgs(process.argv.slice(2))
  const files = listChangeFiles(CHANGES_DIR, file)
  // Parse every file before logging in, so a broken file never starts a partial run.
  const parsed = files.map((f) => ({
    name: path.relative(process.cwd(), f),
    dir: path.dirname(f),
    file: parseChangeFile(JSON.parse(fs.readFileSync(f, 'utf8')), path.basename(f)),
  }))

  const email = process.env.SEED_REMOTE_EMAIL
  const password = process.env.SEED_REMOTE_PASSWORD
  if (!email || !password)
    throw new Error('content:apply needs SEED_REMOTE_EMAIL and SEED_REMOTE_PASSWORD.')
  const client = await createRemoteClient({
    baseUrl: remote,
    email,
    password,
    // Change files need no Payload config. Not loading it keeps a local run at about a second.
    config: {} as SanitizedConfig,
    readOnly: dryRun,
  })
  console.log(`Remote ${new URL(remote).origin} as ${email}${dryRun ? ' (dry run)' : ''}`)

  let blocked = false
  for (const { name, dir, file: changes } of parsed) {
    const report = await applyChangeFile(client, changes, {
      dryRun: dryRun || blocked,
      baseDir: dir,
    })
    const state = report.conflict.length
      ? 'CONFLICT, nothing written'
      : dryRun || blocked
        ? 'checked'
        : 'done'
    console.log(`${name} (comment #${changes.comment}): ${state}`)
    for (const [kind, items] of Object.entries(report)) {
      console.log(`  ${kind} (${items.length}): ${items.join('; ') || '-'}`)
    }
    if (report.conflict.length) blocked = true
  }
  if (!parsed.length) console.log('No change files.')
  process.exit(blocked ? 1 : 0)
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
