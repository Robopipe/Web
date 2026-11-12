import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  NARROW_QUERY,
  REDUCED_DATA_QUERY,
  pickVideoSource,
  readVideoEnvironment,
} from '@/blocks/Hero/videoSource'

/** Issue #30: phones get the smaller hero video, data savers get no video. */
describe('hero video source', () => {
  const sources = { src: '/desktop.mp4', mobileSrc: '/mobile.mp4' }

  it('plays the mobile copy on a narrow screen', () => {
    expect(pickVideoSource(sources, { narrow: true, saveData: false })).toBe('/mobile.mp4')
  })

  it('plays the main video on a wide screen', () => {
    expect(pickVideoSource(sources, { narrow: false, saveData: false })).toBe('/desktop.mp4')
  })

  it('plays the main video on a narrow screen when there is no mobile copy', () => {
    for (const mobileSrc of [undefined, null, '']) {
      expect(
        pickVideoSource({ src: '/desktop.mp4', mobileSrc }, { narrow: true, saveData: false }),
      ).toBe('/desktop.mp4')
    }
  })

  it('plays nothing when the visitor saves data, on any screen', () => {
    expect(pickVideoSource(sources, { narrow: true, saveData: true })).toBeNull()
    expect(pickVideoSource(sources, { narrow: false, saveData: true })).toBeNull()
  })

  describe('reading the browser', () => {
    const stubMatchMedia = (matching: string[]) =>
      vi.stubGlobal(
        'matchMedia',
        vi.fn((query: string) => ({ matches: matching.includes(query) })),
      )

    afterEach(() => {
      vi.unstubAllGlobals()
      Reflect.deleteProperty(navigator, 'connection')
    })

    it('reads the narrow screen and no data saving', () => {
      stubMatchMedia([NARROW_QUERY])
      expect(readVideoEnvironment()).toEqual({ narrow: true, saveData: false })
    })

    it('reads Save-Data from navigator.connection', () => {
      stubMatchMedia([])
      Object.defineProperty(navigator, 'connection', {
        value: { saveData: true },
        configurable: true,
      })
      expect(readVideoEnvironment()).toEqual({ narrow: false, saveData: true })
    })

    it('reads prefers-reduced-data', () => {
      stubMatchMedia([REDUCED_DATA_QUERY])
      expect(readVideoEnvironment()).toEqual({ narrow: false, saveData: true })
    })
  })
})
