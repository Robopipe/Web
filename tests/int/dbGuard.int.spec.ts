import { spawnSync } from 'node:child_process'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import { assertLocalDatabase, isLocalDatabaseUrl } from '@/lib/dbGuard'

describe('database guard', () => {
  it('accepts only local hosts', () => {
    expect(isLocalDatabaseUrl('postgres://u:p@localhost:5432/db')).toBe(true)
    expect(isLocalDatabaseUrl('postgres://u:p@127.0.0.1:55433/db')).toBe(true)
    expect(isLocalDatabaseUrl('postgres://u:p@db.example.com:5432/db')).toBe(false)
    expect(isLocalDatabaseUrl(undefined)).toBe(false)
    expect(isLocalDatabaseUrl('not a url')).toBe(false)
  })

  it('throws for a remote database unless remote writes are allowed', () => {
    expect(() => assertLocalDatabase('postgres://u:p@db.example.com/db')).toThrow(/--production/)
    expect(() => assertLocalDatabase('postgres://u:p@db.example.com/db', true)).not.toThrow()
  })

  it('makes seed:seo-geo refuse a remote DATABASE_URL without --production', () => {
    const tsx = path.resolve('node_modules/.bin/tsx')
    const result = spawnSync(tsx, ['src/seed/applySeoGeo.ts', '--dry-run'], {
      env: { ...process.env, DATABASE_URL: 'postgres://u:p@db.example.com:5432/robopipe' },
      encoding: 'utf8',
      timeout: 120_000,
    })
    expect(result.status).toBe(1)
    expect(result.stderr + result.stdout).toMatch(/Refusing to write to a remote database/)
  }, 130_000)
})
