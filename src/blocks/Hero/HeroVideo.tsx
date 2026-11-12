'use client'

import React, { useEffect, useRef } from 'react'

import { pickVideoSource, readVideoEnvironment } from './videoSource'

type Props = {
  src: string
  /** Smaller copy for narrow screens (issue #30). */
  mobileSrc?: string | null
  className?: string
}

/**
 * Muted looping hero video. `preload="none"` keeps the large file off the
 * critical path: the browser fetches it only when playback starts, after the
 * page's `load` event. Muted inline playback from script is allowed on
 * desktop browsers and iOS Safari, so it still plays on its own.
 *
 * The video has no `src` in the HTML. The script picks the file when it starts
 * playback (see `videoSource.ts`). Until the first frame the element is
 * transparent, so the poster image under it shows (issue #30).
 */
export const HeroVideo: React.FC<Props> = ({ src, mobileSrc, className }) => {
  const ref = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const video = ref.current
    if (!video) return
    const start = () => {
      const chosen = pickVideoSource({ src, mobileSrc }, readVideoEnvironment())
      // Save-Data: no video at all, the poster stays.
      if (!chosen) return
      video.src = chosen
      // React does not reflect `muted` as an attribute; autoplay policies check the property.
      video.muted = true
      video.play().catch(() => {
        /* Autoplay blocked (e.g. low-power mode): the poster stays. */
      })
    }
    if (document.readyState === 'complete') {
      start()
      return
    }
    window.addEventListener('load', start, { once: true })
    return () => window.removeEventListener('load', start)
  }, [src, mobileSrc])

  return <video ref={ref} muted loop playsInline preload="none" className={className} />
}
