/**
 * Which hero video file a browser plays (issue #30). Phones get the smaller copy when
 * the editor uploaded one. A visitor who asks to save data gets no video: the poster
 * image under the video stays.
 */

/** Screens below Tailwind's `md` breakpoint. The mobile copy is 640 px wide. */
export const NARROW_QUERY = '(max-width: 767px)'
/** Media query for data saving. Only some browsers support it, others never match. */
export const REDUCED_DATA_QUERY = '(prefers-reduced-data: reduce)'

export type VideoSources = { src: string; mobileSrc?: string | null }

export type VideoEnvironment = {
  /** The viewport matches `NARROW_QUERY`. */
  narrow: boolean
  /** `Save-Data` (`navigator.connection.saveData`) or `prefers-reduced-data: reduce`. */
  saveData: boolean
}

/** The file to play, or `null` when the video must not start. */
export const pickVideoSource = (
  { src, mobileSrc }: VideoSources,
  { narrow, saveData }: VideoEnvironment,
): string | null => {
  if (saveData) return null
  return narrow && mobileSrc ? mobileSrc : src
}

type NetworkInformation = { saveData?: boolean }

/** Reads the environment in the browser. */
export const readVideoEnvironment = (): VideoEnvironment => {
  const connection = (navigator as Navigator & { connection?: NetworkInformation }).connection
  return {
    narrow: window.matchMedia(NARROW_QUERY).matches,
    saveData: connection?.saveData === true || window.matchMedia(REDUCED_DATA_QUERY).matches,
  }
}
