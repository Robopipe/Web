import type { Block } from 'payload'

export const FAQAccordion: Block = {
  slug: 'faqAccordion',
  interfaceName: 'FAQAccordionBlock',
  fields: [
    {
      name: 'heading',
      type: 'text',
      localized: true,
    },
    {
      name: 'faqs',
      type: 'relationship',
      relationTo: 'faqs',
      hasMany: true,
      required: true,
    },
  ],
}
