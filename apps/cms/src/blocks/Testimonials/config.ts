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
              type: 'text',
              required: true,
              label: 'Author Image URL',
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
      defaultValue: [
        {
          quote: 'I was going to build my own authentication system using blockchain, AI, and quantum computing... then I discovered this and saved 3 years of my life.',
          authorName: 'Captain Deploy',
          authorTitle: 'Chief Meme Officer',
          authorCompany: 'Deploy or Die Inc.',
          authorImage: 'https://i.pravatar.cc/150?img=68',
          variant: 'vercel',
        },
        {
          quote: 'The integrations are incredible. We connected all our tools in minutes instead of spending weeks building custom solutions.',
          authorName: 'Bugs Bunyan',
          authorTitle: 'Lead Developer',
          authorCompany: 'Log Overflow',
          authorImage: 'https://i.pravatar.cc/150?img=11',
          variant: 'default',
        },
        {
          quote: 'Epic Startup saved me 127.3 hours of boilerplate setup...',
          authorName: 'Ctrl Alt Delete',
          authorTitle: 'Reformed Code Artist',
          authorCompany: 'Infinite Loop Labs',
          authorImage: 'https://i.pravatar.cc/150?img=23',
          variant: 'default',
        },
        {
          quote: 'The TypeScript setup is so good, it caught errors I hadn\'t even made yet...',
          authorName: 'Null Pointer',
          authorTitle: 'Duck Whisperer',
          authorCompany: 'Try-Catch Paradise',
          authorImage: 'https://i.pravatar.cc/150?img=15',
          variant: 'default',
        },
        {
          quote: 'Implementing auth used to take longer than explaining why I still use PHP. Not anymore! Well, at least the auth part.',
          authorName: 'Legacy Larry',
          authorTitle: 'Time Optimization Specialist',
          authorCompany: '404 Found',
          authorImage: 'https://i.pravatar.cc/150?img=33',
          variant: 'stripe',
        },
        {
          quote: 'Our sprint planning used to be "Fix auth bugs" every week. Now we actually build features! What a concept!',
          authorName: 'Agile Gandalf',
          authorTitle: 'Sprint Survivor',
          authorCompany: 'You Shall Not Crash',
          authorImage: 'https://i.pravatar.cc/150?img=3',
          variant: 'default',
        },
      ],
    },
  ],
  labels: {
    plural: 'Testimonial Sections',
    singular: 'Testimonial Section',
  },
}
