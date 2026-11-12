import { EXPERIMENTAL_TableFeature, lexicalEditor } from '@payloadcms/richtext-lexical'
import type { CollectionConfig } from 'payload'

import { authenticated, publishedOrLoggedIn } from '@/access'
import { seoField } from '@/fields/seo'
import { slugField } from '@/fields/slug'
import { indexNowAfterChange } from '@/hooks/indexNow'
import { revalidateAfterChange, revalidateAfterDelete } from '@/hooks/revalidate'
import { generatePreviewPath } from '@/lib/preview'
import { readingTimeMinutes } from '@/lib/readingTime'

export const Posts: CollectionConfig = {
  slug: 'posts',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'publishedAt', '_status', 'updatedAt'],
    group: 'Blog',
    livePreview: {
      url: ({ data, locale }) =>
        generatePreviewPath({ collection: 'posts', slug: data?.slug, locale: locale.code }),
      openByDefault: true,
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
    afterChange: [revalidateAfterChange, indexNowAfterChange('posts')],
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
      name: 'heroStyle',
      type: 'select',
      defaultValue: 'photo',
      options: [
        { label: 'Photo (full bleed)', value: 'photo' },
        { label: 'Framed screenshot on dark gradient', value: 'framed' },
      ],
      admin: { position: 'sidebar' },
    },
    {
      name: 'content',
      type: 'richText',
      required: true,
      localized: true,
      editor: lexicalEditor({
        features: ({ defaultFeatures }) => [...defaultFeatures, EXPERIMENTAL_TableFeature()],
      }),
      admin: {
        description:
          'Blockquotes render as lime callout boxes on the site. Tables: use the + menu or type "/table". Turn on the header row in the cell menu.',
      },
    },
    {
      name: 'ctaHeadline',
      type: 'text',
      localized: true,
      admin: {
        description:
          'Headline of the dark "Book a demo" section under the post, e.g. "Run the pipeline on your own products." Falls back to a default when empty.',
      },
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
          // Only the visible text counts, not the Lexical JSON around it.
          ({ siblingData }) => readingTimeMinutes(siblingData?.content),
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
