import type { Block } from 'payload'

export const FeatureList: Block = {
  slug: 'featureList',
  interfaceName: 'FeatureListBlock',
  fields: [
    {
      name: 'title',
      type: 'text',
      label: 'Title',
      defaultValue: 'Data for every industry',
      required: true,
    },
    {
      name: 'subtitle',
      type: 'text',
      label: 'Subtitle',
      defaultValue: 'Regardless of your industry, get the most relevant type of data for you.',
      required: true,
    },
    {
      name: 'features',
      type: 'array',
      label: 'Features',
      minRows: 1,
      maxRows: 10,
      fields: [
        {
          name: 'title',
          type: 'text',
          required: true,
          label: 'Feature Title',
        },
        {
          name: 'description',
          type: 'textarea',
          required: true,
          label: 'Feature Description',
        },
        {
          type: 'row',
          fields: [
            {
              name: 'image',
              type: 'upload',
              relationTo: 'media',
              label: 'Main Image',
              admin: {
                description: 'Main feature image (overlaid on background)',
                width: '50%',
              },
            },
            {
              name: 'backgroundImage',
              type: 'upload',
              relationTo: 'media',
              label: 'Background Image',
              admin: {
                width: '50%',
              },
            },
          ],
        },
        {
          name: 'testimonial',
          type: 'group',
          label: 'Testimonial (Optional)',
          fields: [
            {
              type: 'row',
              fields: [
                {
                  name: 'logo',
                  type: 'upload',
                  relationTo: 'media',
                  label: 'Company Logo',
                  admin: {
                    width: '50%',
                  },
                },
                {
                  name: 'logoAlt',
                  type: 'text',
                  label: 'Logo Alt Text',
                  admin: {
                    width: '50%',
                  },
                },
              ],
            },
            {
              name: 'text',
              type: 'textarea',
              label: 'Testimonial Text',
              required: false,
            },
            {
              name: 'companyName',
              type: 'text',
              label: 'Company Name',
              admin: {
                description: 'Used as fallback if no logo is provided',
              },
            },
          ],
        },
      ],
      defaultValue: [
        {
          title: 'Authentication & Security',
          description:
            'Complete auth system with social logins, role-based access, and session management built with industry best practices.',
          testimonial: {
            logoAlt: 'Google',
            text: 'Secure authentication that just works out of the box',
            companyName: 'Google',
          },
        },
        {
          title: 'Payment Processing',
          description:
            'Stripe integration with subscription management, usage-based billing, and comprehensive invoicing system.',
          testimonial: {
            logoAlt: 'Stripe',
            text: 'Seamless payment processing with enterprise-grade security',
            companyName: 'Stripe',
          },
        },
        {
          title: 'Database & API',
          description:
            'Production-ready setup with TypeScript, Prisma ORM, and RESTful APIs with comprehensive documentation.',
          testimonial: {
            logoAlt: 'Microsoft',
            text: 'Robust database architecture that scales with your business',
            companyName: 'Microsoft',
          },
        },
        {
          title: 'Email & Notifications',
          description:
            'Automated email campaigns, transactional emails, and real-time notifications with multiple provider support.',
          testimonial: {
            logoAlt: 'Slack',
            text: 'Reliable email delivery and notification system',
            companyName: 'Slack',
          },
        },
      ],
    },
  ],
  labels: {
    plural: 'Feature Lists',
    singular: 'Feature List',
  },
}
