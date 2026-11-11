import { describe, expect, it } from 'vitest'

import { parseSeoGeoArgs } from '@/seed/seoGeoArgs'

/** Command line of `pnpm seed:seo-geo` (tester finding T1). */
describe('parseSeoGeoArgs', () => {
  it('reads the known arguments', () => {
    expect(parseSeoGeoArgs([])).toEqual({ status: 'draft', dryRun: false, production: false })
    expect(
      parseSeoGeoArgs(['--remote=https://robopipe.io', '--status=published', '--dry-run']),
    ).toEqual({
      status: 'published',
      dryRun: true,
      production: false,
      remote: 'https://robopipe.io',
    })
    expect(parseSeoGeoArgs(['--production']).production).toBe(true)
  })

  it.each([
    [['--dryrun'], 'Unknown argument "--dryrun"'],
    [['--dry_run'], 'Unknown argument "--dry_run"'],
    [
      ['--status', 'published'],
      '--status must be --status=draft or --status=published, not "--status"',
    ],
    [['--status=publish'], 'not "--status=publish"'],
    [['--dry-run=false'], '--dry-run takes no value'],
    [['--remote'], '--remote needs a URL'],
    [['--remote=localhost:3341'], '--remote must be an http or https URL'],
    [['--dry-run', '--dry-run'], '--dry-run is given twice'],
    [['published'], 'Unknown argument "published"'],
  ])('refuses %j', (args, message) => {
    expect(() => parseSeoGeoArgs(args)).toThrow(message)
  })
})
