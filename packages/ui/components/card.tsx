import * as React from 'react'

import { cn } from '../utils/cn'

function Card({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<section
			data-slot="card"
			className={cn(
				'group bg-muted dark:bg-background flex flex-col rounded-2xl p-1',
				className,
			)}
			{...props}
		/>
	)
}

function CardHeader({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<header
			data-slot="card-header"
			className={cn('flex flex-col flex-wrap px-6 py-4', className)}
			{...props}
		/>
	)
}

function CardTitle({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<div
			data-slot="card-title"
			className={cn(
				'text-card-foreground flex flex-wrap items-center gap-x-2 gap-y-0.5 font-medium',
				className,
			)}
			{...props}
		/>
	)
}

function CardDescription({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<p
			data-slot="card-description"
			className={cn(
				'text-muted-foreground mt-0.5 text-sm text-pretty',
				className,
			)}
			{...props}
		/>
	)
}

function CardAction({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<div
			data-slot="card-action"
			className={cn(
				'col-start-2 row-span-2 row-start-1 self-start justify-self-end',
				className,
			)}
			{...props}
		/>
	)
}

function CardContent({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<div
			data-slot="card-content"
			className={cn(
				'bg-card ring-border overflow-hidden rounded-xl p-6 shadow-sm ring-1',
				className,
			)}
			{...props}
		/>
	)
}

function CardBody({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<div
			data-slot="card-body"
			className={cn(
				'border-border space-y-6 border-t p-5.5 first:border-none',
				className,
			)}
			{...props}
		/>
	)
}

function CardHeaderContent({
	className,
	...props
}: React.ComponentProps<'div'>) {
	return (
		<div
			data-slot="card-header-content"
			className={cn('flex-1', className)}
			{...props}
		/>
	)
}

function CardFooter({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<footer
			data-slot="card-footer"
			className={cn('flex px-5 py-3 pb-1.5', className)}
			{...props}
		/>
	)
}

export {
	Card,
	CardHeader,
	CardHeaderContent,
	CardFooter,
	CardTitle,
	CardAction,
	CardDescription,
	CardContent,
	CardBody,
}
