import type { CollectionConfig } from 'payload'

import { authenticated, nobody } from '@/access'

export const NewsletterSubscribers: CollectionConfig = {
  slug: 'newsletter-subscribers',
  admin: {
    useAsTitle: 'email',
    defaultColumns: ['email', 'locale', 'createdAt'],
    group: 'Sales',
    description: 'Blog newsletter signups. No sending is wired up yet — export or connect later.',
  },
  access: {
    // Created exclusively via the server action (Local API with overrideAccess),
    // so the public REST/GraphQL surface stays closed.
    create: nobody,
    read: authenticated,
    update: authenticated,
    delete: authenticated,
  },
  fields: [
    {
      name: 'email',
      type: 'email',
      required: true,
      unique: true,
    },
    {
      name: 'locale',
      type: 'select',
      options: ['cs', 'en'],
    },
    {
      name: 'sourcePage',
      type: 'text',
    },
  ],
  timestamps: true,
}
