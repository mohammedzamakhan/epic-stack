import * as React from 'react'

import { useLocation, useRouteLoaderData, Link } from 'react-router'
import { FoldersIcon } from '#app/components/icons/folders-icon'
import { HomeIcon } from '#app/components/icons/home-icon'
import { SettingsGearIcon } from '#app/components/icons/settings-gear-icon'
import { NavMain } from '#app/components/nav-main'
import { NavUser } from '#app/components/nav-user'
import { TeamSwitcher } from '#app/components/team-switcher'
import { OnboardingChecklist } from '#app/components/onboarding-checklist'
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarHeader,
} from '#app/components/ui/sidebar'
import { type loader as rootLoader } from '#app/root.tsx'
import { type OnboardingProgressData } from '#app/utils/onboarding'
import { NavSecondary } from './nav-secondary'
import { CircleHelpIcon } from './icons/circle-help'
import { MessageSquareMoreIcon } from './icons/message-square-more'

export function AppSidebar({
	onboardingProgress,
	...props
}: React.ComponentProps<typeof Sidebar> & {
	onboardingProgress?: OnboardingProgressData | null
}) {
	const rootData = useRouteLoaderData<typeof rootLoader>('root')
	const location = useLocation()

	const orgSlug =
		rootData?.userOrganizations?.currentOrganization?.organization.slug
	const organizationId =
		rootData?.userOrganizations?.currentOrganization?.organization.id

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
		navSecondary: [
			{
				title: 'Get help',
				url: '#',
				icon: CircleHelpIcon,
			},
			{
				title: 'Give feedback',
				url: '#',
				icon: MessageSquareMoreIcon,
			},
		],
	}
	return (
		<Sidebar collapsible="offcanvas" {...props}>
			<SidebarHeader>
				<TeamSwitcher />
			</SidebarHeader>
			<SidebarContent>
				{/* Onboarding Checklist in Sidebar */}
				{onboardingProgress &&
					!onboardingProgress.isCompleted &&
					onboardingProgress.isVisible &&
					orgSlug &&
					organizationId && (
						<Link to={`/app/${orgSlug}`}>
							<OnboardingChecklist
								progress={onboardingProgress}
								orgSlug={orgSlug}
								organizationId={organizationId}
								variant="sidebar"
							/>
						</Link>
					)}
				<NavMain items={data.navMain} />
				<NavSecondary items={data.navSecondary} className="mt-auto" />
			</SidebarContent>
			<SidebarFooter>
				<NavUser user={data.user} />
			</SidebarFooter>
		</Sidebar>
	)
}
