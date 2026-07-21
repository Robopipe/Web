import type { Block } from 'payload'

export const ContactForm: Block = {
  slug: 'contactForm',
  interfaceName: 'ContactFormBlock',
  fields: [
    {
      name: 'heading',
      type: 'text',
      localized: true,
    },
    {
      name: 'text',
      type: 'textarea',
      localized: true,
    },
    {
      name: 'showUseCase',
      type: 'checkbox',
      defaultValue: true,
      admin: { description: 'Show the optional "use case" field on the form.' },
    },
  ],
}
