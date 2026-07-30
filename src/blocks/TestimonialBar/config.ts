import type { Block } from 'payload'

import { linkField } from '@/fields/link'

export const TestimonialBar: Block = {
  slug: 'testimonialBar',
  interfaceName: 'TestimonialBarBlock',
  fields: [
    {
      name: 'eyebrow',
      type: 'text',
      localized: true,
      admin: { description: 'Chip label above the quote (e.g. "Customer story").' },
    },
    {
      name: 'heading',
      type: 'text',
      localized: true,
    },
    {
      name: 'testimonials',
      type: 'relationship',
      relationTo: 'testimonials',
      hasMany: true,
      required: true,
      admin: {
        description: 'A single testimonial renders as a large centered pull quote.',
      },
    },
    {
      name: 'link',
      type: 'group',
      admin: { description: 'Optional inline link after the attribution (e.g. "read the case study").' },
      fields: [linkField({ required: false })],
    },
  ],
}
