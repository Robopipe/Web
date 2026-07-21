import type { Field } from 'payload'

export const seoField: Field = {
  name: 'seo',
  type: 'group',
  admin: {
    description: 'Overrides for search engines and social sharing. Falls back to the document title/excerpt.',
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      localized: true,
    },
    {
      name: 'description',
      type: 'textarea',
      localized: true,
      maxLength: 300,
    },
    {
      name: 'image',
      type: 'upload',
      relationTo: 'media',
      admin: { description: 'Social sharing image (1200×630 recommended).' },
    },
    {
      name: 'noIndex',
      type: 'checkbox',
      defaultValue: false,
      admin: { description: 'Exclude this page from search engines and the sitemap.' },
    },
  ],
}
