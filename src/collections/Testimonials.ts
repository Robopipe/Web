import type { CollectionConfig } from 'payload'

import { anyone, authenticated } from '@/access'
import { revalidateAfterChange, revalidateAfterDelete } from '@/hooks/revalidate'

export const Testimonials: CollectionConfig = {
  slug: 'testimonials',
  admin: {
    useAsTitle: 'personName',
    group: 'Content',
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
      name: 'quote',
      type: 'textarea',
      required: true,
      localized: true,
    },
    {
      name: 'personName',
      type: 'text',
      required: true,
    },
    {
      name: 'personRole',
      type: 'text',
      localized: true,
    },
    {
      name: 'company',
      type: 'text',
    },
    {
      name: 'avatar',
      type: 'upload',
      relationTo: 'media',
    },
    {
      name: 'companyLogo',
      type: 'upload',
      relationTo: 'media',
    },
  ],
}
