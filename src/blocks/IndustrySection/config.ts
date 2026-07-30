import type { Block } from 'payload'

/** Full-width alternating industry section: image + check bullets + stat pair, with an anchor id. */
export const IndustrySection: Block = {
  slug: 'industrySection',
  interfaceName: 'IndustrySectionBlock',
  fields: [
    {
      name: 'anchor',
      type: 'text',
      admin: { description: 'Anchor id for deep links, e.g. "food" → /industries#food.' },
    },
    {
      name: 'chip',
      type: 'text',
      localized: true,
      admin: { description: 'Chip label, e.g. "Food processing".' },
    },
    {
      name: 'heading',
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
      name: 'image',
      type: 'upload',
      relationTo: 'media',
    },
    {
      name: 'imageSide',
      type: 'select',
      defaultValue: 'left',
      options: [
        { label: 'Image left', value: 'left' },
        { label: 'Image right', value: 'right' },
      ],
    },
    {
      name: 'background',
      type: 'select',
      defaultValue: 'white',
      options: [
        { label: 'White', value: 'white' },
        { label: 'Tinted', value: 'tinted' },
      ],
    },
    {
      name: 'bullets',
      type: 'array',
      maxRows: 8,
      fields: [
        {
          name: 'text',
          type: 'text',
          required: true,
          localized: true,
        },
      ],
    },
    {
      name: 'stats',
      type: 'array',
      maxRows: 3,
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
  ],
}
