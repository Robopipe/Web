import type { CollectionConfig } from 'payload'

import { authenticated, publishedOrLoggedIn } from '@/access'
import { seoField } from '@/fields/seo'
import { slugField } from '@/fields/slug'
import { revalidateAfterChange, revalidateAfterDelete } from '@/hooks/revalidate'
import { generatePreviewPath } from '@/lib/preview'

export const CaseStudies: CollectionConfig = {
  slug: 'case-studies',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'customer', '_status', 'updatedAt'],
    group: 'Content',
    livePreview: {
      url: ({ data, locale }) =>
        generatePreviewPath({ collection: 'case-studies', slug: data?.slug, locale: locale.code }),
    },
    preview: (data, { locale }) =>
      generatePreviewPath({ collection: 'case-studies', slug: data?.slug as string, locale }),
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
      name: 'customer',
      type: 'text',
      required: true,
      admin: { position: 'sidebar' },
    },
    {
      name: 'industry',
      type: 'text',
      localized: true,
      admin: { position: 'sidebar', description: 'E.g. "Pharma", "Logistics".' },
    },
    {
      name: 'customerLogo',
      type: 'upload',
      relationTo: 'media',
      admin: { position: 'sidebar' },
    },
    {
      name: 'heroImage',
      type: 'upload',
      relationTo: 'media',
    },
    {
      name: 'excerpt',
      type: 'textarea',
      localized: true,
      admin: { description: 'Short summary for listings and SEO fallback.' },
    },
    {
      name: 'metrics',
      type: 'array',
      maxRows: 4,
      admin: { description: 'Headline results, e.g. "99.7% – defect detection accuracy".' },
      fields: [
        {
          name: 'value',
          type: 'text',
          required: true,
        },
        {
          name: 'label',
          type: 'text',
          required: true,
          localized: true,
        },
      ],
    },
    {
      name: 'content',
      type: 'richText',
      required: true,
      localized: true,
    },
    seoField,
  ],
}
