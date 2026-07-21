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
      name: 'logos',
      type: 'array',
      required: true,
      minRows: 1,
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
