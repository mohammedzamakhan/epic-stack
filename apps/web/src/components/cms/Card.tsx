import React from 'react'
import { type Post } from '@/lib/cms'
import { cn } from '../../lib/utils'

export interface CardProps {
	className?: string
	post: Post
	showCategories?: boolean
}

export const Card: React.FC<CardProps> = ({
	className,
	post,
	showCategories = false,
}) => {
	const { slug, categories, meta, title } = post
	const { description, image: metaImage } = meta || {}

	const hasCategories =
		categories && Array.isArray(categories) && categories.length > 0
	const sanitizedDescription = description?.replace(/\s/g, ' ')
	const href = `/posts/${slug}`

	return (
		<article
			className={cn(
				'overflow-hidden rounded-lg border border-gray-200 bg-white transition-shadow hover:shadow-lg',
				className,
			)}
		>
			<div className="relative w-full">
				{metaImage && typeof metaImage === 'object' && metaImage.url && (
					<img
						src={metaImage.url}
						alt={metaImage.alt || title || 'Post image'}
						className="h-48 w-full object-cover"
					/>
				)}
				{!metaImage && (
					<div className="flex h-48 w-full items-center justify-center bg-gray-200 text-gray-500">
						No image
					</div>
				)}
			</div>
			<div className="p-4">
				{showCategories && hasCategories && (
					<div className="mb-4 text-sm text-gray-600 uppercase">
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
						<h3 className="mb-2 text-xl font-semibold">
							<a href={href} className="transition-colors hover:text-blue-600">
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
