import type { Block } from 'payload'

/** A YouTube video from the `videos` collection, loaded after a click (issue #22). */
export const VideoEmbed: Block = {
  slug: 'videoEmbed',
  interfaceName: 'VideoEmbedBlock',
  fields: [
    {
      name: 'video',
      type: 'relationship',
      relationTo: 'videos',
      required: true,
    },
  ],
}
