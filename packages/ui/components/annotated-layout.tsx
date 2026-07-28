import { type ReactNode } from 'react'
import { cn } from '../lib/utils'

interface AnnotatedLayoutProps {
	children: ReactNode
}

export function AnnotatedLayout({ children }: AnnotatedLayoutProps) {
	return (
		<div className="flex flex-col [&>*:not(:last-child)]:pb-6">{children}</div>
	)
}

interface AnnotatedSectionProps {
	className?: string
	children: ReactNode
}

export function AnnotatedSection({
	className,
	children,
}: AnnotatedSectionProps) {
	return (
		<div className={cn('grid grid-cols-1 gap-2 lg:grid-cols-3', className)}>
			<div className="lg:col-span-2">{children}</div>
		</div>
	)
}
