import type { Block } from 'payload'

export const Logos: Block = {
  slug: 'logos',
  interfaceName: 'LogosBlock',
  fields: [
    {
      name: 'title',
      type: 'text',
      label: 'Title',
      defaultValue: '// TRUSTED BY LEADING TEAMS',
    },
    {
      name: 'companies',
      type: 'array',
      label: 'Companies',
      minRows: 1,
      maxRows: 12,
      fields: [
        {
          name: 'name',
          type: 'text',
          required: true,
          label: 'Company Name',
        },
      ],
      defaultValue: [
        { name: 'Google' },
        { name: 'Microsoft' },
        { name: 'Amazon' },
        { name: 'Netflix' },
        { name: 'YouTube' },
        { name: 'Instagram' },
        { name: 'Uber' },
        { name: 'Spotify' },
        { name: 'Tesla' },
        { name: 'Airbnb' },
        { name: 'Dropbox' },
        { name: 'Slack' },
      ],
    },
  ],
  labels: {
    plural: 'Logo Sections',
    singular: 'Logo Section',
  },
}
