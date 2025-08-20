import { type ReactNode } from 'react'

interface AnnotatedLayoutProps {
	children: ReactNode
}

export function AnnotatedLayout({ children }: AnnotatedLayoutProps) {
	return (
		<div className="flex flex-col [&>*:not(:last-child)]:pb-6">{children}</div>
	)
}

interface AnnotatedSectionProps {
	children: ReactNode
}

export function AnnotatedSection({ children }: AnnotatedSectionProps) {
	return (
		<div className="grid grid-cols-1 gap-2 lg:grid-cols-3">
			<div className="lg:col-span-2">{children}</div>
		</div>
	)
}
