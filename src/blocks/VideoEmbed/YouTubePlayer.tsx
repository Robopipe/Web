'use client'

import React, { useEffect, useRef, useState } from 'react'

type Props = {
  /** youtube-nocookie.com player address, with autoplay. */
  embedUrl: string
  /** Title of the iframe for screen readers. */
  title: string
  /** Accessible name of the play button. */
  playLabel: string
  /** The preview image from this site. */
  poster: React.ReactNode
}

/**
 * Click-to-load YouTube player (issue #22). Before the click the page shows only
 * the preview image and a native button (Enter and Space work), so no request
 * goes to YouTube or Google and no cookie is set. The click swaps in the
 * youtube-nocookie.com iframe, which starts playing, and moves focus into it.
 */
export const YouTubePlayer: React.FC<Props> = ({ embedUrl, title, playLabel, poster }) => {
  const [playing, setPlaying] = useState(false)
  const frame = useRef<HTMLIFrameElement>(null)

  useEffect(() => {
    if (playing) frame.current?.focus()
  }, [playing])

  return (
    <div className="relative aspect-video overflow-hidden rounded-lg bg-surface-darkest">
      {playing ? (
        <iframe
          ref={frame}
          src={embedUrl}
          title={title}
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          className="absolute inset-0 h-full w-full border-0"
        />
      ) : (
        <button
          type="button"
          aria-label={playLabel}
          onClick={() => setPlaying(true)}
          className="group absolute inset-0 h-full w-full cursor-pointer focus-visible:outline-4 focus-visible:-outline-offset-4 focus-visible:outline-border-focus"
        >
          {poster}
          <span
            aria-hidden="true"
            className="absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-brand text-brand-ink shadow-lg transition-transform duration-150 group-hover:scale-110 sm:h-20 sm:w-20"
          >
            <svg viewBox="0 0 24 24" className="ml-1 h-7 w-7 sm:h-8 sm:w-8" fill="currentColor">
              <path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5Z" />
            </svg>
          </span>
        </button>
      )}
    </div>
  )
}
