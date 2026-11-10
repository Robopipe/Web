import { describe, expect, it } from 'vitest'

import { buildMeta, ogImageUrl } from '@/lib/meta'
import { alternatesFor, SERVER_URL } from '@/lib/paths'
import type { Media } from '@/payload-types'

const mediaWith = (url: string) => ({ id: 1, url }) as unknown as Media

describe('ogImageUrl', () => {
  it('keeps an absolute URL as it is', () => {
    const url = 'https://storage.googleapis.com/bucket/hero.jpg'
    expect(ogImageUrl(mediaWith(url))).toBe(url)
  })

  it('adds SERVER_URL to a relative URL', () => {
    expect(ogImageUrl(mediaWith('/api/media/file/hero.jpg'))).toBe(
      `${SERVER_URL}/api/media/file/hero.jpg`,
    )
  })

  it('prefers the og size and ignores unpopulated relations', () => {
    const media = { id: 1, url: '/a.jpg', sizes: { og: { url: '/a-og.jpg' } } } as unknown as Media
    expect(ogImageUrl(media)).toBe(`${SERVER_URL}/a-og.jpg`)
    expect(ogImageUrl(7)).toBeUndefined()
    expect(ogImageUrl(null)).toBeUndefined()
  })
})

describe('alternatesFor', () => {
  it('uses the English URL as x-default', () => {
    expect(alternatesFor({ cs: 'https://x/cs/a', en: 'https://x/en/a' })).toEqual({
      cs: 'https://x/cs/a',
      en: 'https://x/en/a',
      'x-default': 'https://x/en/a',
    })
  })

  it('has no x-default without an English version', () => {
    expect(alternatesFor({ cs: 'https://x/cs/a' })).toEqual({ cs: 'https://x/cs/a' })
  })
})

describe('buildMeta', () => {
  const meta = buildMeta({
    title: 'Kamerová kontrola kvality',
    locale: 'cs',
    paths: { cs: '/cs/kamerova-kontrola-kvality', en: '/en/camera-quality-inspection' },
    image: mediaWith('https://storage.googleapis.com/bucket/hero.jpg'),
    fallbackImage: mediaWith('/fallback.jpg'),
  })

  it('has a self canonical and hreflang with x-default', () => {
    expect(meta.alternates?.canonical).toBe(`${SERVER_URL}/cs/kamerova-kontrola-kvality`)
    expect(meta.alternates?.languages).toEqual({
      cs: `${SERVER_URL}/cs/kamerova-kontrola-kvality`,
      en: `${SERVER_URL}/en/camera-quality-inspection`,
      'x-default': `${SERVER_URL}/en/camera-quality-inspection`,
    })
  })

  it('fills Open Graph url, locales and the document image', () => {
    expect(meta.openGraph).toMatchObject({
      url: `${SERVER_URL}/cs/kamerova-kontrola-kvality`,
      locale: 'cs_CZ',
      alternateLocale: ['en_US'],
      images: 'https://storage.googleapis.com/bucket/hero.jpg',
    })
    expect(meta.title).toBe('Kamerová kontrola kvality | Robopipe')
  })

  it('falls back to the default image and honours noIndex', () => {
    const fallback = buildMeta({
      title: 'X',
      seo: { noIndex: true },
      locale: 'en',
      paths: { en: '/en/x' },
      fallbackImage: mediaWith('/fallback.jpg'),
    })
    expect(fallback.openGraph).toMatchObject({ images: `${SERVER_URL}/fallback.jpg` })
    expect(fallback.robots).toEqual({ index: false, follow: false })
  })
})
