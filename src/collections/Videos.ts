import type { CollectionConfig } from 'payload'

import { anyone, authenticated } from '@/access'
import { revalidateAfterChange, revalidateAfterDelete } from '@/hooks/revalidate'
import { youTubeId } from '@/lib/youtube'

/**
 * YouTube videos shown on the site (issue #22). One document per video. Pages
 * show a video with the `videoEmbed` block, which only references the document,
 * so the address and the texts exist once for all pages.
 */
export const Videos: CollectionConfig = {
  slug: 'videos',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'url', 'updatedAt'],
    group: 'Content',
  },
  access: {
    read: anyone,
    create: authenticated,
    update: authenticated,
    delete: authenticated,
  },
  hooks: {
    afterChange: [revalidateAfterChange],
    afterDelete: [revalidateAfterDelete],
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
      localized: true,
      admin: { description: 'Heading above the player. Also the video name in structured data.' },
    },
    {
      name: 'description',
      type: 'textarea',
      required: true,
      localized: true,
      admin: { description: 'One or two sentences under the heading and in structured data.' },
    },
    {
      name: 'url',
      type: 'text',
      required: true,
      admin: { description: 'YouTube address, for example https://www.youtube.com/watch?v=…' },
      validate: (value: string | null | undefined) =>
        youTubeId(value) ? true : 'Enter a YouTube video address.',
    },
    {
      name: 'thumbnail',
      type: 'upload',
      relationTo: 'media',
      required: true,
      admin: {
        description:
          'Preview image (16:9) shown before the click. Served from this site, not from YouTube.',
      },
    },
    {
      name: 'playLabel',
      type: 'text',
      required: true,
      localized: true,
      admin: {
        description: 'Accessible name of the play button, for example "Play video: … (50 s)".',
      },
    },
    {
      name: 'language',
      type: 'select',
      required: true,
      defaultValue: 'cs',
      options: [
        { label: 'Czech', value: 'cs' },
        { label: 'English', value: 'en' },
      ],
      admin: {
        description: 'Spoken language. Pages in another language start the video with captions.',
      },
    },
    {
      type: 'row',
      fields: [
        {
          name: 'uploadDate',
          type: 'date',
          required: true,
          admin: {
            date: { pickerAppearance: 'dayOnly', displayFormat: 'd. M. yyyy' },
            description: 'Date of publication on YouTube.',
          },
        },
        {
          name: 'duration',
          type: 'number',
          required: true,
          min: 1,
          admin: { description: 'Length in seconds.', step: 1 },
        },
      ],
    },
  ],
}
