'use client'

import React, { useEffect, useRef } from 'react'

type Props = {
  src: string
  poster?: string
  className?: string
}

/**
 * Muted looping hero video. `preload="none"` keeps the large file off the
 * critical path: the browser fetches it only when playback starts, after the
 * page's `load` event. Muted inline playback from script is allowed on
 * desktop browsers and iOS Safari, so it still plays on its own.
 */
export const HeroVideo: React.FC<Props> = ({ src, poster, className }) => {
  const ref = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const video = ref.current
    if (!video) return
    const start = () => {
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
  }, [])

  return (
    <video
      ref={ref}
      muted
      loop
      playsInline
      preload="none"
      poster={poster}
      src={src}
      className={className}
    />
  )
}
