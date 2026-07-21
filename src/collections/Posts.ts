import type { CollectionConfig } from 'payload'

import { authenticated, publishedOrLoggedIn } from '@/access'
import { seoField } from '@/fields/seo'
import { slugField } from '@/fields/slug'
import { revalidateAfterChange, revalidateAfterDelete } from '@/hooks/revalidate'
import { generatePreviewPath } from '@/lib/preview'

export const Posts: CollectionConfig = {
  slug: 'posts',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'publishedAt', '_status', 'updatedAt'],
    group: 'Blog',
    livePreview: {
      url: ({ data, locale }) =>
        generatePreviewPath({ collection: 'posts', slug: data?.slug, locale: locale.code }),
    },
    preview: (data, { locale }) =>
      generatePreviewPath({ collection: 'posts', slug: data?.slug as string, locale }),
  },
  access: {
    read: publishedOrLoggedIn,
    create: authenticated,
    update: authenticated,
    delete: authenticated,
  },
  versions: {
    drafts: {
      autosave: { interval: 300 },
    },
    maxPerDoc: 25,
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
      admin: {
        description:
          'A post appears only in locales where it has a title and slug — leave a locale empty to keep the post out of that locale.',
      },
    },
    slugField(),
    {
      name: 'excerpt',
      type: 'textarea',
      localized: true,
      admin: { description: 'Short summary for listings, RSS and SEO fallback.' },
    },
    {
      name: 'heroImage',
      type: 'upload',
      relationTo: 'media',
    },
    {
      name: 'content',
      type: 'richText',
      required: true,
      localized: true,
    },
    {
      name: 'readingTime',
      type: 'number',
      admin: {
        position: 'sidebar',
        readOnly: true,
        description: 'Minutes — computed from content on save.',
      },
      hooks: {
        beforeChange: [
          ({ siblingData }) => {
            const words = JSON.stringify(siblingData?.content ?? '')
              .replace(/[^\p{L}\p{N}\s]/gu, ' ')
              .split(/\s+/)
              .filter(Boolean).length
            return Math.max(1, Math.round(words / 220))
          },
        ],
      },
    },
    {
      name: 'authors',
      type: 'relationship',
      relationTo: 'authors',
      hasMany: true,
      admin: { position: 'sidebar' },
    },
    {
      name: 'categories',
      type: 'relationship',
      relationTo: 'categories',
      hasMany: true,
      admin: { position: 'sidebar' },
    },
    {
      name: 'publishedAt',
      type: 'date',
      admin: {
        position: 'sidebar',
        date: { pickerAppearance: 'dayAndTime' },
      },
      hooks: {
        beforeChange: [
          ({ siblingData, value }) => {
            if (siblingData._status === 'published' && !value) return new Date()
            return value
          },
        ],
      },
    },
    seoField,
  ],
}
