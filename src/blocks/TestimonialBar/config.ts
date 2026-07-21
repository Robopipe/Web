import type { Block } from 'payload'

export const TestimonialBar: Block = {
  slug: 'testimonialBar',
  interfaceName: 'TestimonialBarBlock',
  fields: [
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
    },
  ],
}
