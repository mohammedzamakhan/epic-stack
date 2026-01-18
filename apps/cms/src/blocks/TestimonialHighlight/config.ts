import type { Block } from 'payload'

export const TestimonialHighlight: Block = {
  slug: 'testimonialHighlight',
  interfaceName: 'TestimonialHighlightBlock',
  fields: [
    {
      name: 'tagline',
      type: 'text',
      label: 'Tagline',
      defaultValue: 'Used by the best developers',
      required: false,
    },
    {
      name: 'quote',
      type: 'textarea',
      label: 'Quote',
      required: true,
      defaultValue:
        'The Pro Blocks are a game-changer. They are easy to use and customize, and they are a great way to build with shadcn/ui faster.',
    },
    {
      type: 'row',
      fields: [
        {
          name: 'authorName',
          type: 'text',
          required: true,
          label: 'Author Name',
          defaultValue: 'OrcDev',
          admin: {
            width: '50%',
          },
        },
        {
          name: 'authorTitle',
          type: 'text',
          required: true,
          label: 'Author Title',
          defaultValue: 'Creator of',
          admin: {
            width: '50%',
          },
        },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'authorCompany',
          type: 'text',
          required: true,
          label: 'Author Company',
          defaultValue: '8bitcn',
          admin: {
            width: '50%',
          },
        },
        {
          name: 'authorCompanyUrl',
          type: 'text',
          required: false,
          label: 'Company URL (optional)',
          defaultValue: 'https://www.8bitcn.com/',
          admin: {
            width: '50%',
          },
        },
      ],
    },
    {
      name: 'authorImage',
      type: 'upload',
      relationTo: 'media',
      required: false,
      label: 'Author Image',
    },
  ],
  labels: {
    plural: 'Testimonial Highlights',
    singular: 'Testimonial Highlight',
  },
}
