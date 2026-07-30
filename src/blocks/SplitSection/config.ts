import type { Block } from 'payload'

/** Two-column section: latest blog posts on the left, FAQ accordion on the right. */
export const SplitSection: Block = {
  slug: 'splitSection',
  interfaceName: 'SplitSectionBlock',
  fields: [
    {
      name: 'blog',
      type: 'group',
      fields: [
        {
          name: 'heading',
          type: 'text',
          localized: true,
          admin: { description: 'E.g. "From the blog".' },
        },
        {
          name: 'limit',
          type: 'number',
          defaultValue: 2,
          min: 1,
          max: 4,
        },
      ],
    },
    {
      name: 'faq',
      type: 'group',
      fields: [
        {
          name: 'heading',
          type: 'text',
          localized: true,
          admin: { description: 'E.g. "Questions, answered."' },
        },
        {
          name: 'faqs',
          type: 'relationship',
          relationTo: 'faqs',
          hasMany: true,
        },
      ],
    },
  ],
}
