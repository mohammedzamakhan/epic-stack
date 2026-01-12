import type { CollectionConfig } from 'payload'

import { authenticated } from '../../access/authenticated'
import { authenticatedOrPublished } from '../../access/authenticatedOrPublished'
import { Archive } from '../../blocks/ArchiveBlock/config'
import { BuildFor } from '../../blocks/BuildFor/config'
import { CallToAction } from '../../blocks/CallToAction/config'
import { Content } from '../../blocks/Content/config'
import { Featured } from '../../blocks/Featured/config'
import { FeatureList } from '../../blocks/FeatureList/config'
import { FeatureGrid } from '../../blocks/FeatureGrid/config'
import { StatsGrid } from '../../blocks/StatsGrid/config'
import { FormBlock } from '../../blocks/Form/config'
import { Integration } from '../../blocks/Integration/config'
import { Logos } from '../../blocks/Logos/config'
import { MediaBlock } from '../../blocks/MediaBlock/config'
import { Pricing } from '../../blocks/Pricing/config'
import { Testimonials } from '../../blocks/Testimonials/config'
import { TestimonialHighlight } from '../../blocks/TestimonialHighlight/config'
import { FAQ } from '../../blocks/FAQ/config'
import { Blog } from '../../blocks/Blog/config'
import { Tabs } from '../../blocks/Tabs/config'
import { StickyCards } from '../../blocks/StickyCards/config'
import { FounderNote } from '../../blocks/FounderNote/config'
import { hero } from '@/heros/config'
import { slugField } from '@/fields/slug'
import { populatePublishedAt } from '../../hooks/populatePublishedAt'
import { generatePreviewPath } from '../../utilities/generatePreviewPath'
import { revalidateDelete, revalidatePage } from './hooks/revalidatePage'
import { createSEOTab } from '@/fields/seo-tab'

export const Pages: CollectionConfig<'pages'> = {
  slug: 'pages',
  access: {
    create: authenticated,
    delete: authenticated,
    read: authenticatedOrPublished,
    update: authenticated,
  },
  // This config controls what's populated by default when a page is referenced
  // https://payloadcms.com/docs/queries/select#defaultpopulate-collection-config-property
  // Type safe if the collection slug generic is passed to `CollectionConfig` - `CollectionConfig<'pages'>
  defaultPopulate: {
    title: true,
    slug: true,
  },
  admin: {
    defaultColumns: ['title', 'slug', 'updatedAt'],
    livePreview: {
      url: ({ data, req }) => {
        const path = generatePreviewPath({
          slug: typeof data?.slug === 'string' ? data.slug : '',
          collection: 'pages',
          req,
        })

        return path
      },
    },
    preview: (data, { req }) =>
      generatePreviewPath({
        slug: typeof data?.slug === 'string' ? data.slug : '',
        collection: 'pages',
        req,
      }),
    useAsTitle: 'title',
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    {
      type: 'tabs',
      tabs: [
        {
          fields: [hero],
          label: 'Hero',
        },
        {
          fields: [
            {
              name: 'layout',
              type: 'blocks',
              blocks: [
                CallToAction,
                Content,
                MediaBlock,
                Archive,
                FormBlock,
                Featured,
                FeatureList,
                FeatureGrid,
                StatsGrid,
                Integration,
                Logos,
                Pricing,
                Testimonials,
                TestimonialHighlight,
                BuildFor,
                Blog,
                FAQ,
                Tabs,
                StickyCards,
                FounderNote,
              ],
              required: true,
              admin: {
                initCollapsed: true,
              },
            },
          ],
          label: 'Content',
        },
        createSEOTab(),
      ],
    },
    {
      name: 'publishedAt',
      type: 'date',
      admin: {
        position: 'sidebar',
      },
    },
    ...slugField(),
  ],
  hooks: {
    afterChange: [revalidatePage],
    beforeChange: [populatePublishedAt],
    afterDelete: [revalidateDelete],
  },
  versions: {
    drafts: {
      autosave: {
        interval: 2000, // 2 seconds - more reasonable for live preview
      },
      schedulePublish: true,
    },
    maxPerDoc: 50,
  },
}
