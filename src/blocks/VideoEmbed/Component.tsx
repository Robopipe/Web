import { getLocale } from 'next-intl/server'
import React from 'react'

import { Media } from '@/components/Media'
import type { Locale } from '@/i18n/routing'
import type { VideoEmbedBlock } from '@/payload-types'
import { youTubeEmbedUrl, youTubeId } from '@/lib/youtube'

import { YouTubePlayer } from './YouTubePlayer'

/** Heading, text and the click-to-load player of one video from the `videos` collection. */
export const VideoEmbedComponent = async ({ video }: VideoEmbedBlock) => {
  if (!video || typeof video === 'number') return null
  const id = youTubeId(video.url)
  if (!id) return null
  const locale = (await getLocale()) as Locale

  return (
    <section className="container-site py-12 lg:py-16">
      <div className="mx-auto max-w-3xl">
        <h2 className="mb-4 text-center">{video.title}</h2>
        <p className="mx-auto mb-8 max-w-2xl text-center text-text-60">{video.description}</p>
        <YouTubePlayer
          embedUrl={youTubeEmbedUrl(id, locale, video.language)}
          title={video.title}
          playLabel={video.playLabel}
          poster={
            <Media
              media={video.thumbnail}
              fill
              sizes="(min-width: 768px) 768px, 100vw"
              className="object-cover"
            />
          }
        />
      </div>
    </section>
  )
}
