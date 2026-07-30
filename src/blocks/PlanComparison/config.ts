import type { Block } from 'payload'

/**
 * Plan comparison table: tier columns + grouped feature rows.
 * Cell values: "✓" renders as a check, "—" or empty as a dash, anything else as text.
 */
export const PlanComparison: Block = {
  slug: 'planComparison',
  interfaceName: 'PlanComparisonBlock',
  fields: [
    {
      name: 'heading',
      type: 'text',
      localized: true,
    },
    {
      name: 'columns',
      type: 'array',
      required: true,
      minRows: 2,
      maxRows: 4,
      admin: { description: 'Tier names, in column order.' },
      fields: [
        {
          name: 'name',
          type: 'text',
          required: true,
          localized: true,
        },
      ],
    },
    {
      name: 'groups',
      type: 'array',
      required: true,
      minRows: 1,
      fields: [
        {
          name: 'label',
          type: 'text',
          required: true,
          localized: true,
          admin: { description: 'Group header, e.g. "Inspection".' },
        },
        {
          name: 'rows',
          type: 'array',
          required: true,
          minRows: 1,
          fields: [
            {
              name: 'label',
              type: 'text',
              required: true,
              localized: true,
            },
            {
              name: 'values',
              type: 'array',
              required: true,
              admin: { description: 'One value per tier column: "✓", "—", or text like "5 / month".' },
              fields: [
                {
                  name: 'value',
                  type: 'text',
                  localized: true,
                },
              ],
            },
          ],
        },
      ],
    },
  ],
}
