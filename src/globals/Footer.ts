import type { GlobalConfig } from 'payload'

import { anyone, authenticated } from '@/access'
import { linkField } from '@/fields/link'
import { revalidateGlobal } from '@/hooks/revalidate'

export const Footer: GlobalConfig = {
  slug: 'footer',
  admin: { group: 'Site' },
  access: {
    read: anyone,
    update: authenticated,
  },
  hooks: {
    afterChange: [revalidateGlobal],
  },
  fields: [
    {
      name: 'columns',
      type: 'array',
      maxRows: 4,
      fields: [
        {
          name: 'title',
          type: 'text',
          required: true,
          localized: true,
        },
        {
          name: 'links',
          type: 'array',
          fields: [linkField()],
        },
      ],
    },
    {
      name: 'note',
      type: 'textarea',
      localized: true,
      admin: { description: 'Short company blurb shown next to the logo.' },
    },
    {
      name: 'legalLinks',
      type: 'array',
      maxRows: 3,
      admin: { description: 'Links in the bottom bar (e.g. Privacy Policy).' },
      fields: [linkField()],
    },
    {
      name: 'copyright',
      type: 'text',
      admin: {
        description: 'Legal entity for the © line, e.g. "Robopipe s.r.o." (year is added automatically).',
      },
    },
  ],
}
