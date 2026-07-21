import type { Block } from 'payload'

export const CaseStudyGrid: Block = {
  slug: 'caseStudyGrid',
  interfaceName: 'CaseStudyGridBlock',
  fields: [
    {
      name: 'heading',
      type: 'text',
      localized: true,
    },
    {
      name: 'caseStudies',
      type: 'relationship',
      relationTo: 'case-studies',
      hasMany: true,
      admin: { description: 'Leave empty to show the latest case studies.' },
    },
    {
      name: 'limit',
      type: 'number',
      defaultValue: 3,
      min: 1,
      max: 12,
      admin: { description: 'Used when no case studies are selected manually.' },
    },
  ],
}
