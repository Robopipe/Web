import type { CollectionConfig } from 'payload'

import { admins, authenticated } from '@/access'

export const Users: CollectionConfig = {
  slug: 'users',
  admin: {
    useAsTitle: 'email',
    group: 'System',
  },
  auth: true,
  access: {
    read: authenticated,
    create: admins,
    update: admins,
    delete: admins,
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    {
      name: 'role',
      type: 'select',
      required: true,
      defaultValue: 'editor',
      options: [
        { label: 'Admin', value: 'admin' },
        { label: 'Editor', value: 'editor' },
      ],
      access: {
        // Only admins can change roles; editors cannot promote themselves.
        update: ({ req: { user } }) => user?.role === 'admin',
      },
    },
  ],
}
