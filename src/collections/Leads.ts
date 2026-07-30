import type { CollectionConfig } from 'payload'

import { authenticated, nobody } from '@/access'

export const Leads: CollectionConfig = {
  slug: 'leads',
  admin: {
    useAsTitle: 'email',
    defaultColumns: ['name', 'email', 'company', 'status', 'createdAt'],
    group: 'Sales',
    description: 'Inquiries submitted through the contact form.',
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
      name: 'name',
      type: 'text',
      required: true,
    },
    {
      name: 'email',
      type: 'email',
      required: true,
    },
    {
      name: 'company',
      type: 'text',
    },
    {
      name: 'phone',
      type: 'text',
    },
    {
      name: 'message',
      type: 'textarea',
      required: true,
    },
    {
      name: 'industry',
      type: 'select',
      options: [
        { label: 'Food processing', value: 'food' },
        { label: 'Pharma & healthcare', value: 'pharma' },
        { label: 'Retail & e-commerce', value: 'retail' },
        { label: 'Logistics', value: 'logistics' },
        { label: 'Other', value: 'other' },
      ],
    },
    {
      name: 'tier',
      type: 'text',
      admin: { description: 'Pricing tier the visitor clicked before submitting, if any.' },
    },
    {
      name: 'locale',
      type: 'select',
      options: ['cs', 'en'],
    },
    {
      name: 'sourcePage',
      type: 'text',
      admin: { description: 'Path of the page the form was submitted from.' },
    },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'new',
      options: [
        { label: 'New', value: 'new' },
        { label: 'Contacted', value: 'contacted' },
        { label: 'Qualified', value: 'qualified' },
        { label: 'Closed', value: 'closed' },
      ],
      admin: { position: 'sidebar' },
    },
  ],
  timestamps: true,
}
