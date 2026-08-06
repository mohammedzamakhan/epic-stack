'use client'

import { Tabs as TabsPrimitive } from '@base-ui/react/tabs'
import { forwardRef } from 'react'

import { cn } from '../lib/utils'

const DevToolsTabs = TabsPrimitive.Root

const DevToolsTabsList = forwardRef<
	React.ElementRef<typeof TabsPrimitive.List>,
	React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
	<TabsPrimitive.List
		ref={ref}
		data-slot="devtools-tabs-list"
		className={cn(
			'bg-muted border-border inline-flex h-[29px] items-center border-b',
			className,
		)}
		{...props}
	/>
))
DevToolsTabsList.displayName = 'DevToolsTabsList'

const DevToolsTabsTrigger = forwardRef<
	React.ElementRef<typeof TabsPrimitive.Tab>,
	React.ComponentPropsWithoutRef<typeof TabsPrimitive.Tab>
>(({ className, ...props }, ref) => (
	<TabsPrimitive.Tab
		ref={ref}
		data-slot="devtools-tabs-trigger"
		className={cn(
			'relative inline-flex items-center justify-center px-2 py-1.5 text-[12px] font-normal',
			'text-muted-foreground transition-colors',
			'hover:text-foreground hover:bg-border',
			'data-active:text-foreground',
			'data-active:after:bg-primary data-active:after:absolute data-active:after:right-0 data-active:after:bottom-0 data-active:after:left-0 data-active:after:h-[2px] data-active:after:rounded-t-full',
			'focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
			className,
		)}
		{...props}
	/>
))
DevToolsTabsTrigger.displayName = 'DevToolsTabsTrigger'

const DevToolsTabsContent = forwardRef<
	React.ElementRef<typeof TabsPrimitive.Panel>,
	React.ComponentPropsWithoutRef<typeof TabsPrimitive.Panel>
>(({ className, ...props }, ref) => (
	<TabsPrimitive.Panel
		ref={ref}
		data-slot="devtools-tabs-content"
		className={cn(
			'bg-background text-foreground flex-1 outline-none',
			className,
		)}
		{...props}
	/>
))
DevToolsTabsContent.displayName = 'DevToolsTabsContent'

export {
	DevToolsTabs,
	DevToolsTabsList,
	DevToolsTabsTrigger,
	DevToolsTabsContent,
}
