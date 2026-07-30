import type { Block } from 'payload'

export const ContactForm: Block = {
  slug: 'contactForm',
  interfaceName: 'ContactFormBlock',
  fields: [
    {
      name: 'heading',
      type: 'text',
      localized: true,
      admin: { description: 'Form card title, e.g. "Book a demo".' },
    },
    {
      name: 'microcopy',
      type: 'text',
      localized: true,
      admin: { description: 'Small line beside the submit button.' },
    },
    {
      name: 'showSidebar',
      type: 'checkbox',
      defaultValue: true,
      admin: {
        description: 'Show contact details and the map (from Site Settings) next to the form.',
      },
    },
  ],
}
