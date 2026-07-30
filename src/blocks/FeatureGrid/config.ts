import type { Block } from 'payload'

import { iconOptions } from '@/components/icons'

export const FeatureGrid: Block = {
  slug: 'featureGrid',
  interfaceName: 'FeatureGridBlock',
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
      name: 'background',
      type: 'select',
      defaultValue: 'light',
      options: [
        { label: 'Light', value: 'light' },
        { label: 'Dark', value: 'dark' },
      ],
    },
    {
      name: 'columns',
      type: 'select',
      defaultValue: '3',
      options: ['2', '3', '4'],
    },
    {
      name: 'features',
      type: 'array',
      required: true,
      minRows: 1,
      fields: [
        {
          name: 'image',
          type: 'upload',
          relationTo: 'media',
          admin: { description: 'Optional card media header.' },
        },
        {
          name: 'imageStyle',
          type: 'select',
          defaultValue: 'cover',
          options: [
            { label: 'Full-bleed photo', value: 'cover' },
            { label: 'Framed screenshot on dark gradient', value: 'framed' },
          ],
          admin: {
            condition: (_data, siblingData) => Boolean(siblingData?.image),
          },
        },
        {
          name: 'icon',
          type: 'select',
          options: iconOptions,
          admin: { description: 'Design-system glyph shown in a lime-tint square.' },
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
      ],
    },
  ],
}
