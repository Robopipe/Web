import type { GlobalConfig } from 'payload'

import { anyone, authenticated } from '@/access'
import { revalidateGlobal } from '@/hooks/revalidate'

export const SiteSettings: GlobalConfig = {
  slug: 'site-settings',
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
      name: 'siteName',
      type: 'text',
      required: true,
      defaultValue: 'Robopipe',
    },
    {
      name: 'leadNotificationEmail',
      type: 'email',
      admin: { description: 'Sales inbox that receives new lead notifications.' },
    },
    {
      name: 'contactEmail',
      type: 'email',
      admin: { description: 'Public contact email shown on the site.' },
    },
    {
      name: 'socials',
      type: 'array',
      fields: [
        {
          name: 'platform',
          type: 'select',
          required: true,
          options: ['linkedin', 'github', 'youtube', 'x', 'facebook', 'instagram'],
        },
        {
          name: 'url',
          type: 'text',
          required: true,
        },
      ],
    },
    {
      name: 'defaultSeo',
      type: 'group',
      fields: [
        {
          name: 'title',
          type: 'text',
          localized: true,
          admin: { description: 'Default meta title, also used as suffix: "Page — Robopipe".' },
        },
        {
          name: 'description',
          type: 'textarea',
          localized: true,
          maxLength: 300,
        },
        {
          name: 'image',
          type: 'upload',
          relationTo: 'media',
        },
      ],
    },
  ],
}
