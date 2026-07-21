import type { Block } from 'payload'

import { linkField } from '@/fields/link'

export const PricingTable: Block = {
  slug: 'pricingTable',
  interfaceName: 'PricingTableBlock',
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
      name: 'tiers',
      type: 'array',
      required: true,
      minRows: 1,
      maxRows: 4,
      fields: [
        {
          name: 'name',
          type: 'text',
          required: true,
          localized: true,
        },
        {
          name: 'price',
          type: 'text',
          required: true,
          localized: true,
          admin: { description: 'E.g. "from €2,990" / "od 74 900 Kč" or "Individual".' },
        },
        {
          name: 'period',
          type: 'text',
          localized: true,
          admin: { description: 'E.g. "per kit" or "per month". Optional.' },
        },
        {
          name: 'description',
          type: 'textarea',
          localized: true,
        },
        {
          name: 'features',
          type: 'array',
          fields: [
            {
              name: 'text',
              type: 'text',
              required: true,
              localized: true,
            },
          ],
        },
        linkField({ name: 'cta' }),
        {
          name: 'highlighted',
          type: 'checkbox',
          defaultValue: false,
          admin: { description: 'Visually emphasize this tier as the recommended one.' },
        },
      ],
    },
    {
      name: 'footnote',
      type: 'text',
      localized: true,
      admin: { description: 'Small print below the table, e.g. VAT note.' },
    },
  ],
}
