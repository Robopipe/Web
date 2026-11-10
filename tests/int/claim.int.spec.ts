import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

import { CS_COPY_FIXES, CS_COPY_FIXES_DB_ONLY, EN_COPY_FIXES } from '@/seed/csCopyFixes'

/** Claim from Filip's decision of 10 Nov (product.md), already live in production. */
const CLAIM = {
  cs: 'AI kontrola kvality, která se váš produkt naučí sama.',
  en: 'AI quality control that learns your product on its own.',
}
const TITLE = {
  cs: 'Robopipe | AI kontrola kvality, která se váš produkt naučí sama',
  en: 'Robopipe | AI quality control that learns your product on its own',
}

describe('home page claim', () => {
  const seed = readFileSync(path.resolve('src/seed/index.ts'), 'utf8')

  it('the seed sets the claim as the hero heading and the title in both languages', () => {
    for (const locale of ['cs', 'en'] as const) {
      expect(seed).toContain(`h1: '${CLAIM[locale]}'`)
      expect(seed).toContain(`title: '${TITLE[locale]}'`)
    }
  })

  it('no copy fix replaces the claim', () => {
    const keys = [...CS_COPY_FIXES, ...CS_COPY_FIXES_DB_ONLY, ...EN_COPY_FIXES].map(
      ([from]) => from,
    )
    for (const text of [...Object.values(CLAIM), ...Object.values(TITLE)]) {
      expect(keys).not.toContain(text)
    }
  })
})
