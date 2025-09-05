import type { Block } from 'payload'

export const Pricing: Block = {
  slug: 'pricing',
  interfaceName: 'PricingBlock',
  fields: [
    {
      name: 'title',
      type: 'text',
      label: 'Title',
      defaultValue: 'Choose your plan',
      required: true,
    },
    {
      name: 'subtitle',
      type: 'textarea',
      label: 'Subtitle',
      defaultValue: 'Select the perfect plan for your needs',
      required: true,
    },
    {
      name: 'plans',
      type: 'array',
      label: 'Pricing Plans',
      minRows: 1,
      maxRows: 4,
      fields: [
        {
          name: 'id',
          type: 'text',
          required: true,
          label: 'Plan ID',
        },
        {
          name: 'title',
          type: 'text',
          required: true,
          label: 'Plan Title',
        },
        {
          name: 'description',
          type: 'textarea',
          required: true,
          label: 'Plan Description',
        },
        {
          name: 'highlight',
          type: 'checkbox',
          label: 'Highlight Plan',
          defaultValue: false,
        },
        {
          name: 'badge',
          type: 'text',
          label: 'Badge Text (optional)',
        },
        {
          name: 'currency',
          type: 'text',
          label: 'Currency Symbol',
          defaultValue: '$',
        },
        {
          name: 'monthlyPrice',
          type: 'text',
          required: true,
          label: 'Monthly Price',
        },
        {
          name: 'yearlyPrice',
          type: 'text',
          required: true,
          label: 'Yearly Price',
        },
        {
          name: 'buttonText',
          type: 'text',
          required: true,
          label: 'Button Text',
        },
        {
          name: 'features',
          type: 'array',
          label: 'Features',
          minRows: 1,
          fields: [
            {
              name: 'name',
              type: 'text',
              required: true,
              label: 'Feature Name',
            },
            {
              name: 'icon',
              type: 'select',
              label: 'Icon',
              defaultValue: 'check',
              options: [
                {
                  label: 'Check',
                  value: 'check',
                },
              ],
            },
            {
              name: 'iconColor',
              type: 'text',
              label: 'Icon Color (optional)',
            },
          ],
        },
      ],
      defaultValue: [
        {
          id: 'starter',
          title: 'Starter',
          description: 'For developers testing out locally.',
          currency: '$',
          monthlyPrice: '0',
          yearlyPrice: '0',
          buttonText: 'Start today for free',
          features: [
            { name: 'Authentication', icon: 'check' },
            { name: 'Basic Support', icon: 'check' },
            { name: 'Core Features', icon: 'check' },
          ],
        },
        {
          id: 'pro',
          title: 'Pro',
          description: 'For companies in production.',
          currency: '$',
          monthlyPrice: '20',
          yearlyPrice: '199',
          buttonText: 'Sign up',
          badge: 'Most popular',
          highlight: true,
          features: [
            { name: 'Everything in Starter', icon: 'check' },
            { name: 'Priority Support', icon: 'check' },
            { name: 'Advanced Analytics', icon: 'check' },
            { name: 'Team Collaboration', icon: 'check' },
          ],
        },
        {
          id: 'enterprise',
          title: 'Enterprise',
          description: 'For organizations with advanced needs.',
          currency: '$',
          monthlyPrice: 'Custom',
          yearlyPrice: 'Custom',
          buttonText: 'Contact sales',
          features: [
            { name: 'Everything in Pro', icon: 'check' },
            { name: 'Custom Integration', icon: 'check' },
            { name: 'Dedicated Support', icon: 'check' },
            { name: 'SLA & Compliance', icon: 'check' },
          ],
        },
      ],
    },
    {
      name: 'showFooter',
      type: 'checkbox',
      label: 'Show Footer',
      defaultValue: true,
    },
    {
      name: 'footerText',
      type: 'textarea',
      label: 'Footer Text',
      defaultValue: 'Pre-negotiated discounts are available to early-stage startups and nonprofits.',
      admin: {
        condition: (data, siblingData) => siblingData.showFooter,
      },
    },
    {
      name: 'footerButtonText',
      type: 'text',
      label: 'Footer Button Text',
      defaultValue: 'Apply now',
      admin: {
        condition: (data, siblingData) => siblingData.showFooter,
      },
    },
  ],
  labels: {
    plural: 'Pricing Tables',
    singular: 'Pricing Table',
  },
}
