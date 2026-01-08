import type { GlobalConfig } from 'payload'

import { link } from '@/fields/link'
import { megaMenu } from '@/fields/megaMenu'
import { revalidateHeader } from './hooks/revalidateHeader'

export const Header: GlobalConfig = {
  slug: 'header',
  access: {
    read: () => true,
  },
  fields: [
    {
      name: 'navItems',
      type: 'array',
      label: 'Navigation Items',
      fields: [
        {
          name: 'menuType',
          type: 'radio',
          label: 'Menu Type',
          required: true,
          defaultValue: 'link',
          options: [
            {
              label: 'Simple Link',
              value: 'link',
            },
            {
              label: 'Mega Menu',
              value: 'megaMenu',
            },
          ],
          admin: {
            layout: 'horizontal',
            description: 'Choose between a simple link or a mega menu dropdown',
          },
        },
        {
          name: 'menuLabel',
          type: 'text',
          label: 'Menu Label',
          required: true,
          admin: {
            description: 'The text shown in the navigation bar',
          },
        },
        link({
          appearances: false,
          overrides: {
            admin: {
              condition: (_, siblingData) => siblingData?.menuType === 'link',
            },
          },
        }),
        megaMenu({
          overrides: {
            admin: {
              condition: (_, siblingData) => siblingData?.menuType === 'megaMenu',
            },
          },
        }),
      ],
      maxRows: 8,
      admin: {
        initCollapsed: true,
        components: {
          RowLabel: '@/components/RowLabel#RowLabel',
        },
      },
    },
  ],
  hooks: {
    afterChange: [revalidateHeader],
  },
}
