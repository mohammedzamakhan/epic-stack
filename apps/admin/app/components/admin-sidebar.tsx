import { msg, Trans } from '@lingui/macro'
import { useLingui } from '@lingui/react'
import * as React from 'react'
import { Link, useLocation, useRouteLoaderData } from 'react-router'
import { useDirection } from '@repo/ui'
import { BuildingIcon } from '@repo/ui/building-icon'
import { ClockIcon } from '@repo/ui/clock-icon'
import { FlaskIcon } from '@repo/ui/flask-icon'
import { GlobeIcon } from '@repo/ui/globe-icon'
import { HomeIcon } from '@repo/ui/home-icon'
import { Logo } from '@repo/ui/logo'
import { MessageSquareMoreIcon } from '@repo/ui/message-square-more'
import { SettingsGearIcon } from '@repo/ui/settings-gear-icon'
import { ShieldCheckIcon } from '@repo/ui/shield-check-icon'
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarHeader,
} from '@repo/ui/sidebar'
import { UserIcon } from '@repo/ui/user-icon'
import { NavMain } from '#app/components/nav-main.tsx'
import { NavUser } from '#app/components/nav-user.tsx'
import { type loader as rootLoader } from '#app/root.tsx'

export function AdminSidebar({
	...props
}: React.ComponentProps<typeof Sidebar>) {
	const { _ } = useLingui()
	const rootData = useRouteLoaderData<typeof rootLoader>('root')
	const location = useLocation()
	const direction = useDirection()

	// Admin navigation items
	const navMain = [
		{
			title: _(msg`Dashboard`),
			url: '/',
			isActive: location.pathname === '/',
			icon: HomeIcon,
		},
		{
			title: _(msg`Users`),
			url: '/users',
			isActive: location.pathname.startsWith('/users'),
			icon: UserIcon,
		},
		{
			title: _(msg`Waitlist`),
			url: '/waitlist',
			isActive: location.pathname.startsWith('/waitlist'),
			icon: ClockIcon,
		},
		{
			title: _(msg`Organizations`),
			url: '/organizations',
			isActive: location.pathname.startsWith('/organizations'),
			icon: BuildingIcon,
		},
		{
			title: _(msg`Roles`),
			url: '/roles',
			isActive: location.pathname.startsWith('/roles'),
			icon: ShieldCheckIcon,
		},
		{
			title: _(msg`IP Addresses`),
			url: '/ip-addresses',
			isActive: location.pathname.startsWith('/ip-addresses'),
			icon: GlobeIcon,
		},
		{
			title: _(msg`Cache`),
			url: '/cache',
			isActive: location.pathname.startsWith('/cache'),
			icon: SettingsGearIcon,
		},
		{
			title: _(msg`Audit Logs`),
			url: '/audit-logs',
			isActive: location.pathname.startsWith('/audit-logs'),
			icon: ShieldCheckIcon,
		},
		{
			title: _(msg`Feedback`),
			url: '/feedback',
			isActive: location.pathname.startsWith('/feedback'),
			icon: MessageSquareMoreIcon,
		},
		{
			title: _(msg`Feature Flags`),
			url: '/feature-flags',
			isActive: location.pathname.startsWith('/feature-flags'),
			icon: FlaskIcon,
		},
	]

	// User data for NavUser component
	const userData = rootData?.user
		? {
				name: rootData.user.name || rootData.user.username || _(msg`Admin`),
				email: rootData.user.username,
				avatar: rootData.user.image
					? `/resources/images?objectKey=${rootData.user.image.objectKey}`
					: '/avatars/user.jpg',
				roles: rootData.user.roles,
			}
		: {
				name: _(msg`Admin`),
				email: '',
				avatar: '/avatars/user.jpg',
				roles: [],
			}

	return (
		<Sidebar
			side={direction === 'rtl' ? 'right' : 'left'}
			collapsible="icon"
			{...props}
		>
			<SidebarHeader className="p-2">
				<Link to="/">
					<Logo className="mb-0" />
				</Link>
				<div className="bg-sidebar-accent rounded-lg p-2 px-6 text-center">
					<div className="text-sidebar-foreground text-sm font-bold">
						<Trans>Admin Dashboard</Trans>
					</div>
					<div className="text-sidebar-muted-foreground text-xs">
						<Trans>System Management</Trans>
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
