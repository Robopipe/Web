import { describe, expect, it } from 'vitest'

import {
  DEFAULT_SIZES,
  FIGURE_SIZES,
  HALF_SIZES,
  fixedHeightSizes,
  gridSizes,
} from '@/lib/imageSizes'

/**
 * Issue #30: `sizes` for next/image. Each value must cover the widest rendered box
 * (desktop stays sharp) and say `100vw` on a phone (no 1920 px file for a 360 px box).
 */
describe('image sizes', () => {
  it('ends with the full width on phones', () => {
    for (const sizes of [DEFAULT_SIZES, HALF_SIZES, FIGURE_SIZES, gridSizes(3, 24)]) {
      expect(sizes.endsWith(', 100vw')).toBe(true)
    }
  })

  it('caps the default at the container content width', () => {
    expect(DEFAULT_SIZES).toBe('(min-width: 1152px) 1088px, 100vw')
  })

  it('gives one card of a grid, with the gaps taken out', () => {
    // (1088 - 2 * 24) / 3 = 346.67
    expect(gridSizes(3, 24)).toBe(
      '(min-width: 1152px) 347px, (min-width: 1024px) 34vw, (min-width: 640px) 50vw, 100vw',
    )
    // (1088 - 3 * 20) / 4 = 257
    expect(gridSizes(4, 20)).toBe(
      '(min-width: 1152px) 257px, (min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw',
    )
    // Two columns from sm on: half the viewport up to the container.
    expect(gridSizes(2, 24)).toBe('(min-width: 1152px) 532px, (min-width: 640px) 50vw, 100vw')
    expect(gridSizes(1, 24)).toBe(DEFAULT_SIZES)
  })

  it('gives the exact width of a logo at a fixed height', () => {
    expect(fixedHeightSizes(48, { width: 400, height: 100 })).toBe('192px')
    expect(fixedHeightSizes(48, { width: 400, height: 300 })).toBe('64px')
    expect(fixedHeightSizes(48, { width: 400, height: null })).toBeUndefined()
    expect(fixedHeightSizes(48, null)).toBeUndefined()
  })
})
