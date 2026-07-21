import type { CollectionConfig } from 'payload'

import { anyone, authenticated } from '@/access'
import { revalidateAfterChange, revalidateAfterDelete } from '@/hooks/revalidate'

export const Authors: CollectionConfig = {
  slug: 'authors',
  admin: {
    useAsTitle: 'name',
    group: 'Blog',
  },
  access: {
    read: anyone,
    create: authenticated,
    update: authenticated,
    delete: authenticated,
  },
  hooks: {
    afterChange: [revalidateAfterChange],
    afterDelete: [revalidateAfterDelete],
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    {
      name: 'role',
      type: 'text',
      localized: true,
      admin: { description: 'E.g. "CTO" or "Machine vision engineer".' },
    },
    {
      name: 'photo',
      type: 'upload',
      relationTo: 'media',
    },
    {
      name: 'bio',
      type: 'textarea',
      localized: true,
    },
  ],
}
