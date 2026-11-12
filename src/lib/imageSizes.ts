/**
 * `sizes` values for next/image (issue #30). Without `sizes`, next/image offers only
 * 1x and 2x of the source width, so phones got the 1920 px variant of a 768 px card.
 * The values follow the layout: `container-site` is at most 1152 px wide with 32 px
 * padding on each side from `lg`, so its content is at most 1088 px.
 */

/** Content width of `container-site` at its widest. */
const CONTAINER = 1088
/** The viewport width where `container-site` stops growing. */
const CONTAINER_MAX = 1152

/** Fallback for images whose caller gives no `sizes`: never wider than the container. */
export const DEFAULT_SIZES = `(min-width: ${CONTAINER_MAX}px) ${CONTAINER}px, 100vw`

/**
 * One column of a two-column `lg` grid (image next to text). The upper bound has a small
 * margin: `object-cover` in a box with a minimum height can scale the image past its column.
 */
export const HALF_SIZES = `(min-width: ${CONTAINER_MAX}px) 560px, (min-width: 1024px) 50vw, 100vw`

/** A figure in a `max-w-4xl` (896 px) column inside the container. */
export const FIGURE_SIZES = '(min-width: 960px) 896px, 100vw'

/**
 * One card of a grid with two columns from `sm` and `lgColumns` columns from `lg`.
 * `gap` is the grid gap in px. Below `sm` a card is the full width.
 */
export const gridSizes = (lgColumns: 1 | 2 | 3 | 4, gap: number): string => {
  if (lgColumns === 1) return DEFAULT_SIZES
  const card = Math.ceil((CONTAINER - gap * (lgColumns - 1)) / lgColumns)
  const lg = lgColumns === 2 ? '' : `(min-width: 1024px) ${Math.ceil(100 / lgColumns)}vw, `
  return `(min-width: ${CONTAINER_MAX}px) ${card}px, ${lg}(min-width: 640px) 50vw, 100vw`
}

/**
 * A logo drawn at a fixed CSS height (`h-12` is 48 px) with its own aspect ratio.
 * Gives the exact rendered width, so a 48 px logo no longer gets a 640 px file.
 */
export const fixedHeightSizes = (
  height: number,
  media: { width?: number | null; height?: number | null } | null | undefined,
): string | undefined => {
  if (!media?.width || !media.height) return undefined
  return `${Math.ceil((height * media.width) / media.height)}px`
}
