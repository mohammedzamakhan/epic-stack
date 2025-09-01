import * as React from 'react'
import { Link, useLocation, useRouteLoaderData } from 'react-router'
import { BuildingIcon } from '#app/components/icons/building-icon'
import { HomeIcon } from '#app/components/icons/home-icon'
import { SettingsGearIcon } from '#app/components/icons/settings-gear-icon'
import { UserIcon } from '#app/components/icons/user-icon'
import { NavMain } from '#app/components/nav-main'
import { NavUser } from '#app/components/nav-user'
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader } from '@repo/ui'
import { type loader as rootLoader } from '#app/root.tsx'
import { GlobeIcon } from './icons/globe-icon'
import { Logo } from './icons/logo'
import { MessageSquareMoreIcon } from './icons/message-square-more'
import { ShieldCheckIcon } from './icons/shield-check-icon'

export function AdminSidebar({
	...props
}: React.ComponentProps<typeof Sidebar>) {
	const rootData = useRouteLoaderData<typeof rootLoader>('root')
	const location = useLocation()

	// Admin navigation items
	const navMain = [
		{
			title: 'Dashboard',
			url: '/admin',
			isActive: location.pathname === '/admin',
			icon: HomeIcon,
		},
		{
			title: 'Users',
			url: '/admin/users',
			isActive: location.pathname.startsWith('/admin/users'),
			icon: UserIcon,
		},
		{
			title: 'Organizations',
			url: '/admin/organizations',
			isActive: location.pathname.startsWith('/admin/organizations'),
			icon: BuildingIcon,
		},
		{
			title: 'Roles',
			url: '/admin/roles',
			isActive: location.pathname.startsWith('/admin/roles'),
			icon: ShieldCheckIcon,
		},
		{
			title: 'IP Addresses',
			url: '/admin/ip-addresses',
			isActive: location.pathname.startsWith('/admin/ip-addresses'),
			icon: GlobeIcon,
		},
		{
			title: 'Cache',
			url: '/admin/cache',
			isActive: location.pathname.startsWith('/admin/cache'),
			icon: SettingsGearIcon,
		},
		{
			title: 'Audit Logs',
			url: '/admin/audit-logs',
			isActive: location.pathname.startsWith('/admin/audit-logs'),
			icon: ShieldCheckIcon,
		},
		{
			title: 'Feedback',
			url: '/admin/feedback',
			isActive: location.pathname.startsWith('/admin/feedback'),
			icon: MessageSquareMoreIcon,
		},
		{
			title: 'Feature Flags',
			url: '/admin/feature-flags',
			isActive: location.pathname.startsWith('/admin/feature-flags'),
			icon: SettingsGearIcon,
		},
	]

	// User data for NavUser component
	const userData = rootData?.user
		? {
				name: rootData.user.name || rootData.user.username || 'Admin',
				email: rootData.user.username,
				avatar: rootData.user.image
					? `/resources/images?objectKey=${rootData.user.image.objectKey}`
					: '/avatars/user.jpg',
				roles: rootData.user.roles,
			}
		: {
				name: 'Admin',
				email: '',
				avatar: '/avatars/user.jpg',
				roles: [],
			}

	return (
		<Sidebar collapsible="offcanvas" {...props}>
			<SidebarHeader className="p-2">
				<Link to="/">
					<Logo className="mb-0" />
				</Link>
				<div className="bg-sidebar-accent p-2 px-6 text-center">
					<div className="text-sidebar-foreground text-sm font-medium">
						Admin Dashboard
					</div>
					<div className="text-sidebar-muted-foreground text-xs">
						System Management
					</div>
				</div>
			</SidebarHeader>

			<SidebarContent>
				<NavMain items={navMain} />
			</SidebarContent>

			<SidebarFooter>
				<NavUser user={userData} />
			</SidebarFooter>
		</Sidebar>
	)
}
