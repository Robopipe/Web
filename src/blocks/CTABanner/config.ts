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
    linkField(),
  ],
}
