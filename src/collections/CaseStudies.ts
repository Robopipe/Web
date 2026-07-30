import type { CollectionConfig } from 'payload'

import { authenticated, publishedOrLoggedIn } from '@/access'
import { seoField } from '@/fields/seo'
import { slugField } from '@/fields/slug'
import { revalidateAfterChange, revalidateAfterDelete } from '@/hooks/revalidate'

export const CaseStudies: CollectionConfig = {
  slug: 'case-studies',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'customer', '_status', 'updatedAt'],
    group: 'Content',
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
      type: 'select',
      options: [
        { label: 'Food processing', value: 'food' },
        { label: 'Pharma & healthcare', value: 'pharma' },
        { label: 'Retail & e-commerce', value: 'retail' },
        { label: 'Logistics', value: 'logistics' },
      ],
      admin: { position: 'sidebar' },
    },
    {
      name: 'featured',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        position: 'sidebar',
        description: 'Featured study renders as the large two-column card on the listing.',
      },
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
          localized: true,
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
      localized: true,
      admin: {
        description: 'Optional long-form body — case studies are listing-only in v1.',
      },
    },
    seoField,
  ],
}
