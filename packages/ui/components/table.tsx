import * as React from 'react'

import { cn } from '../utils/cn'

function Table({ className, ...props }: React.ComponentProps<'table'>) {
	return (
		<section className="bg-muted dark:bg-background relative isolate mx-auto flex max-w-none flex-col overflow-hidden rounded-2xl p-1.5">
			<div className="relative isolate order-1 -m-1">
				<div className="after:bg-card dark:after:bg-muted after:absolute after:inset-0 after:top-10 after:z-[-1] after:rounded-xl">
					<div className="before:ring-muted dark:before:ring-background after:border-border overflow-hidden before:pointer-events-none before:absolute before:inset-0 before:top-10 before:z-10 before:rounded-xl before:ring-2 after:pointer-events-none after:absolute after:inset-0 after:top-10 after:z-20 after:rounded-xl after:border">
						<div className="relative overflow-x-auto rounded-xl">
							<table
								className={cn(
									'relative min-w-full table-fixed whitespace-nowrap',
									className,
								)}
								{...props}
							/>
						</div>
					</div>
				</div>
			</div>
		</section>
	)
}

function TableHeader({ className, ...props }: React.ComponentProps<'thead'>) {
	return <thead className={cn('', className)} {...props} />
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
				'group/table-row hover:bg-muted/50 [&+&]:border-border [&+&]:border-t',
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
				'text-foreground overflow-hidden px-4 pt-3 pb-2 text-sm font-medium ltr:text-left rtl:text-right',
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
				'text-foreground overflow-hidden border-0 px-4 py-2 text-sm ltr:text-left rtl:text-right',
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
