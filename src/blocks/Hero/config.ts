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
      admin: { description: 'Chip label above the heading.' },
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
      admin: { description: 'First link renders as the filled CTA, second as outlined.' },
      fields: [linkField()],
    },
    {
      name: 'video',
      type: 'upload',
      relationTo: 'media',
      admin: { description: 'Looping full-width video below the copy (takes precedence over image).' },
    },
    {
      name: 'image',
      type: 'upload',
      relationTo: 'media',
    },
    {
      name: 'trust',
      type: 'group',
      admin: { description: 'Trust strip under the media (e.g. "Trusted in operations running …").' },
      fields: [
        {
          name: 'label',
          type: 'text',
          localized: true,
        },
        {
          name: 'items',
          type: 'array',
          maxRows: 4,
          fields: [
            {
              name: 'text',
              type: 'text',
              required: true,
              localized: true,
            },
          ],
        },
      ],
    },
    {
      name: 'variant',
      type: 'select',
      defaultValue: 'centered',
      options: [
        { label: 'Centered', value: 'centered' },
        { label: 'Split (text + image)', value: 'split' },
      ],
    },
  ],
}
