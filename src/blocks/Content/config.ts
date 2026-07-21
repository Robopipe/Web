import type { Block } from 'payload'

export const Content: Block = {
  slug: 'content',
  interfaceName: 'ContentBlock',
  fields: [
    {
      name: 'content',
      type: 'richText',
      required: true,
      localized: true,
    },
    {
      name: 'width',
      type: 'select',
      defaultValue: 'narrow',
      options: [
        { label: 'Narrow (prose)', value: 'narrow' },
        { label: 'Wide', value: 'wide' },
      ],
    },
  ],
}
