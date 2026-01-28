import type { GlobalConfig } from 'payload'

import { link } from '@/fields/link'
import { revalidateFooter } from './hooks/revalidateFooter'

export const Footer: GlobalConfig = {
  slug: 'footer',
  access: {
    read: () => true,
  },
  fields: [
    {
      name: 'columns',
      type: 'array',
      label: 'Footer Columns',
      fields: [
        {
          name: 'title',
          type: 'text',
          label: 'Column Title',
          required: true,
        },
        {
          name: 'links',
          type: 'array',
          label: 'Links',
          fields: [
            link({
              appearances: false,
            }),
          ],
        },
      ],
      maxRows: 6,
      admin: {
        initCollapsed: true,
      },
    },
    {
      name: 'copyrightText',
      type: 'text',
      label: 'Copyright Text',
    },
    {
      name: 'tagline',
      type: 'text',
      label: 'Tagline',
    },
  ],
  hooks: {
    afterChange: [revalidateFooter],
  },
}
