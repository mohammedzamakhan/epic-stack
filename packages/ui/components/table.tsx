import * as React from 'react'

import { cn } from '../utils/cn'

function Table({ className, ...props }: React.ComponentProps<'table'>) {
	return (
		<div className="bg-card ring-border overflow-hidden rounded-xl shadow-sm ring-1">
			<div className="relative w-full overflow-x-auto">
				<table className={cn('w-full', className)} {...props} />
			</div>
		</div>
	)
}

function TableHeader({ className, ...props }: React.ComponentProps<'thead'>) {
	return <thead className={cn('bg-background', className)} {...props} />
}

function TableBody({ className, ...props }: React.ComponentProps<'tbody'>) {
	return <tbody className={cn('', className)} {...props} />
}

function TableFooter({ className, ...props }: React.ComponentProps<'tfoot'>) {
	return (
		<tfoot
			className={cn('bg-muted/30 border-border/50 border-t', className)}
			{...props}
		/>
	)
}

function TableRow({ className, ...props }: React.ComponentProps<'tr'>) {
	return (
		<tr
			className={cn(
				'hover:bg-muted/40 border-border/20 border-b transition-colors last:border-b-0',
				className,
			)}
			{...props}
		/>
	)
}

function TableHead({ className, ...props }: React.ComponentProps<'th'>) {
	return (
		<th
			className={cn(
				'text-muted-foreground overflow-hidden px-6 pt-4 pb-3.5 text-left text-xs font-medium [&_[data-table-sort-spacer]]:hidden [&:has([data-table-sort])_[data-table-sort-spacer]]:hidden',
				className,
			)}
			{...props}
		/>
	)
}

function TableCell({ className, ...props }: React.ComponentProps<'td'>) {
	return (
		<td
			className={cn(
				'text-foreground bg-card px-6 py-2 text-left text-sm',
				className,
			)}
			{...props}
		/>
	)
}

function TableCaption({
	className,
	...props
}: React.ComponentProps<'caption'>) {
	return (
		<caption
			className={cn('text-muted-foreground mt-4 text-sm', className)}
			{...props}
		/>
	)
}

export {
	Table,
	TableHeader,
	TableBody,
	TableFooter,
	TableHead,
	TableRow,
	TableCell,
	TableCaption,
}
