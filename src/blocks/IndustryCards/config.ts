import type { Block } from 'payload'

import { linkField } from '@/fields/link'

export const IndustryCards: Block = {
  slug: 'industryCards',
  interfaceName: 'IndustryCardsBlock',
  fields: [
    {
      name: 'heading',
      type: 'text',
      localized: true,
    },
    {
      name: 'text',
      type: 'textarea',
      localized: true,
    },
    {
      name: 'source',
      type: 'select',
      defaultValue: 'custom',
      options: [
        { label: 'Cards below', value: 'custom' },
        { label: 'Solutions (Site settings)', value: 'solutions' },
      ],
      admin: {
        description:
          'Solutions shows the solution pages from Site settings, the same as the footer.',
      },
    },
    {
      name: 'cards',
      type: 'array',
      admin: { condition: (_, sibling) => sibling?.source !== 'solutions' },
      validate: (value: unknown, { siblingData }: { siblingData: Record<string, unknown> }) =>
        siblingData?.source === 'solutions' || (Array.isArray(value) && value.length > 0)
          ? true
          : 'Add at least one card.',
      fields: [
        {
          name: 'image',
          type: 'upload',
          relationTo: 'media',
        },
        {
          name: 'title',
          type: 'text',
          required: true,
          localized: true,
        },
        {
          name: 'text',
          type: 'textarea',
          localized: true,
        },
        linkField({ required: false }),
        {
          name: 'exploreLabel',
          type: 'text',
          localized: true,
          admin: { description: 'Card link label, e.g. "Explore". Rendered with an arrow.' },
        },
      ],
    },
  ],
}
