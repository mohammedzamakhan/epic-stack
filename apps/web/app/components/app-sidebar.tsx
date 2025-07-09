
import * as React from 'react'

import { useRouteLoaderData } from 'react-router'
import { NavDocuments } from '#app/components/nav-documents'
import { NavMain } from '#app/components/nav-main'
import { NavSecondary } from '#app/components/nav-secondary'
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
	console.log('rootData', rootData)

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
			},
			{
				title: 'Notes',
				url: `/app/${rootData?.userOrganizations?.currentOrganization?.organization.slug}/notes`,
			},
			{
				title: 'Settings',
				url: `/app/${rootData?.userOrganizations?.currentOrganization?.organization.slug}/settings`,
			},
		],
		navClouds: [
			{
				title: 'Capture',
				isActive: true,
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
			},
			{
				title: 'Get Help',
				url: '#',
			},
			{
				title: 'Search',
				url: '#',
			},
		],
		documents: [
			{
				name: 'Data Library',
				url: '#',
			},
			{
				name: 'Reports',
				url: '#',
			},
			{
				name: 'Word Assistant',
				url: '#',
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