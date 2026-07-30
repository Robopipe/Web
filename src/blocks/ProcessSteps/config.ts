import type { Block } from 'payload'

import { linkField } from '@/fields/link'

/** Dark "how it works" section: image + numbered steps + CTA + stat strip. */
export const ProcessSteps: Block = {
  slug: 'processSteps',
  interfaceName: 'ProcessStepsBlock',
  fields: [
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
      name: 'steps',
      type: 'array',
      required: true,
      minRows: 2,
      maxRows: 5,
      fields: [
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
    {
      name: 'cta',
      type: 'group',
      fields: [linkField({ required: false })],
    },
    {
      name: 'stats',
      type: 'array',
      maxRows: 5,
      admin: { description: 'Stat strip at the bottom of the section.' },
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
