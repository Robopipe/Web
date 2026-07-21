import type { CollectionConfig } from 'payload'

import { anyone, authenticated } from '@/access'
import { slugField } from '@/fields/slug'
import { revalidateAfterChange, revalidateAfterDelete } from '@/hooks/revalidate'

export const Categories: CollectionConfig = {
  slug: 'categories',
  admin: {
    useAsTitle: 'title',
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
      name: 'title',
      type: 'text',
      required: true,
      localized: true,
    },
    slugField(),
  ],
}
