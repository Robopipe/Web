import type { CollectionConfig } from 'payload'

import { authenticated, nobody } from '@/access'
import { closedAtOnChange, isGoogleAdsLead, type LeadForAds } from '@/lib/googleAds'
import { isBusinessEmail, isTestLead } from '@/lib/leadEmail'

export const Leads: CollectionConfig = {
  slug: 'leads',
  admin: {
    useAsTitle: 'email',
    defaultColumns: [
      'name',
      'email',
      'company',
      'businessEmail',
      'googleAdsExport',
      'status',
      'closedCustomer',
      'createdAt',
    ],
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
      name: 'attribution',
      type: 'group',
      admin: {
        position: 'sidebar',
        description:
          'Ad click and cookie consent at the time of submission. Set by the form, read-only.',
      },
      // Local API with overrideAccess (the form action) still writes.
      access: { create: () => false, update: () => false },
      fields: [
        {
          name: 'consentAnalytics',
          type: 'checkbox',
          defaultValue: false,
          admin: { readOnly: true },
        },
        {
          name: 'consentMarketing',
          type: 'checkbox',
          defaultValue: false,
          admin: { readOnly: true },
        },
        { name: 'gclid', type: 'text', admin: { readOnly: true } },
        { name: 'gbraid', type: 'text', admin: { readOnly: true } },
        { name: 'wbraid', type: 'text', admin: { readOnly: true } },
        {
          name: 'clickedAt',
          type: 'date',
          admin: { readOnly: true, date: { pickerAppearance: 'dayAndTime' } },
        },
      ],
    },
    {
      name: 'businessEmail',
      type: 'checkbox',
      virtual: true,
      admin: {
        readOnly: true,
        position: 'sidebar',
        description: 'Email domain is not a public mail service.',
      },
      hooks: { afterRead: [({ data }) => isBusinessEmail(data?.email ?? '')] },
    },
    {
      name: 'testLead',
      type: 'checkbox',
      virtual: true,
      admin: {
        readOnly: true,
        position: 'sidebar',
        description: 'koala42.com, robopipe.io or a name that starts with TEST.',
      },
      hooks: {
        afterRead: [({ data }) => isTestLead({ email: data?.email ?? '', name: data?.name ?? '' })],
      },
    },
    {
      name: 'googleAdsExport',
      type: 'checkbox',
      virtual: true,
      admin: {
        readOnly: true,
        position: 'sidebar',
        description: 'Goes to Google Ads as a company lead (last 90 days only).',
      },
      hooks: { afterRead: [({ data }) => (data ? isGoogleAdsLead(data as LeadForAds) : false)] },
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
    {
      name: 'closedCustomer',
      type: 'checkbox',
      defaultValue: false,
      label: 'Customer closed',
      admin: {
        position: 'sidebar',
        description:
          'Tick when the lead becomes a customer. A lead with a gclid then goes to Google Ads as a second conversion (issue #43).',
      },
    },
    {
      name: 'closedAt',
      type: 'date',
      label: 'Closed at',
      admin: {
        position: 'sidebar',
        date: { pickerAppearance: 'dayAndTime' },
        description:
          'Set automatically on the first tick. Conversion time of the closed-customer conversion.',
      },
      hooks: { beforeChange: [({ value, siblingData }) => closedAtOnChange(value, siblingData)] },
    },
  ],
  timestamps: true,
}
