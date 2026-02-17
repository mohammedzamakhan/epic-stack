import type { Block } from 'payload'

export const Stats: Block = {
  slug: 'stats',
  labels: {
    singular: 'Stats',
    plural: 'Stats',
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      label: 'Section Title',
      defaultValue: 'Delivering measurable Results',
    },
    {
      name: 'description',
      type: 'textarea',
      label: 'Section Description',
      defaultValue:
        'Our platform has helped companies increase conversion rates and boost engagement across all digital channels.',
    },
    {
      name: 'stats',
      type: 'array',
      label: 'Statistics',
      minRows: 2,
      maxRows: 6,
      defaultValue: [
        {
          value: '+85%',
          label: 'Conversion Rate',
        },
        {
          value: '12K',
          label: 'Active Users',
        },
        {
          value: '40%',
          label: 'Revenue Growth',
        },
      ],
      fields: [
        {
          name: 'value',
          type: 'text',
          required: true,
          label: 'Value',
          admin: {
            description: 'e.g. +85%, 12K, 40%, $2.4M',
          },
        },
        {
          name: 'label',
          type: 'text',
          required: true,
          label: 'Label',
          admin: {
            description: 'e.g. Conversion Rate, Active Users',
          },
        },
      ],
    },
  ],
}
