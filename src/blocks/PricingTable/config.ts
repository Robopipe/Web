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
      name: 'source',
      type: 'select',
      defaultValue: 'custom',
      options: [
        { label: 'Tiers below', value: 'custom' },
        { label: 'Pricing page', value: 'pricingPage' },
      ],
      admin: {
        description: 'Pricing page shows the tiers of the pricing page, so prices have one source.',
      },
    },
    {
      name: 'tiers',
      type: 'array',
      maxRows: 4,
      admin: { condition: (_, sibling) => sibling?.source !== 'pricingPage' },
      validate: (value: unknown, { siblingData }: { siblingData: Record<string, unknown> }) =>
        siblingData?.source === 'pricingPage' || (Array.isArray(value) && value.length > 0)
          ? true
          : 'Add at least one tier.',
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
          admin: {
            description:
              'One-liner under the name, e.g. "Prove it on one camera before you scale."',
          },
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
          admin: {
            description: 'Billing note, e.g. "3-month minimum · hardware rental included".',
          },
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
