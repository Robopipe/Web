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
      name: 'cards',
      type: 'array',
      required: true,
      minRows: 1,
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
