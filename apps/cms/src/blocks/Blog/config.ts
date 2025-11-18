import type { Block } from 'payload'

export const Blog: Block = {
  slug: 'blog',
  interfaceName: 'BlogBlock',
  fields: [
    {
      name: 'title',
      type: 'text',
      defaultValue: 'From our blog',
      label: 'Section Title',
    },
    {
      name: 'subtitle',
      type: 'text',
      defaultValue: 'Latest insights',
      label: 'Section Subtitle',
    },
    {
      name: 'description',
      type: 'textarea',
      defaultValue: 'Stay updated with our latest insights, tutorials, and product updates',
      label: 'Description',
    },
    {
      name: 'showViewAll',
      type: 'checkbox',
      defaultValue: true,
      label: 'Show "View All" Link',
    },
    {
      name: 'viewAllUrl',
      type: 'text',
      defaultValue: '/blog',
      label: 'View All URL',
      admin: {
        condition: (data) => Boolean(data?.showViewAll),
      },
    },
    {
      name: 'populateBy',
      type: 'select',
      defaultValue: 'collection',
      options: [
        {
          label: 'Collection',
          value: 'collection',
        },
        {
          label: 'Individual Selection',
          value: 'selection',
        },
      ],
      admin: {
        description: 'How to populate the blog posts',
      },
    },
    {
      name: 'relationTo',
      type: 'select',
      defaultValue: 'posts',
      options: [
        {
          label: 'Posts',
          value: 'posts',
        },
      ],
      admin: {
        condition: (data) => data?.populateBy === 'collection',
      },
    },
    {
      name: 'categories',
      type: 'relationship',
      relationTo: 'categories',
      hasMany: true,
      admin: {
        condition: (data) => data?.populateBy === 'collection',
        description: 'Filter posts by categories (optional)',
      },
    },
    {
      name: 'limit',
      type: 'number',
      defaultValue: 3,
      min: 1,
      max: 12,
      admin: {
        condition: (data) => data?.populateBy === 'collection',
        description: 'Maximum number of posts to display',
      },
    },
    {
      name: 'selectedPosts',
      type: 'relationship',
      relationTo: 'posts',
      hasMany: true,
      admin: {
        condition: (data) => data?.populateBy === 'selection',
        description: 'Select specific posts to display',
      },
    },
  ],
}
