import type { Block } from 'payload'

export const BlogTeaser: Block = {
  slug: 'blogTeaser',
  interfaceName: 'BlogTeaserBlock',
  fields: [
    {
      name: 'heading',
      type: 'text',
      localized: true,
    },
    {
      name: 'limit',
      type: 'number',
      defaultValue: 3,
      min: 1,
      max: 6,
    },
  ],
}
