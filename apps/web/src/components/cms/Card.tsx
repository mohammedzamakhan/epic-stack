import React from 'react'
import { cn } from '@/lib/utils'
import type { Post } from '@/lib/cms'

export interface CardProps {
  className?: string
  post: Post
  showCategories?: boolean
}

export const Card: React.FC<CardProps> = ({ className, post, showCategories = false }) => {
  const { slug, categories, meta, title } = post
  const { description, image: metaImage } = meta || {}

  const hasCategories = categories && Array.isArray(categories) && categories.length > 0
  const sanitizedDescription = description?.replace(/\s/g, ' ')
  const href = `/posts/${slug}`

  return (
    <article
      className={cn(
        'border border-gray-200 rounded-lg overflow-hidden bg-white hover:shadow-lg transition-shadow',
        className,
      )}
    >
      <div className="relative w-full">
        {metaImage && typeof metaImage === 'object' && metaImage.url && (
          <img 
            src={metaImage.url} 
            alt={metaImage.alt || title || 'Post image'} 
            className="w-full h-48 object-cover"
          />
        )}
        {!metaImage && (
          <div className="w-full h-48 bg-gray-200 flex items-center justify-center text-gray-500">
            No image
          </div>
        )}
      </div>
      <div className="p-4">
        {showCategories && hasCategories && (
          <div className="uppercase text-sm mb-4 text-gray-600">
            {categories?.map((category: any, index: number) => {
              if (typeof category === 'object') {
                const categoryTitle = category.title || 'Untitled category'
                const isLast = index === categories.length - 1

                return (
                  <span key={index}>
                    {categoryTitle}
                    {!isLast && ', '}
                  </span>
                )
              }
              return null
            })}
          </div>
        )}
        {title && (
          <div className="prose">
            <h3 className="text-xl font-semibold mb-2">
              <a href={href} className="hover:text-blue-600 transition-colors">
                {title}
              </a>
            </h3>
          </div>
        )}
        {description && (
          <div className="mt-2">
            <p className="text-gray-600">{sanitizedDescription}</p>
          </div>
        )}
      </div>
    </article>
  )
}