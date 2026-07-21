import type { Field } from 'payload'

type LinkOptions = {
  name?: string
  required?: boolean
}

/** Reusable link group: either an internal page reference or an external URL. */
export const linkField = ({ name = 'link', required = true }: LinkOptions = {}): Field => ({
  name,
  type: 'group',
  fields: [
    {
      name: 'label',
      type: 'text',
      required,
      localized: true,
    },
    {
      name: 'type',
      type: 'radio',
      defaultValue: 'internal',
      options: [
        { label: 'Internal page', value: 'internal' },
        { label: 'External URL', value: 'external' },
      ],
      admin: { layout: 'horizontal' },
    },
    {
      name: 'page',
      type: 'relationship',
      relationTo: 'pages',
      admin: {
        condition: (_data, siblingData) => siblingData?.type === 'internal',
      },
    },
    {
      name: 'url',
      type: 'text',
      admin: {
        condition: (_data, siblingData) => siblingData?.type === 'external',
      },
    },
    {
      name: 'newTab',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        condition: (_data, siblingData) => siblingData?.type === 'external',
      },
    },
  ],
})
