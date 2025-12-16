import React from 'react'
import { cn } from '../../lib/utils'

export interface PaginationProps {
	className?: string
	currentPage: number
	totalPages: number
	baseUrl?: string
}

export const Pagination: React.FC<PaginationProps> = ({
	className,
	currentPage,
	totalPages,
	baseUrl = '/posts',
}) => {
	const hasNextPage = currentPage < totalPages
	const hasPrevPage = currentPage > 1

	const getPageUrl = (page: number) => {
		return page === 1 ? baseUrl : `${baseUrl}/page/${page}`
	}

	const renderPageNumbers = () => {
		const pages = []
		const showEllipsis = totalPages > 7

		if (!showEllipsis) {
			// Show all pages if total is 7 or less
			for (let i = 1; i <= totalPages; i++) {
				pages.push(
					<a
						key={i}
						href={getPageUrl(i)}
						className={cn(
							'rounded-md px-3 py-2 text-sm font-medium',
							i === currentPage
								? 'bg-blue-600 text-white'
								: 'text-gray-700 hover:bg-gray-100',
						)}
					>
						{i}
					</a>,
				)
			}
		} else {
			// Show ellipsis when there are many pages
			pages.push(
				<a
					key={1}
					href={getPageUrl(1)}
					className={cn(
						'rounded-md px-3 py-2 text-sm font-medium',
						1 === currentPage
							? 'bg-blue-600 text-white'
							: 'text-gray-700 hover:bg-gray-100',
					)}
				>
					1
				</a>,
			)

			if (currentPage > 3) {
				pages.push(
					<span key="ellipsis1" className="px-2 py-2 text-gray-500">
						...
					</span>,
				)
			}

			// Show current page and surrounding pages
			const start = Math.max(2, currentPage - 1)
			const end = Math.min(totalPages - 1, currentPage + 1)

			for (let i = start; i <= end; i++) {
				pages.push(
					<a
						key={i}
						href={getPageUrl(i)}
						className={cn(
							'rounded-md px-3 py-2 text-sm font-medium',
							i === currentPage
								? 'bg-blue-600 text-white'
								: 'text-gray-700 hover:bg-gray-100',
						)}
					>
						{i}
					</a>,
				)
			}

			if (currentPage < totalPages - 2) {
				pages.push(
					<span key="ellipsis2" className="px-2 py-2 text-gray-500">
						...
					</span>,
				)
			}

			if (totalPages > 1) {
				pages.push(
					<a
						key={totalPages}
						href={getPageUrl(totalPages)}
						className={cn(
							'rounded-md px-3 py-2 text-sm font-medium',
							totalPages === currentPage
								? 'bg-blue-600 text-white'
								: 'text-gray-700 hover:bg-gray-100',
						)}
					>
						{totalPages}
					</a>,
				)
			}
		}

		return pages
	}

	if (totalPages <= 1) return null

	return (
		<nav
			className={cn(
				'my-8 flex items-center justify-center space-x-2',
				className,
			)}
		>
			{hasPrevPage && (
				<a
					href={getPageUrl(currentPage - 1)}
					className="flex items-center rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
				>
					<svg className="mr-1 h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
						<path
							fillRule="evenodd"
							d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
							clipRule="evenodd"
						/>
					</svg>
					Previous
				</a>
			)}

			{renderPageNumbers()}

			{hasNextPage && (
				<a
					href={getPageUrl(currentPage + 1)}
					className="flex items-center rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
				>
					Next
					<svg className="ml-1 h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
						<path
							fillRule="evenodd"
							d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
							clipRule="evenodd"
						/>
					</svg>
				</a>
			)}
		</nav>
	)
}
