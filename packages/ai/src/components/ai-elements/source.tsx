'use client'

import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from '@repo/ui/collapsible'
import { Icon } from '@repo/ui/icon'
import { type ComponentProps } from 'react'

import { cn } from '@repo/ui/cn'

export type SourcesProps = ComponentProps<'div'>

export const Sources = ({ className, ...props }: SourcesProps) => (
	<Collapsible
		className={cn('not-prose text-primary mb-4 text-xs', className)}
		{...props}
	/>
)

export type SourcesTriggerProps = ComponentProps<typeof CollapsibleTrigger> & {
	count: number
	_className?: string
}

export const SourcesTrigger = ({
	_className,
	count,
	children,
	...props
}: SourcesTriggerProps) => (
	<CollapsibleTrigger className="flex items-center gap-2" {...props}>
		{children ?? (
			<>
				<p className="font-medium">Used {count} sources</p>
				<Icon name="chevron-down" className="h-4 w-4" />
			</>
		)}
	</CollapsibleTrigger>
)

export type SourcesContentProps = ComponentProps<typeof CollapsibleContent>

export const SourcesContent = ({
	className,
	...props
}: SourcesContentProps) => (
	<CollapsibleContent
		className={cn(
			'mt-3 flex w-fit flex-col gap-2',
			'motion-safe:data-[state=open]:animate-in motion-safe:data-[state=closed]:animate-out motion-safe:data-[state=closed]:fade-out-0 motion-safe:data-[state=closed]:slide-out-to-top-2 motion-safe:data-[state=open]:slide-in-from-top-2 outline-none',
			className,
		)}
		{...props}
	/>
)

export type SourceProps = ComponentProps<'a'>

export const Source = ({ href, title, children, ...props }: SourceProps) => (
	<a
		className="flex items-center gap-2"
		href={href}
		rel="noreferrer"
		target="_blank"
		{...props}
	>
		{children ?? (
			<>
				<Icon name="file-text" className="h-4 w-4" />
				<span className="block font-medium">{title}</span>
			</>
		)}
	</a>
)
