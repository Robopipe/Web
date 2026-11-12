import type { GlobalConfig } from 'payload'

import { authenticated } from '@/access'
import { EXPORT_PASSWORD_MIN_LENGTH, hashExportPassword } from '@/lib/exportCredentials'

/**
 * Login of the Google Ads export route `/api/google-ads/company-leads.csv` (issue #28).
 * The password field is virtual: the database keeps only `passwordHash`, and the
 * API never returns the password or the hash. Not in site-settings, because the
 * public can read site-settings.
 */
export const GoogleAdsExport: GlobalConfig = {
  slug: 'google-ads-export',
  label: 'Google Ads export',
  admin: {
    group: 'Site',
    description:
      'HTTP Basic login for the scheduled lead upload in Google Ads Data Manager. Without a username and a password, the export answers 401.',
  },
  access: {
    read: authenticated,
    update: authenticated,
  },
  hooks: {
    beforeChange: [
      async ({ data, req }) => {
        const password = typeof data.password === 'string' ? data.password : ''
        if (password) {
          data.passwordHash = hashExportPassword(password)
          return data
        }
        // An empty password keeps the stored hash. A sent hash is never accepted.
        // originalDoc has no hidden fields, so the hash comes from the database adapter.
        const stored = await req.payload.db.findGlobal({ slug: 'google-ads-export', req })
        data.passwordHash = stored?.passwordHash ?? null
        return data
      },
    ],
  },
  fields: [
    {
      name: 'username',
      type: 'text',
      admin: { description: 'Username that Google Ads sends, e.g. "google-ads".' },
    },
    {
      name: 'password',
      type: 'text',
      virtual: true,
      admin: {
        description: `New password, at least ${EXPORT_PASSWORD_MIN_LENGTH} characters. Leave empty to keep the current password. The stored password is never shown.`,
      },
      validate: (value: string | null | undefined) =>
        !value || value.length >= EXPORT_PASSWORD_MIN_LENGTH
          ? true
          : `The password needs at least ${EXPORT_PASSWORD_MIN_LENGTH} characters.`,
      hooks: {
        afterRead: [() => ''],
      },
    },
    {
      name: 'passwordHash',
      type: 'text',
      hidden: true,
    },
  ],
}
