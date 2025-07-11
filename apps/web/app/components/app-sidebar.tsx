
import * as React from 'react'

import { useLocation, useRouteLoaderData } from 'react-router'
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
		user: rootData?.user ? {
			name: rootData.user.name || rootData.user.username || 'User',
			email: rootData.user.username, // Using username as email since email property is not available
			avatar: rootData.user.image ? `/resources/images?objectKey=${rootData.user.image.objectKey}` : '/avatars/user.jpg',
		} : {
			name: 'Guest',
			email: '',
			avatar: '/avatars/user.jpg',
		},
		navMain: [
			{
				title: 'Dashboard',
				url: `/app/${rootData?.userOrganizations?.currentOrganization?.organization.slug}`,
				isActive: location.pathname === `/app/${rootData?.userOrganizations?.currentOrganization?.organization.slug}`,
			},
			{
				title: 'Notes',
				url: `/app/${rootData?.userOrganizations?.currentOrganization?.organization.slug}/notes`,
				isActive: location.pathname.includes(`/app/${rootData?.userOrganizations?.currentOrganization?.organization.slug}/notes`),
			},
			{
				title: 'Settings',
				url: `/app/${rootData?.userOrganizations?.currentOrganization?.organization.slug}/settings`,
				isActive: location.pathname.includes(`/app/${rootData?.userOrganizations?.currentOrganization?.organization.slug}/settings`),
			},
		],
		navClouds: [
			{
				title: 'Capture',
				isActive: location.pathname.includes('/capture'),
				url: '#',
				items: [
					{
						title: 'Active Proposals',
						url: '#',
					},
					{
						title: 'Archived',
						url: '#',
					},
				],
			},
			{
				title: 'Proposal',
				url: '#',
				isActive: location.pathname.includes('/proposal'),
				items: [
					{
						title: 'Active Proposals',
						url: '#',
					},
					{
						title: 'Archived',
						url: '#',
					},
				],
			},
			{
				title: 'Prompts',
				url: '#',
				isActive: location.pathname.includes('/prompts'),
				items: [
					{
						title: 'Active Proposals',
						url: '#',
					},
					{
						title: 'Archived',
						url: '#',
					},
				],
			},
		],
		navSecondary: [
			{
				title: 'Settings',
				url: `/app/${rootData?.userOrganizations?.currentOrganization?.organization.slug}/settings`,
				isActive: location.pathname.includes(`/app/${rootData?.userOrganizations?.currentOrganization?.organization.slug}/settings`),
			},
			{
				title: 'Get Help',
				url: '#',
				isActive: location.pathname.includes('/help'),
			},
			{
				title: 'Search',
				url: '#',
				isActive: location.pathname.includes('/search'),
			},
		],
		documents: [
			{
				name: 'Data Library',
				url: '#',
				isActive: location.pathname.includes('/data-library'),
			},
			{
				name: 'Reports',
				url: '#',
				isActive: location.pathname.includes('/reports'),
			},
			{
				name: 'Word Assistant',
				url: '#',
				isActive: location.pathname.includes('/word-assistant'),
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
				{/* <NavDocuments items={data.documents} /> */}
				{/* <NavSecondary items={data.navSecondary} className="mt-auto" /> */}
			</SidebarContent>
			<SidebarFooter>
				<NavUser user={data.user} />
			</SidebarFooter>
		</Sidebar>
	)
}