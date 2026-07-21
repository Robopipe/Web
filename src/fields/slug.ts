import type { TextField } from 'payload'

export const slugify = (value: string): string =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')

/**
 * Localized slug — each locale gets its own URL segment (e.g. /cs/pouziti vs /en/use-cases).
 * Auto-generated from the given field when left empty; always normalized.
 */
export const slugField = (from = 'title'): TextField => ({
  name: 'slug',
  type: 'text',
  index: true,
  localized: true,
  unique: true,
  admin: {
    position: 'sidebar',
    description: 'URL segment for this locale. Leave empty to generate from the title.',
  },
  hooks: {
    beforeValidate: [
      ({ value, data }) => {
        if (typeof value === 'string' && value.trim().length) return slugify(value)
        const fallback = data?.[from]
        if (typeof fallback === 'string' && fallback.trim().length) return slugify(fallback)
        return value
      },
    ],
  },
})
