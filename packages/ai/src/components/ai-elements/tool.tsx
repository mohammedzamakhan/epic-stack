'use client'

import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from '@repo/ui/collapsible'
import { Icon } from '@repo/ui/icon'
import { Badge } from '@repo/ui/badge'
import { type ComponentProps, type ReactNode } from 'react'

import { cn } from '@repo/ui/cn'
type ToolUIPart = {
	type: 'tool-code'
	state:
		| 'input-streaming'
		| 'input-available'
		| 'output-available'
		| 'output-error'
	input: any
	output: any
	errorText?: string
}
import { CodeBlock } from './code-block'

export type ToolProps = ComponentProps<typeof Collapsible>

export const Tool = ({ className, ...props }: ToolProps) => (
	<Collapsible
		className={cn('not-prose mb-4 w-full rounded-md border', className)}
		{...props}
	/>
)

export type ToolHeaderProps = {
	type: ToolUIPart['type']
	state: ToolUIPart['state']
	className?: string
}

const getStatusBadge = (status: ToolUIPart['state']) => {
	const labels: Record<ToolUIPart['state'], string> = {
		'input-streaming': 'Pending',
		'input-available': 'Running',
		'output-available': 'Completed',
		'output-error': 'Error',
	}

	const icons: Record<ToolUIPart['state'], ReactNode> = {
		'input-streaming': <Icon name="ellipsis" className="size-4" />,
		'input-available': <Icon name="clock" className="size-4 animate-pulse" />,
		'output-available': (
			<Icon name="check-circle" className="size-4 text-green-600" />
		),
		'output-error': (
			<Icon name="octagon-alert" className="size-4 text-red-600" />
		),
	}

	return (
		<Badge className="rounded-full text-xs" variant="secondary">
			{icons[status]}
			{labels[status]}
		</Badge>
	)
}

export const ToolHeader = ({
	className,
	type,
	state,
	...props
}: ToolHeaderProps) => (
	<CollapsibleTrigger
		className={cn(
			'flex w-full items-center justify-between gap-4 p-3',
			className,
		)}
		{...props}
	>
		<div className="flex items-center gap-2">
			<Icon name="gear" className="text-muted-foreground size-4" />
			<span className="text-sm font-medium">{type}</span>
			{getStatusBadge(state)}
		</div>
		<Icon
			name="chevron-down"
			className="text-muted-foreground size-4 transition-transform group-data-[state=open]:rotate-180"
		/>
	</CollapsibleTrigger>
)

export type ToolContentProps = ComponentProps<typeof CollapsibleContent>

export const ToolContent = ({ className, ...props }: ToolContentProps) => (
	<CollapsibleContent
		className={cn(
			'text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-top-2 data-[state=open]:slide-in-from-top-2 outline-none',
			className,
		)}
		{...props}
	/>
)

export type ToolInputProps = ComponentProps<'div'> & {
	input: any
}

export const ToolInput = ({ className, input, ...props }: ToolInputProps) => (
	<div className={cn('space-y-2 overflow-hidden p-4', className)} {...props}>
		<h4 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
			Parameters
		</h4>
		<div className="bg-muted/50 rounded-md">
			<CodeBlock code={JSON.stringify(input, null, 2)} language="json" />
		</div>
	</div>
)

export type ToolOutputProps = ComponentProps<'div'> & {
	output: ReactNode
	errorText: string | undefined
}

export const ToolOutput = ({
	className,
	output,
	errorText,
	...props
}: ToolOutputProps) => {
	if (!(output || errorText)) {
		return null
	}

	return (
		<div className={cn('space-y-2 p-4', className)} {...props}>
			<h4 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
				{errorText ? 'Error' : 'Result'}
			</h4>
			<div
				className={cn(
					'overflow-x-auto rounded-md text-xs [&_table]:w-full',
					errorText
						? 'bg-destructive/10 text-destructive'
						: 'bg-muted/50 text-foreground',
				)}
			>
				{errorText && <div>{errorText}</div>}
				{output && <div>{output}</div>}
			</div>
		</div>
	)
}
