import { type ReactNode } from 'react'

interface AnnotatedLayoutProps {
	children: ReactNode
}

export function AnnotatedLayout({ children }: AnnotatedLayoutProps) {
	return (
		<div className="[&>*:not(:last-child)]:border-border flex flex-col gap-8 [&>*:not(:last-child)]:border-b [&>*:not(:last-child)]:pb-8">
			{children}
		</div>
	)
}

interface AnnotatedSectionProps {
	title: string
	description: string
	children: ReactNode
}

export function AnnotatedSection({
	title,
	description,
	children,
}: AnnotatedSectionProps) {
	return (
		<div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
			<div className="lg:col-span-1">
				<div className="space-y-2">
					<h3 className="text-lg leading-6 font-medium">{title}</h3>
					<p className="text-muted-foreground text-xs">{description}</p>
				</div>
			</div>
			<div className="lg:col-span-2">{children}</div>
		</div>
	)
}
