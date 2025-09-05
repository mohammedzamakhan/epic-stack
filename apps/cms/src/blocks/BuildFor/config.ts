import type { Block } from 'payload'

export const BuildFor: Block = {
  slug: 'buildFor',
  interfaceName: 'BuildForBlock',
  fields: [
    {
      name: 'title',
      type: 'text',
      label: 'Main Title',
      defaultValue: 'Build by developers,',
      required: true,
      admin: {
        description: 'The main text before the highlighted portion'
      }
    },
    {
      name: 'highlightText',
      type: 'text',
      label: 'Highlighted Text',
      defaultValue: 'crafted for developers',
      required: true,
      admin: {
        description: 'The text that will be displayed with gradient colors'
      }
    },
    {
      name: 'rippleSettings',
      type: 'group',
      label: 'Ripple Animation Settings',
      admin: {
        description: 'Advanced settings for the background ripple effect'
      },
      fields: [
        {
          type: 'row',
          fields: [
            {
              name: 'mainCircleSize',
              type: 'number',
              label: 'Main Circle Size',
              defaultValue: 210,
              min: 100,
              max: 500,
              admin: {
                description: 'Size of the innermost circle in pixels',
                width: '33%',
              },
            },
            {
              name: 'mainCircleOpacity',
              type: 'number',
              label: 'Main Circle Opacity',
              defaultValue: 0.24,
              min: 0,
              max: 1,
              admin: {
                description: 'Opacity of the innermost circle (0-1)',
                width: '33%',
                step: 0.01,
              },
            },
            {
              name: 'numCircles',
              type: 'number',
              label: 'Number of Circles',
              defaultValue: 8,
              min: 3,
              max: 15,
              admin: {
                description: 'Total number of ripple circles',
                width: '34%',
              },
            },
          ],
        },
      ],
    },
  ],
  labels: {
    plural: 'Build For Sections',
    singular: 'Build For Section',
  },
}
