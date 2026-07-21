import type { CollectionConfig } from 'payload'

import { anyone, authenticated } from '@/access'
import { revalidateAfterChange, revalidateAfterDelete } from '@/hooks/revalidate'

export const Redirects: CollectionConfig = {
  slug: 'redirects',
  admin: {
    useAsTitle: 'from',
    group: 'System',
    description: 'Editor-managed redirects, applied when a URL is not found.',
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
      name: 'from',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      admin: { description: 'Path to redirect from, e.g. /en/old-page.' },
    },
    {
      name: 'to',
      type: 'text',
      required: true,
      admin: { description: 'Destination path or absolute URL.' },
    },
    {
      name: 'permanent',
      type: 'checkbox',
      defaultValue: true,
    },
  ],
}
