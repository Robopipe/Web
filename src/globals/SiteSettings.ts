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
      name: 'contact',
      type: 'group',
      admin: { description: 'Details shown on the contact page next to the form.' },
      fields: [
        {
          name: 'phone',
          type: 'text',
          admin: { description: 'Displayed phone number, e.g. "+420 728 488 116".' },
        },
        {
          name: 'phoneHours',
          type: 'text',
          localized: true,
          admin: { description: 'E.g. "Mon–Fri, 8:00–17:00 CET".' },
        },
        {
          name: 'address',
          type: 'textarea',
          admin: { description: 'Postal address, one line per row.' },
        },
        {
          name: 'mapImage',
          type: 'upload',
          relationTo: 'media',
          admin: { description: 'Static map screenshot of the HQ.' },
        },
        {
          name: 'bookingUrl',
          type: 'text',
          admin: {
            description:
              'Calendly scheduling link, e.g. "https://calendly.com/jan-jelinek/30min". Empty hides the booking card on the contact page.',
          },
        },
        {
          name: 'bookingPerson',
          type: 'text',
          admin: { description: 'Who the meeting is booked with, e.g. "Jan Jelínek".' },
        },
      ],
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
      name: 'memberships',
      type: 'array',
      admin: {
        description:
          'Programmes and associations Robopipe is part of. Shown in the footer, in logo bands set to "Memberships" and in Organization structured data.',
      },
      fields: [
        { name: 'name', type: 'text', required: true },
        { name: 'url', type: 'text', required: true },
        { name: 'logo', type: 'upload', relationTo: 'media', required: true },
        {
          name: 'logoOnDark',
          type: 'upload',
          relationTo: 'media',
          admin: { description: 'Light variant for the dark footer. Falls back to logo.' },
        },
      ],
    },
    {
      name: 'solutions',
      type: 'relationship',
      relationTo: 'pages',
      hasMany: true,
      // getGlobals reads site-settings with depth 2. Without this limit every request would load whole pages.
      maxDepth: 0,
      admin: {
        description:
          'Solution and task pages in display order. Shown in the footer "Solutions" column, in card blocks set to "Solutions" and on the use cases listing.',
      },
    },
    {
      name: 'company',
      type: 'group',
      admin: {
        description:
          'Company facts for Organization structured data, the footer and the contact sidebar.',
      },
      fields: [
        {
          name: 'legalName',
          type: 'text',
          admin: {
            description: 'Exactly as in the commercial register. Also used in the footer © line.',
          },
        },
        { name: 'companyId', type: 'text', admin: { description: 'IČO.' } },
        {
          name: 'registration',
          type: 'textarea',
          localized: true,
          admin: { description: 'Registered office and register entry, one line.' },
        },
      ],
    },
    {
      name: 'verification',
      type: 'group',
      admin: { description: 'Search engine site verification. Empty value = no tag.' },
      fields: [
        {
          name: 'bing',
          type: 'text',
          admin: { description: 'content of <meta name="msvalidate.01">' },
        },
        {
          name: 'seznam',
          type: 'text',
          admin: { description: 'content of <meta name="seznam-wmt">' },
        },
      ],
    },
    {
      name: 'measurement',
      type: 'group',
      admin: {
        description:
          'Google measurement. Empty = no Google tag and no cookie banner. Publish the cookie paragraph on the privacy page before you fill these.',
      },
      fields: [
        {
          name: 'googleAnalyticsId',
          type: 'text',
          validate: (value: string | null | undefined) =>
            !value || /^G-[A-Z0-9]{4,16}$/.test(value) || 'Format: G-XXXXXXXXXX',
          admin: { description: 'GA4 measurement ID, e.g. G-ABC123XYZ9.' },
        },
        {
          name: 'googleAdsId',
          type: 'text',
          validate: (value: string | null | undefined) =>
            !value || /^AW-\d{6,14}$/.test(value) || 'Format: AW-123456789',
          admin: { description: 'Google Ads tag ID, e.g. AW-123456789. Used for remarketing.' },
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
