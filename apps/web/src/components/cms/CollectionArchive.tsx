import React from 'react'
import { Card } from './Card'
import { type Post } from '@/lib/cms'
import { cn } from '../../lib/utils'

export interface CollectionArchiveProps {
	posts: Post[]
	className?: string
}

export const CollectionArchive: React.FC<CollectionArchiveProps> = ({
	posts,
	className,
}) => {
	return (
		<div className={cn('container mx-auto px-4', className)}>
			<div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
				{posts?.map((post, index) => (
					<Card key={post.id || index} post={post} showCategories />
				))}
			</div>
		</div>
	)
}
