import * as React from 'react'

import { useLocation, useRouteLoaderData } from 'react-router'
import { FoldersIcon } from '#app/components/icons/folders-icon'
import { HomeIcon } from '#app/components/icons/home-icon'
import { SettingsGearIcon } from '#app/components/icons/settings-gear-icon'
import { NavMain } from '#app/components/nav-main'
import { NavUser } from '#app/components/nav-user'
import { TeamSwitcher } from '#app/components/team-switcher'
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarHeader,
} from '#app/components/ui/sidebar'
import { type loader as rootLoader } from '#app/root.tsx'

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
	const rootData = useRouteLoaderData<typeof rootLoader>('root')
	const location = useLocation()

	const data = {
		user: rootData?.user
			? {
				name: rootData.user.name || rootData.user.username || 'User',
				email: rootData.user.username, // Using username as email since email property is not available
				avatar: rootData.user.image
					? `/resources/images?objectKey=${rootData.user.image.objectKey}`
					: '/avatars/user.jpg',
			}
			: {
				name: 'Guest',
				email: '',
				avatar: '/avatars/user.jpg',
			},
		navMain: [
			{
				title: 'Dashboard',
				url: `/app/${rootData?.userOrganizations?.currentOrganization?.organization.slug}`,
				isActive:
					location.pathname ===
					`/app/${rootData?.userOrganizations?.currentOrganization?.organization.slug}`,
				icon: HomeIcon,
			},
			{
				title: 'Notes',
				url: `/app/${rootData?.userOrganizations?.currentOrganization?.organization.slug}/notes`,
				isActive: location.pathname.includes(
					`/app/${rootData?.userOrganizations?.currentOrganization?.organization.slug}/notes`,
				),
				icon: FoldersIcon,
			},
			{
				title: 'Settings',
				url: `/app/${rootData?.userOrganizations?.currentOrganization?.organization.slug}/settings`,
				isActive: location.pathname.includes(
					`/app/${rootData?.userOrganizations?.currentOrganization?.organization.slug}/settings`,
				),
				icon: SettingsGearIcon,
				items: [
					{
						title: 'General',
						url: `/app/${rootData?.userOrganizations?.currentOrganization?.organization.slug}/settings`,
						isActive:
							location.pathname ===
							`/app/${rootData?.userOrganizations?.currentOrganization?.organization.slug}/settings`,
					},
					{
						title: 'Members',
						url: `/app/${rootData?.userOrganizations?.currentOrganization?.organization.slug}/settings/members`,
						isActive:
							location.pathname ===
							`/app/${rootData?.userOrganizations?.currentOrganization?.organization.slug}/settings/members`,
					},
					{
						title: 'Integrations',
						url: `/app/${rootData?.userOrganizations?.currentOrganization?.organization.slug}/settings/integrations`,
						isActive:
							location.pathname ===
							`/app/${rootData?.userOrganizations?.currentOrganization?.organization.slug}/settings/integrations`,
					},
					{
						title: 'Billing',
						url: `/app/${rootData?.userOrganizations?.currentOrganization?.organization.slug}/settings/billing`,
						isActive:
							location.pathname ===
							`/app/${rootData?.userOrganizations?.currentOrganization?.organization.slug}/settings/billing`,
					},
				],
			},
		],
	}
	return (
		<Sidebar collapsible="offcanvas" {...props}>
			<SidebarHeader>
				<TeamSwitcher />
			</SidebarHeader>
			<SidebarContent>
				<NavMain items={data.navMain} />
			</SidebarContent>
			<SidebarFooter>
				<NavUser user={data.user} />
			</SidebarFooter>
		</Sidebar>
	)
}
