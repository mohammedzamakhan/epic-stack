import * as React from 'react'

import { cn } from '#app/utils/misc'

function Card({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<section
			data-slot="card"
			className={cn(
				'group flex flex-col rounded-3xl py-1 bg-gray-50',
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
			className={cn(
				'flex flex-wrap items-center justify-between gap-4 px-6 py-4',
				className,
			)}
			{...props}
		/>
	)
}

function CardTitle({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<h2
			data-slot="card-title"
			className={cn('flex flex-wrap items-center gap-x-2 gap-y-0.5 text-gray-900 font-medium', className)}
			{...props}
		/>
	)
}

function CardDescription({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<p
			data-slot="card-description"
			className={cn('mt-0.5 text-pretty text-sm text-gray-600', className)}
			{...props}
		/>
	)
}

function CardAction({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<div
			data-slot="card-action"
			className={cn('flex items-center gap-2', className)}
			{...props}
		/>
	)
}

function CardContent({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<div
			data-slot="card-content"
			className={cn('overflow-hidden rounded-xl bg-white mx-1 ring-1 ring-black/4 shadow-sm', className)}
			{...props}
		/>
	)
}

function CardBody({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<div
			data-slot="card-body"
			className={cn('space-y-6 border-t border-gray-100 first:border-none p-5.5', className)}
			{...props}
		/>
	)
}

function CardFooter({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<footer
			data-slot="card-footer"
			className={cn('px-5 pb-3 pt-4', className)}
			{...props}
		/>
	)
}

export {
	Card,
	CardHeader,
	CardFooter,
	CardTitle,
	CardAction,
	CardDescription,
	CardContent,
	CardBody,
}
