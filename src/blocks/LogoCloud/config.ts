import type { Block } from 'payload'

export const LogoCloud: Block = {
  slug: 'logoCloud',
  interfaceName: 'LogoCloudBlock',
  fields: [
    {
      name: 'heading',
      type: 'text',
      localized: true,
      admin: { description: 'E.g. "Trusted by manufacturing teams".' },
    },
    {
      name: 'source',
      type: 'select',
      defaultValue: 'custom',
      options: [
        { label: 'Logos below', value: 'custom' },
        { label: 'Memberships (Site settings)', value: 'memberships' },
      ],
      admin: {
        description: 'Memberships shows the logos from Site settings, the same as the footer.',
      },
    },
    {
      name: 'logos',
      type: 'array',
      admin: { condition: (_, sibling) => sibling?.source !== 'memberships' },
      validate: (value: unknown, { siblingData }: { siblingData: Record<string, unknown> }) =>
        siblingData?.source === 'memberships' || (Array.isArray(value) && value.length > 0)
          ? true
          : 'Add at least one logo.',
      fields: [
        {
          name: 'logo',
          type: 'upload',
          relationTo: 'media',
          required: true,
        },
        {
          name: 'name',
          type: 'text',
          required: true,
        },
        {
          name: 'url',
          type: 'text',
        },
      ],
    },
  ],
}
