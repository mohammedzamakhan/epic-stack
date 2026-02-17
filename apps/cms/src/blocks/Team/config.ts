import type { Block } from 'payload'

export const Team: Block = {
  slug: 'team',
  labels: {
    singular: 'Team',
    plural: 'Team',
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      label: 'Section Title',
      defaultValue: 'Meet Our Founders',
    },
    {
      name: 'description',
      type: 'textarea',
      label: 'Section Description',
      defaultValue:
        'The visionary leaders behind our mission to transform how teams work and collaborate.',
    },
    {
      name: 'members',
      type: 'array',
      label: 'Team Members',
      minRows: 1,
      maxRows: 12,
      defaultValue: [
        {
          name: 'Alex Turner',
          role: 'Founder & CEO',
        },
        {
          name: 'Jordan Lee',
          role: 'CTO',
        },
        {
          name: 'Sarah Chen',
          role: 'Head of Design',
        },
      ],
      fields: [
        {
          name: 'name',
          type: 'text',
          required: true,
          label: 'Name',
        },
        {
          name: 'role',
          type: 'text',
          required: true,
          label: 'Role',
        },
        {
          name: 'photo',
          type: 'upload',
          relationTo: 'media',
          label: 'Photo',
        },
      ],
    },
  ],
}
