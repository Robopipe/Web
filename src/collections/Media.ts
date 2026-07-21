import type { CollectionConfig } from 'payload'

import { anyone, authenticated } from '@/access'

export const Media: CollectionConfig = {
  slug: 'media',
  admin: {
    group: 'Content',
  },
  access: {
    read: anyone,
    create: authenticated,
    update: authenticated,
    delete: authenticated,
  },
  upload: {
    focalPoint: true,
    imageSizes: [
      { name: 'thumbnail', width: 400 },
      { name: 'card', width: 768 },
      { name: 'hero', width: 1600 },
      { name: 'og', width: 1200, height: 630, crop: 'center' },
    ],
    mimeTypes: ['image/*', 'application/pdf', 'video/*'],
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      required: true,
      localized: true,
      admin: { description: 'Alternative text for accessibility and SEO.' },
    },
  ],
}
