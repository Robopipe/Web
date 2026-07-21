import type { GlobalConfig } from 'payload'

import { anyone, authenticated } from '@/access'
import { linkField } from '@/fields/link'
import { revalidateGlobal } from '@/hooks/revalidate'

export const Header: GlobalConfig = {
  slug: 'header',
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
      name: 'navItems',
      type: 'array',
      maxRows: 7,
      fields: [linkField()],
    },
    {
      name: 'cta',
      type: 'group',
      admin: { description: 'Highlighted button at the end of the navigation.' },
      fields: [linkField({ required: false })],
    },
  ],
}
