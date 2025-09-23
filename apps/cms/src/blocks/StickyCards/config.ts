import type { Block } from 'payload'

export const StickyCards: Block = {
  slug: 'stickyCards',
  labels: {
    singular: 'Sticky Cards',
    plural: 'Sticky Cards',
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      label: 'Title',
      defaultValue: 'Short heading goes here',
    },
    {
      name: 'subtitle',
      type: 'text',
      label: 'Subtitle/Tagline',
      defaultValue: 'Tagline',
    },
    {
      name: 'description',
      type: 'textarea',
      label: 'Description',
      defaultValue: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
    },
    {
      name: 'cards',
      type: 'array',
      label: 'Cards',
      minRows: 1,
      maxRows: 6,
      defaultValue: [
        {
          tagline: 'Tagline',
          title: 'Medium length section heading goes here',
          description:
            'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Suspendisse varius enim in eros elementum tristique. Duis cursus, mi quis viverra ornare, eros dolor interdum nulla, ut commodo diam libero vitae erat.',
          image: 'https://images.unsplash.com/photo-1555949963-aa79dcee981c?w=800&h=600&fit=crop',
          primaryButtonText: 'Button',
          primaryButtonUrl: '#',
          secondaryButtonText: 'Button',
          secondaryButtonUrl: '#',
        },
        {
          tagline: 'Tagline',
          title: 'Medium length section heading goes here',
          description:
            'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Suspendisse varius enim in eros elementum tristique. Duis cursus, mi quis viverra ornare, eros dolor interdum nulla, ut commodo diam libero vitae erat.',
          image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=600&fit=crop',
          primaryButtonText: 'Button',
          primaryButtonUrl: '#',
          secondaryButtonText: 'Button',
          secondaryButtonUrl: '#',
        },
        {
          tagline: 'Tagline',
          title: 'Medium length section heading goes here',
          description:
            'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Suspendisse varius enim in eros elementum tristique. Duis cursus, mi quis viverra ornare, eros dolor interdum nulla, ut commodo diam libero vitae erat.',
          image: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800&h=600&fit=crop',
          primaryButtonText: 'Button',
          primaryButtonUrl: '#',
          secondaryButtonText: 'Button',
          secondaryButtonUrl: '#',
        },
        {
          tagline: 'Tagline',
          title: 'Medium length section heading goes here',
          description:
            'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Suspendisse varius enim in eros elementum tristique. Duis cursus, mi quis viverra ornare, eros dolor interdum nulla, ut commodo diam libero vitae erat.',
          image: 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=800&h=600&fit=crop',
          primaryButtonText: 'Button',
          primaryButtonUrl: '#',
          secondaryButtonText: 'Button',
          secondaryButtonUrl: '#',
        },
      ],
      fields: [
        {
          name: 'tagline',
          type: 'text',
          required: true,
          label: 'Card Tagline',
          defaultValue: 'Tagline',
        },
        {
          name: 'title',
          type: 'text',
          required: true,
          label: 'Card Title',
        },
        {
          name: 'description',
          type: 'textarea',
          required: true,
          label: 'Card Description',
        },
        {
          name: 'image',
          type: 'text',
          required: true,
          label: 'Image URL',
          admin: {
            description: 'URL for the card image',
          },
        },
        {
          name: 'primaryButtonText',
          type: 'text',
          label: 'Primary Button Text',
          defaultValue: 'Button',
        },
        {
          name: 'primaryButtonUrl',
          type: 'text',
          label: 'Primary Button URL',
          defaultValue: '#',
        },
        {
          name: 'secondaryButtonText',
          type: 'text',
          label: 'Secondary Button Text',
          defaultValue: 'Button',
        },
        {
          name: 'secondaryButtonUrl',
          type: 'text',
          label: 'Secondary Button URL',
          defaultValue: '#',
        },
      ],
    },
  ],
}
