import type { Block } from 'payload'

export const Featured: Block = {
  slug: 'featured',
  interfaceName: 'FeaturedBlock',
  fields: [
    {
      name: 'title',
      type: 'text',
      label: 'Title',
      defaultValue: 'Launch your SaaS faster than ever',
      required: true,
    },
    {
      name: 'description',
      type: 'textarea',
      label: 'Description',
      defaultValue: 'Everything you need to build a production-ready SaaS. Authentication, payments, emails, and more - all pre-built and ready to go.',
      required: true,
    },
    {
      name: 'buttonText',
      type: 'text',
      label: 'Button Text',
      defaultValue: 'View features',
    },
    {
      name: 'buttonUrl',
      type: 'text',
      label: 'Button URL',
      defaultValue: '#features',
    },
    {
      name: 'features',
      type: 'array',
      label: 'Features',
      minRows: 2,
      maxRows: 4,
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
      ],
      defaultValue: [
        {
          title: 'Authentication',
          description: 'Complete auth system with social logins, role-based access, and session management.',
        },
        {
          title: 'Payments',
          description: 'Stripe integration with subscription management, usage-based billing, and invoicing.',
        },
        {
          title: 'Integrations',
          description: 'Ready-to-use API integrations and webhooks for popular third-party services.',
        },
        {
          title: 'Infrastructure',
          description: 'Production-ready setup with TypeScript, Remix, Prisma, and modern tooling.',
        },
      ],
    },
  ],
  labels: {
    plural: 'Featured Sections',
    singular: 'Featured Section',
  },
}
