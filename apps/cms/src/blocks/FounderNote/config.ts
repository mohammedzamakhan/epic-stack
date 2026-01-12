import type { Block } from 'payload'

import {
  FixedToolbarFeature,
  InlineToolbarFeature,
  lexicalEditor,
} from '@payloadcms/richtext-lexical'

export const FounderNote: Block = {
  slug: 'founderNote',
  interfaceName: 'FounderNoteBlock',
  fields: [
    {
      name: 'heading',
      type: 'text',
      label: 'Heading',
      required: true,
      defaultValue: 'A Note from Our Founder',
    },
    {
      name: 'content',
      type: 'richText',
      label: 'Note Content',
      required: true,
      editor: lexicalEditor({
        features: ({ rootFeatures }) => {
          return [...rootFeatures, FixedToolbarFeature(), InlineToolbarFeature()]
        },
      }),
    },
    {
      type: 'row',
      fields: [
        {
          name: 'authorName',
          type: 'text',
          required: true,
          label: 'Author Name',
          defaultValue: 'John Doe',
          admin: {
            width: '50%',
          },
        },
        {
          name: 'authorTitle',
          type: 'text',
          required: true,
          label: 'Author Title',
          defaultValue: 'Founder & CEO',
          admin: {
            width: '50%',
          },
        },
      ],
    },
    {
      name: 'companyName',
      type: 'text',
      required: false,
      label: 'Company Name (optional)',
    },
    {
      name: 'signatureSvg',
      type: 'textarea',
      label: 'Signature SVG',
      admin: {
        description: 'Paste the SVG code for the signature. Leave empty to hide signature.',
      },
    },
  ],
  labels: {
    plural: 'Founder Notes',
    singular: 'Founder Note',
  },
}
