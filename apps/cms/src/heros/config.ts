import type { Field } from 'payload'

import {
  FixedToolbarFeature,
  HeadingFeature,
  InlineToolbarFeature,
  lexicalEditor,
} from '@payloadcms/richtext-lexical'

import { linkGroup } from '@/fields/linkGroup'

export const hero: Field = {
  name: 'hero',
  type: 'group',
  fields: [
    {
      name: 'type',
      type: 'select',
      defaultValue: 'lowImpact',
      label: 'Type',
      options: [
        {
          label: 'None',
          value: 'none',
        },
        {
          label: 'High Impact',
          value: 'highImpact',
        },
        {
          label: 'Medium Impact',
          value: 'mediumImpact',
        },
        {
          label: 'Low Impact',
          value: 'lowImpact',
        },
      ],
      required: true,
    },
    {
      name: 'richText',
      type: 'richText',
      editor: lexicalEditor({
        features: ({ rootFeatures }) => {
          return [
            ...rootFeatures,
            HeadingFeature({ enabledHeadingSizes: ['h1', 'h2', 'h3', 'h4'] }),
            FixedToolbarFeature(),
            InlineToolbarFeature(),
          ]
        },
      }),
      label: false,
    },
    linkGroup({
      overrides: {
        maxRows: 2,
      },
    }),
    {
      type: 'collapsible',
      label: 'Layout & Design Options',
      fields: [
        {
          type: 'row',
          fields: [
            {
              name: 'assetType',
              type: 'select',
              defaultValue: 'image',
              label: 'Asset Type',
              options: [
                { label: 'None (Text Only)', value: 'none' },
                { label: 'Image', value: 'image' },
                { label: 'Video', value: 'video' },
              ],
              admin: {
                width: '50%',
              },
            },
            {
              name: 'textPosition',
              type: 'select',
              defaultValue: 'left',
              label: 'Text Alignment',
              options: [
                { label: 'Left', value: 'left' },
                { label: 'Center', value: 'center' },
              ],
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
              name: 'assetPosition',
              type: 'select',
              defaultValue: 'right',
              label: 'Asset Position',
              options: [
                { label: 'Left', value: 'left' },
                { label: 'Right', value: 'right' },
                { label: 'Center', value: 'center' },
              ],
              admin: {
                width: '50%',
                condition: (_, siblingData) => siblingData?.assetType !== 'none',
              },
            },
            {
              name: 'variant',
              type: 'select',
              defaultValue: 'primary',
              label: 'Color Variant',
              options: [
                { label: 'Primary', value: 'primary' },
                { label: 'Secondary', value: 'secondary' },
              ],
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
              name: 'withBackground',
              type: 'checkbox',
              label: 'Show Background',
              defaultValue: false,
              admin: {
                width: '33%',
              },
            },
            {
              name: 'withBackgroundGlow',
              type: 'checkbox',
              label: 'Background Glow Effect',
              defaultValue: false,
              admin: {
                width: '33%',
              },
            },
            {
              name: 'assetShadow',
              type: 'select',
              defaultValue: 'hard',
              label: 'Asset Shadow',
              options: [
                { label: 'None', value: 'none' },
                { label: 'Soft', value: 'soft' },
                { label: 'Hard', value: 'hard' },
              ],
              admin: {
                width: '34%',
                condition: (_, siblingData) => siblingData?.assetType !== 'none',
              },
            },
          ],
        },
        {
          name: 'imagePerspective',
          type: 'select',
          defaultValue: 'none',
          label: 'Image Perspective (3D Effect)',
          options: [
            { label: 'None', value: 'none' },
            { label: 'Left', value: 'left' },
            { label: 'Right', value: 'right' },
            { label: 'Bottom', value: 'bottom' },
            { label: 'Bottom Large', value: 'bottom-lg' },
            { label: 'Paper', value: 'paper' },
          ],
          admin: {
            condition: (_, siblingData) => siblingData?.assetType === 'image',
          },
        },
        {
          name: 'minHeight',
          type: 'number',
          label: 'Minimum Height (px)',
          defaultValue: 350,
          admin: {
            description: 'Minimum height of the hero section in pixels',
          },
        },
      ],
      admin: {
        initCollapsed: true,
      },
    },
    {
      name: 'media',
      type: 'upload',
      admin: {
        condition: (_, siblingData) => siblingData?.assetType === 'image',
      },
      relationTo: 'media',
      label: 'Image',
    },
    {
      type: 'collapsible',
      label: 'Video Settings',
      fields: [
        {
          name: 'videoSrc',
          type: 'text',
          label: 'Video URL',
          admin: {
            description: 'URL to the video file (MP4, WebM, etc.)',
          },
        },
        {
          name: 'videoPoster',
          type: 'upload',
          relationTo: 'media',
          label: 'Video Poster Image',
          admin: {
            description: 'Thumbnail image shown before video plays',
          },
        },
        {
          type: 'row',
          fields: [
            {
              name: 'videoAutoPlay',
              type: 'checkbox',
              label: 'Auto Play',
              defaultValue: false,
              admin: {
                width: '25%',
              },
            },
            {
              name: 'videoLoop',
              type: 'checkbox',
              label: 'Loop',
              defaultValue: false,
              admin: {
                width: '25%',
              },
            },
            {
              name: 'videoMuted',
              type: 'checkbox',
              label: 'Muted',
              defaultValue: true,
              admin: {
                width: '25%',
              },
            },
            {
              name: 'videoControls',
              type: 'checkbox',
              label: 'Show Controls',
              defaultValue: false,
              admin: {
                width: '25%',
              },
            },
          ],
        },
      ],
      admin: {
        condition: (_, siblingData) => siblingData?.assetType === 'video',
        initCollapsed: true,
      },
    },
  ],
  label: false,
}
