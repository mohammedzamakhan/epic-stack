import React from 'react'

import type { BlogBlock as BlogBlockProps } from '@/payload-types'

interface Post {
  id: string
  title: string
  slug: string
  meta?: {
    description?: string
    image?: {
      url: string
      alt?: string
    }
  }
}

export const BlogBlock: React.FC<BlogBlockProps> = (props) => {
  const {
    title = 'From our blog',
    subtitle = 'Latest insights',
    description = 'Stay updated with our latest insights, tutorials, and product updates',
    showViewAll = true,
    viewAllUrl = '/posts',
    populateBy = 'collection',
    relationTo = 'posts',
    categories = [],
    limit = 3,
    selectedPosts = [],
  } = props

  // Mock posts for preview (in real implementation, this would come from the CMS)
  const mockPosts: Post[] = [
    {
      id: '1',
      title: 'Getting Started with Payload CMS',
      slug: 'getting-started-payload-cms',
      meta: {
        description: 'Learn how to set up and configure Payload CMS for your next project.',
        image: {
          url: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&h=400&fit=crop',
          alt: 'Payload CMS setup',
        },
      },
    },
    {
      id: '2',
      title: 'Building Modern Web Applications',
      slug: 'building-modern-web-applications',
      meta: {
        description: 'Best practices for creating scalable and maintainable web applications.',
        image: {
          url: 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=800&h=400&fit=crop',
          alt: 'Modern web development',
        },
      },
    },
    {
      id: '3',
      title: 'TypeScript Tips and Tricks',
      slug: 'typescript-tips-tricks',
      meta: {
        description: 'Advanced TypeScript patterns that will make your code more robust.',
        image: {
          url: 'https://images.unsplash.com/photo-1516116216624-53e697fedbea?w=800&h=400&fit=crop',
          alt: 'TypeScript development',
        },
      },
    },
  ]

  const displayPosts = populateBy === 'selection' ? selectedPosts : mockPosts.slice(0, limit)

  return (
    <section className="relative w-full py-16 md:py-24">
      <div className="container relative mx-auto px-4 md:px-6">
        <div className="text-center mb-12">
          <h3 className="font-mono text-sm uppercase tracking-wide text-muted-foreground mb-6">
            {/* {subtitle.toUpperCase()} */}
          </h3>
          <h2 className="text-4xl md:text-6xl font-light text-primary mb-4">
            {title}
          </h2>
          <p className="text-xl text-muted-foreground max-w-[600px] mx-auto">
            {description}
          </p>
        </div>

        {displayPosts.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 border-l border-t border-dashed gap-0">
            {displayPosts.map((post) => (
              <article key={post.id} className="border-b border-r border-dashed bg-background hover:bg-gradient-to-b from-muted/5 to-muted/50 transition-colors">
                {post.meta?.image && (
                  <div className="aspect-video overflow-hidden border-b border-dashed">
                    <img
                      src={post.meta.image.url}
                      alt={post.meta.image.alt || post.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div className="py-4 space-y-4">
                  <h3 className="text-lg font-semibold text-primary border-l-2 border-primary pl-4">
                    <a
                      href={`/posts/${post.slug}`}
                      className="hover:text-primary/80 transition-colors"
                    >
                      {post.title}
                    </a>
                  </h3>
                  {post.meta?.description && (
                    <p className="text-muted-foreground text-sm leading-relaxed pl-4">
                      {post.meta.description}
                    </p>
                  )}
                  <a
                    href={`/posts/${post.slug}`}
                    className="inline-flex items-center text-sm font-medium text-primary hover:text-primary/80 border-b-2 border-transparent hover:border-primary/80 transition-colors pl-4"
                  >
                    Read more
                    <svg
                      className="ml-1 w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M17 8l4 4m0 0l-4 4m4-4H3"
                      />
                    </svg>
                  </a>
                </div>
              </article>
            ))}
          </div>
        )}

        {showViewAll && (
          <div className="text-center mt-12">
            <a
              href={viewAllUrl}
              className="inline-flex items-center text-lg font-medium text-primary hover:text-primary/80 border-b-2 border-transparent hover:border-primary/80 transition-colors"
            >
              View all posts
              <svg
                className="ml-2 w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M17 8l4 4m0 0l-4 4m4-4H3"
                />
              </svg>
            </a>
          </div>
        )}
      </div>
    </section>
  )
}
