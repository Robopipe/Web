import type { CollectionConfig } from 'payload'

import { authenticated, publishedOrLoggedIn } from '@/access'
import { pageBlocks } from '@/blocks'
import { seoField } from '@/fields/seo'
import { slugField } from '@/fields/slug'
import { revalidateAfterChange, revalidateAfterDelete } from '@/hooks/revalidate'
import { generatePreviewPath } from '@/lib/preview'

export const Pages: CollectionConfig = {
  slug: 'pages',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'slug', '_status', 'updatedAt'],
    group: 'Content',
    livePreview: {
      url: ({ data, locale }) =>
        generatePreviewPath({ collection: 'pages', slug: data?.slug, locale: locale.code }),
    },
    preview: (data, { locale }) =>
      generatePreviewPath({ collection: 'pages', slug: data?.slug as string, locale }),
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
    },
    slugField(),
    {
      name: 'layout',
      type: 'blocks',
      blocks: pageBlocks,
      required: true,
    },
    seoField,
  ],
}
