import {
	IconCamera,
	IconChartBar,
	IconDashboard,
	IconDatabase,
	IconFileAi,
	IconFileDescription,
	IconFileWord,
	IconFolder,
	IconHelp,
	IconListDetails,
	IconReport,
	IconSearch,
	IconSettings,
	IconUsers,
} from '@tabler/icons-react'
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
		user: {
			name: 'shadcn',
			email: 'm@example.com',
			avatar: '/avatars/shadcn.jpg',
		},
		navMain: [
			{
				title: 'Dashboard',
				url: `/app/${rootData?.userOrganizations?.currentOrganization?.organization.slug}`,
				icon: IconDashboard,
			},
			{
				title: 'Lifecycle',
				url: '#',
				icon: IconListDetails,
			},
			{
				title: 'Analytics',
				url: '#',
				icon: IconChartBar,
			},
			{
				title: 'Projects',
				url: '#',
				icon: IconFolder,
			},
			{
				title: 'Team',
				url: '#',
				icon: IconUsers,
			},
		],
		navClouds: [
			{
				title: 'Capture',
				icon: IconCamera,
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
				icon: IconFileDescription,
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
				icon: IconFileAi,
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
				icon: IconSettings,
			},
			{
				title: 'Get Help',
				url: '#',
				icon: IconHelp,
			},
			{
				title: 'Search',
				url: '#',
				icon: IconSearch,
			},
		],
		documents: [
			{
				name: 'Data Library',
				url: '#',
				icon: IconDatabase,
			},
			{
				name: 'Reports',
				url: '#',
				icon: IconReport,
			},
			{
				name: 'Word Assistant',
				url: '#',
				icon: IconFileWord,
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
				<NavDocuments items={data.documents} />
				<NavSecondary items={data.navSecondary} className="mt-auto" />
			</SidebarContent>
			<SidebarFooter>
				<NavUser user={data.user} />
			</SidebarFooter>
		</Sidebar>
	)
}