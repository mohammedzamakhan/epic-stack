import type { Block } from 'payload'

export const Tabs: Block = {
  slug: 'tabs',
  labels: {
    singular: 'Tabs',
    plural: 'Tabs',
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      label: 'Title',
      defaultValue: 'Medium length section heading goes here',
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
      defaultValue: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Suspendisse varius enim in eros elementum tristique. Duis cursus, mi quis viverra ornare, eros dolor interdum nulla, ut commodo diam libero vitae erat.',
    },
    {
      name: 'tabs',
      type: 'array',
      label: 'Tabs',
      minRows: 1,
      maxRows: 6,
      defaultValue: [
        {
          title: 'Short heading goes here',
          description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Suspendisse varius enim in eros elementum tristique.',
          icon: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M8 9l3 3l-3 3" />
            <path d="M13 15l3 0" />
            <path d="M3 4m0 2a2 2 0 0 1 2 -2h14a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 -2h-14a2 2 0 0 1 -2 -2z" />
          </svg>`,
          image: 'https://images.unsplash.com/photo-1555949963-aa79dcee981c?w=600&h=400&fit=crop'
        },
        {
          title: 'Video content example',
          description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Suspendisse varius enim in eros elementum tristique.',
          icon: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="5,3 19,12 5,21" />
          </svg>`,
          videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ'
        },
        {
          title: 'Another feature tab',
          description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Suspendisse varius enim in eros elementum tristique.',
          icon: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0" />
            <path d="M12 17l0 .01" />
            <path d="M12 13.5a1.5 1.5 0 0 1 1 -1.5a2.6 2.6 0 1 0 -3 -4" />
          </svg>`,
          image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&h=400&fit=crop'
        }
      ],
      fields: [
        {
          name: 'title',
          type: 'text',
          required: true,
          label: 'Tab Title',
        },
        {
          name: 'description',
          type: 'textarea',
          required: true,
          label: 'Tab Description',
        },
        {
          name: 'icon',
          type: 'code',
          required: true,
          label: 'Icon (SVG)',
          admin: {
            language: 'html',
            description: 'Paste your SVG icon code here',
          },
        },
        {
          name: 'contentType',
          type: 'radio',
          label: 'Content Type',
          defaultValue: 'image',
          options: [
            {
              label: 'Image',
              value: 'image',
            },
            {
              label: 'Video',
              value: 'video',
            },
          ],
          admin: {
            layout: 'horizontal',
          },
        },
        {
          name: 'image',
          type: 'text',
          label: 'Image URL',
          admin: {
            condition: (data, siblingData) => siblingData?.contentType === 'image',
            description: 'URL for the tab content image',
          },
        },
        {
          name: 'videoUrl',
          type: 'text',
          label: 'Video URL',
          admin: {
            condition: (data, siblingData) => siblingData?.contentType === 'video',
            description: 'YouTube embed URL or video URL',
          },
        },
      ],
    },
    {
      name: 'buttonText',
      type: 'text',
      label: 'Primary Button Text',
      defaultValue: 'Button',
    },
    {
      name: 'buttonUrl',
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
}