import type { GlobalConfig } from 'payload'

import { link } from '@/fields/link'
import { revalidateBanner } from './hooks/revalidateBanner'

export const Banner: GlobalConfig = {
  slug: 'banner',
  access: {
    read: () => true,
  },
  fields: [
    {
      name: 'isEnabled',
      type: 'checkbox',
      label: 'Enable Banner',
      defaultValue: false,
    },
    {
      name: 'type',
      type: 'select',
      label: 'Type',
      defaultValue: 'info',
      options: [
        { label: 'Info', value: 'info' },
        { label: 'Warning', value: 'warning' },
        { label: 'Error', value: 'error' },
        { label: 'Success', value: 'success' },
      ],
      required: true,
      admin: {
        condition: (_, siblingData) => siblingData?.isEnabled,
      },
    },
    {
      name: 'content',
      type: 'textarea', // Textarea for longer content
      label: 'Content',
      required: true,
      admin: {
        condition: (_, siblingData) => siblingData?.isEnabled,
      },
    },
    {
      name: 'addLink',
      type: 'checkbox',
      label: 'Add Link',
      defaultValue: false,
      admin: {
        condition: (_, siblingData) => siblingData?.isEnabled,
      },
    },
    link({
      overrides: {
        admin: {
          condition: (_, siblingData) => siblingData?.isEnabled && siblingData?.addLink,
        },
      },
    }),
  ],
  hooks: {
    afterChange: [revalidateBanner],
  },
}
