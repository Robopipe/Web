import type { Block } from 'payload'

import { linkField } from '@/fields/link'

export const CTABanner: Block = {
  slug: 'ctaBanner',
  interfaceName: 'CTABannerBlock',
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
      name: 'links',
      type: 'array',
      maxRows: 2,
      admin: { description: 'First link renders filled, second outlined.' },
      fields: [linkField()],
    },
  ],
}
