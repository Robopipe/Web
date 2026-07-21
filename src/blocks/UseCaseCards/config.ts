import type { Block } from 'payload'

export const UseCaseCards: Block = {
  slug: 'useCaseCards',
  interfaceName: 'UseCaseCardsBlock',
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
        {
          name: 'page',
          type: 'relationship',
          relationTo: 'pages',
          admin: { description: 'Use-case landing page this card links to.' },
        },
      ],
    },
  ],
}
