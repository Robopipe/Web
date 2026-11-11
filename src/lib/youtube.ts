import type { Locale } from '@/i18n/routing'

/**
 * YouTube addresses for the click-to-load player (issue #22). Pure functions.
 * The page loads nothing from YouTube until the visitor clicks play. The player
 * then comes from youtube-nocookie.com, which sets no cookies before playback.
 */

const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/
const YOUTUBE_HOSTS = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'youtu.be',
  'youtube-nocookie.com',
  'www.youtube-nocookie.com',
])

/**
 * The video ID of a YouTube address: watch, youtu.be, embed and shorts forms.
 * Null for any other address.
 */
export const youTubeId = (address: string | null | undefined): string | null => {
  if (!address) return null
  let url: URL
  try {
    url = new URL(address.trim())
  } catch {
    return null
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null
  if (!YOUTUBE_HOSTS.has(url.hostname)) return null
  const segments = url.pathname.split('/').filter(Boolean)
  const id =
    url.hostname === 'youtu.be'
      ? segments[0]
      : segments[0] === 'watch'
        ? url.searchParams.get('v')
        : segments[0] === 'embed' || segments[0] === 'shorts'
          ? segments[1]
          : undefined
  return id && VIDEO_ID.test(id) ? id : null
}

/** The public watch page of a video. */
export const youTubeWatchUrl = (id: string): string => `https://www.youtube.com/watch?v=${id}`

/**
 * The player address after the click. `hl` sets the player language and
 * `cc_lang_pref` the caption language to the page locale. When the page locale
 * differs from the spoken language, captions are on from the start.
 */
export const youTubeEmbedUrl = (id: string, locale: Locale, spokenLanguage: Locale): string => {
  const params = new URLSearchParams({
    autoplay: '1',
    hl: locale,
    cc_lang_pref: locale,
    rel: '0',
  })
  if (locale !== spokenLanguage) params.set('cc_load_policy', '1')
  return `https://www.youtube-nocookie.com/embed/${id}?${params}`
}

/**
 * A length in seconds as an ISO 8601 duration: 50 → PT50S, 125 → PT2M5S, 3600 → PT1H.
 * Null for a missing or non-positive length.
 */
export const isoDuration = (seconds: number | null | undefined): string | null => {
  const total = Math.round(seconds ?? 0)
  if (!Number.isFinite(total) || total <= 0) return null
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  return `PT${h ? `${h}H` : ''}${m ? `${m}M` : ''}${s ? `${s}S` : ''}`
}
