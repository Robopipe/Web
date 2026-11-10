import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import config from '@/payload.config'

// The layout loads Google fonts at build time. The metadata does not need them.
vi.mock('next/font/google', () => {
  const font = () => ({ variable: '', className: '' })
  return { Barlow: font, Inter: font, Space_Grotesk: font, Space_Mono: font }
})

/**
 * Bing and Seznam verification tags come from site-settings.verification
 * through the generateMetadata of the [locale] layout (issue #6, AC 6).
 */
describe('layout metadata: verification tags', () => {
  let payload: Payload

  const metadataFor = async (locale: string) => {
    const { generateMetadata } = await import('@/app/(frontend)/[locale]/layout')
    return generateMetadata({ params: Promise.resolve({ locale }) })
  }
  const setTokens = (bing: string | null, seznam: string | null) =>
    payload.updateGlobal({ slug: 'site-settings', data: { verification: { bing, seznam } } })

  beforeAll(async () => {
    payload = await getPayload({ config: await config })
  }, 120_000)

  afterAll(async () => {
    await setTokens(null, null)
  })

  it('has both tags when both tokens are set', async () => {
    await setTokens('bing-token', ' seznam-token ')
    const metadata = await metadataFor('cs')
    expect(metadata.verification).toEqual({
      other: { 'msvalidate.01': 'bing-token', 'seznam-wmt': 'seznam-token' },
    })
    expect(String(metadata.metadataBase)).toMatch(/^https?:\/\//)
  }, 60_000)

  it('has no verification without tokens', async () => {
    await setTokens(null, '')
    const metadata = await metadataFor('en')
    expect(metadata.verification).toBeUndefined()
    expect(metadata.title).toBe('Robopipe')
  }, 60_000)

  it('does not ask Payload for an unknown locale', async () => {
    const metadata = await metadataFor('foo.txt')
    expect(metadata.verification).toBeUndefined()
  })
})
