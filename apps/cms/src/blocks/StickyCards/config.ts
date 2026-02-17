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
          type: 'row',
          fields: [
            {
              name: 'image',
              type: 'upload',
              relationTo: 'media',
              required: true,
              label: 'Main Image',
              admin: {
                description:
                  'Main card image (overlaid on background when background image is set)',
                width: '50%',
              },
            },
            {
              name: 'backgroundImage',
              type: 'upload',
              relationTo: 'media',
              label: 'Background Image (Optional)',
              admin: {
                description: 'Optional dithered background behind the main image',
                width: '50%',
              },
            },
          ],
        },
        {
          name: 'imagePosition',
          type: 'select',
          label: 'Image Position',
          defaultValue: 'center',
          admin: {
            description:
              'Position of the foreground image over the background (only applies when a background image is set)',
          },
          options: [
            { label: 'Center', value: 'center' },
            { label: 'Top Left', value: 'topLeft' },
            { label: 'Top Right', value: 'topRight' },
            { label: 'Bottom Left', value: 'bottomLeft' },
            { label: 'Bottom Right', value: 'bottomRight' },
          ],
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
