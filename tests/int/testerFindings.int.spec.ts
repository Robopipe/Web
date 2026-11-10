import fs from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import { isLocalDatabaseUrl } from '@/lib/dbGuard'
import { parsePrice } from '@/lib/jsonLd'

/**
 * Defects found in the tester review of issue #2 (docs/specs/2-seo-geo/test-report.md).
 * Each test fails until its defect is fixed.
 */

describe('parsePrice reads thousands separators', () => {
  // T3: an editor who types "€1,290" gets price 1.29 in Product.offers.
  it('reads a comma thousands separator in an English price', () => {
    expect(parsePrice('€1,290')).toEqual({ price: '1290', priceCurrency: 'EUR' })
  })

  // T3: "9.900 Kč" gives 9.9 CZK.
  it('reads a dot thousands separator in a Czech price', () => {
    expect(parsePrice('9.900 Kč')).toEqual({ price: '9900', priceCurrency: 'CZK' })
  })

  it('keeps a decimal comma', () => {
    expect(parsePrice('1 490,50 Kč')).toEqual({ price: '1490.5', priceCurrency: 'CZK' })
  })
})

describe('database guard', () => {
  // T6: node-postgres takes the host from the query string, so this URL connects to db.example.com.
  it('rejects a localhost URL that names a remote host in the query string', () => {
    expect(isLocalDatabaseUrl('postgres://u:p@localhost:5432/x?host=db.example.com')).toBe(false)
  })
})

describe('copy for publishing', () => {
  // T2: `pnpm seed:seo-geo --status=published` publishes the copy as it is. A
  // "[ověřit]" marker would show on the public page, in FAQPage and in llms.txt.
  it('has no [ověřit] markers left', () => {
    const dir = path.resolve(process.cwd(), 'seed-assets/copy/seo-geo')
    const hits = fs.readdirSync(dir).flatMap((file) =>
      fs
        .readFileSync(path.join(dir, file), 'utf8')
        .split('\n')
        .flatMap((line, i) => (line.includes('[ověřit]') ? [`${file}:${i + 1}`] : [])),
    )
    expect(hits).toEqual([])
  })
})
