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
          name: 'tagline',
          type: 'text',
          localized: true,
          admin: { description: 'One-liner under the name, e.g. "Prove it on one camera before you scale."' },
        },
        {
          name: 'price',
          type: 'text',
          required: true,
          localized: true,
          admin: { description: 'E.g. "€390" / "9 900 Kč" or "Custom".' },
        },
        {
          name: 'period',
          type: 'text',
          localized: true,
          admin: { description: 'E.g. "/ camera". Optional.' },
        },
        {
          name: 'subNote',
          type: 'text',
          localized: true,
          admin: { description: 'Billing note, e.g. "3-month minimum · hardware rental included".' },
        },
        {
          name: 'featuresLeadIn',
          type: 'text',
          localized: true,
          admin: { description: 'Bold lead-in above features, e.g. "Everything in Standard and".' },
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
          name: 'ctaVariant',
          type: 'select',
          defaultValue: 'outlined',
          options: [
            { label: 'Filled', value: 'filled' },
            { label: 'Outlined', value: 'outlined' },
          ],
        },
        {
          name: 'highlighted',
          type: 'checkbox',
          defaultValue: false,
          admin: { description: 'Renders as the dark "Most popular" card.' },
        },
        {
          name: 'badge',
          type: 'text',
          localized: true,
          admin: {
            description: 'Badge on the highlighted card, e.g. "Most popular".',
            condition: (_data, siblingData) => Boolean(siblingData?.highlighted),
          },
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
