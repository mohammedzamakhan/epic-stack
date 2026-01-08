import type { ArrayField, Field } from 'payload'

import deepMerge from '@/utilities/deepMerge'
import { link } from './link'

type MegaMenuType = (options?: { overrides?: Partial<ArrayField> }) => Field

export const megaMenu: MegaMenuType = ({ overrides = {} } = {}) => {
  const generatedMegaMenu: Field = {
    name: 'megaMenuColumns',
    type: 'array',
    label: 'Mega Menu Columns',
    minRows: 1,
    maxRows: 4,
    fields: [
      {
        name: 'columnTitle',
        type: 'text',
        label: 'Column Title',
        required: true,
        admin: {
          description: 'Title displayed at the top of this column',
        },
      },
      {
        name: 'columnDescription',
        type: 'textarea',
        label: 'Column Description',
        admin: {
          description: 'Optional description text below the column title',
          rows: 2,
        },
      },
      {
        name: 'links',
        type: 'array',
        label: 'Links',
        minRows: 1,
        maxRows: 8,
        fields: [
          link({
            appearances: false,
          }),
        ],
        admin: {
          initCollapsed: true,
          components: {
            RowLabel: '@/components/RowLabel#RowLabel',
          },
        },
      },
    ],
    admin: {
      initCollapsed: true,
      description: 'Add columns for the mega menu. Each column can contain multiple links.',
    },
  }

  return deepMerge(generatedMegaMenu, overrides)
}
