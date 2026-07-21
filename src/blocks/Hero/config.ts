import type { Block } from 'payload'

import { linkField } from '@/fields/link'

export const Hero: Block = {
  slug: 'hero',
  interfaceName: 'HeroBlock',
  fields: [
    {
      name: 'eyebrow',
      type: 'text',
      localized: true,
      admin: { description: 'Small label above the heading.' },
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
      name: 'links',
      type: 'array',
      maxRows: 2,
      fields: [linkField()],
    },
    {
      name: 'image',
      type: 'upload',
      relationTo: 'media',
    },
    {
      name: 'variant',
      type: 'select',
      defaultValue: 'split',
      options: [
        { label: 'Split (text + image)', value: 'split' },
        { label: 'Centered', value: 'centered' },
      ],
    },
  ],
}
