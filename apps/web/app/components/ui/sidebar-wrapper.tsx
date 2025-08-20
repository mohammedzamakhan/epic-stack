// Re-export sidebar components from the UI package with app-specific integrations
import { useFetcher } from 'react-router'
import { useIsMobile } from '#app/hooks/use-mobile.ts'
import { IconAdapter } from '#app/components/ui/icon-adapter'
import {
	Sidebar as BaseSidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupAction,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarInput,
	SidebarInset,
	SidebarMenu,
	SidebarMenuAction,
	SidebarMenuBadge,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarMenuSkeleton,
	SidebarMenuSub,
	SidebarMenuSubButton,
	SidebarMenuSubItem,
	SidebarProvider as BaseSidebarProvider,
	SidebarRail,
	SidebarSeparator,
	SidebarTrigger,
	useSidebar,
	sidebarMenuButtonVariants,
	type SidebarPersistenceCallbacks,
} from '@repo/ui'
import * as React from 'react'

// Enhanced SidebarProvider that includes React Router persistence and mobile detection
function SidebarProvider({
	children,
	defaultOpen = true,
	open,
	onOpenChange,
	...props
}: React.ComponentProps<typeof BaseSidebarProvider>) {
	const isMobile = useIsMobile()
	const sidebarFetcher = useFetcher()

	// Create persistence callbacks using React Router
	const persistenceCallbacks: SidebarPersistenceCallbacks = React.useMemo(
		() => ({
			onOpenChange: (isCollapsed: boolean) => {
				// Use a fetcher to update the sidebar state on the server
				void sidebarFetcher.submit(
					{ isCollapsed: String(isCollapsed) },
					{
						method: 'POST',
						action: '/resources/sidebar-state',
					},
				)
			},
		}),
		[sidebarFetcher],
	)

	return (
		<BaseSidebarProvider
			{...props}
			defaultOpen={defaultOpen}
			open={open}
			onOpenChange={onOpenChange}
			isMobile={isMobile}
			persistenceCallbacks={persistenceCallbacks}
			IconComponent={IconAdapter}
		>
			{children}
		</BaseSidebarProvider>
	)
}

// Re-export the base Sidebar (no changes needed)
const Sidebar = BaseSidebar

export {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupAction,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarInput,
	SidebarInset,
	SidebarMenu,
	SidebarMenuAction,
	SidebarMenuBadge,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarMenuSkeleton,
	SidebarMenuSub,
	SidebarMenuSubButton,
	SidebarMenuSubItem,
	SidebarProvider,
	SidebarRail,
	SidebarSeparator,
	SidebarTrigger,
	useSidebar,
	sidebarMenuButtonVariants,
}
