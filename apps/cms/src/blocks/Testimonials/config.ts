import type { Block } from 'payload'

export const Testimonials: Block = {
  slug: 'testimonials',
  interfaceName: 'TestimonialsBlock',
  fields: [
    {
      name: 'title',
      type: 'text',
      label: 'Title',
      defaultValue: 'What our customers say',
      required: true,
    },
    {
      name: 'subtitle',
      type: 'text',
      label: 'Subtitle',
      defaultValue: 'about collaborating with us',
      required: true,
    },
    {
      name: 'testimonials',
      type: 'array',
      label: 'Testimonials',
      minRows: 1,
      maxRows: 8,
      fields: [
        {
          name: 'quote',
          type: 'textarea',
          required: true,
          label: 'Quote',
        },
        {
          type: 'row',
          fields: [
            {
              name: 'authorName',
              type: 'text',
              required: true,
              label: 'Author Name',
              admin: {
                width: '50%',
              },
            },
            {
              name: 'authorTitle',
              type: 'text',
              required: true,
              label: 'Author Title',
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
              admin: {
                width: '50%',
              },
            },
            {
              name: 'authorImage',
              type: 'upload',
              relationTo: 'media',
              required: false,
              label: 'Author Image',
              admin: {
                width: '50%',
              },
            },
          ],
        },
        {
          name: 'variant',
          type: 'select',
          label: 'Card Variant',
          defaultValue: 'default',
          options: [
            {
              label: 'Default',
              value: 'default',
            },
            {
              label: 'Stripe (Dark)',
              value: 'stripe',
            },
            {
              label: 'Vercel (Primary)',
              value: 'vercel',
            },
          ],
        },
      ],
      // Note: Default values removed to prevent ObjectId casting errors
      // Add testimonials through the CMS admin interface with proper media uploads
    },
  ],
  labels: {
    plural: 'Testimonial Sections',
    singular: 'Testimonial Section',
  },
}
