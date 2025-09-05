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
              type: 'text',
              label: 'Main Image URL',
              admin: {
                description: 'URL for the main feature image (overlaid on background)',
                width: '50%',
              },
            },
            {
              name: 'backgroundImage',
              type: 'text',
              label: 'Background Image URL',
              admin: {
                description: 'URL for the background image',
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
                  type: 'text',
                  label: 'Company Logo URL',
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
          description: 'Complete auth system with social logins, role-based access, and session management built with industry best practices.',
          image: 'https://images.unsplash.com/photo-1555949963-aa79dcee981c?w=600&h=400&fit=crop',
          backgroundImage: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800&h=600&fit=crop',
          testimonial: {
            logo: 'https://cdn.magicui.design/companies/Google.svg',
            logoAlt: 'Google',
            text: 'Secure authentication that just works out of the box',
            companyName: 'Google'
          }
        },
        {
          title: 'Payment Processing',
          description: 'Stripe integration with subscription management, usage-based billing, and comprehensive invoicing system.',
          image: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=600&h=400&fit=crop',
          backgroundImage: 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=800&h=600&fit=crop',
          testimonial: {
            logo: 'https://cdn.magicui.design/companies/Stripe.svg',
            logoAlt: 'Stripe',
            text: 'Seamless payment processing with enterprise-grade security',
            companyName: 'Stripe'
          }
        },
        {
          title: 'Database & API',
          description: 'Production-ready setup with TypeScript, Prisma ORM, and RESTful APIs with comprehensive documentation.',
          image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&h=400&fit=crop',
          backgroundImage: 'https://images.unsplash.com/photo-1518186285589-2f7649de83e0?w=800&h=600&fit=crop',
          testimonial: {
            logo: 'https://cdn.magicui.design/companies/Microsoft.svg',
            logoAlt: 'Microsoft',
            text: 'Robust database architecture that scales with your business',
            companyName: 'Microsoft'
          }
        },
        {
          title: 'Email & Notifications',
          description: 'Automated email campaigns, transactional emails, and real-time notifications with multiple provider support.',
          image: 'https://images.unsplash.com/photo-1596526131083-e8c633c948d2?w=600&h=400&fit=crop',
          backgroundImage: 'https://images.unsplash.com/photo-1611224923853-80b023f02d71?w=800&h=600&fit=crop',
          testimonial: {
            logo: 'https://cdn.magicui.design/companies/Slack.svg',
            logoAlt: 'Slack',
            text: 'Reliable email delivery and notification system',
            companyName: 'Slack'
          }
        },
      ],
    },
  ],
  labels: {
    plural: 'Feature Lists',
    singular: 'Feature List',
  },
}
