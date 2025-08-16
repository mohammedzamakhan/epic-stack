import { motion } from 'motion/react'
import * as React from 'react'

import { useLocation, useRouteLoaderData, Link } from 'react-router'
import { FoldersIcon } from '#app/components/icons/folders-icon'
import { HomeIcon } from '#app/components/icons/home-icon'
import { LockOpenIcon } from '#app/components/icons/lock-open-icon.tsx'
import { SettingsGearIcon } from '#app/components/icons/settings-gear-icon'
import { UserIcon } from '#app/components/icons/user-icon'
import { NavMain } from '#app/components/nav-main'
import { NavUser } from '#app/components/nav-user'
import { OnboardingChecklist } from '#app/components/onboarding-checklist'
import { TeamSwitcher } from '#app/components/team-switcher'
import { Button } from '#app/components/ui/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
} from '#app/components/ui/card'
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarHeader,
} from '#app/components/ui/sidebar'
import { type loader as rootLoader } from '#app/root.tsx'
import { type OnboardingProgressData } from '#app/utils/onboarding'
import FeedbackModal from './core/feedback-modal'
import FavoriteNotes from './favorite-notes'
import { FeatureUpdates } from './feature-updates'
import { ArrowLeftIcon } from './icons/arrow-left-icon'
import { BuildingIcon } from './icons/building-icon'
import { CircleHelpIcon } from './icons/circle-help'
import { Logo } from './icons/logo'
import { McpIcon } from './icons/mcp-icon'
import { MessageSquareMoreIcon } from './icons/message-square-more'
import { UserRoundPlusIcon } from './icons/user-round-plus'
import { NavSecondary } from './nav-secondary'

// Upgrade Account Card Component
function UpgradeAccountCard({
	trialStatus,
	orgSlug,
}: {
	trialStatus: { isActive: boolean; daysRemaining: number }
	orgSlug: string
}) {
	if (!trialStatus.isActive || trialStatus.daysRemaining < 0) return null

	return (
		<Card className="bg-sidebar-accent border-sidebar-border mb-4 gap-1 p-2 shadow-md">
			<CardHeader className="p-2">
				<CardDescription className="text-sidebar-foreground">
					There are{' '}
					<span className="font-bold text-red-400">
						{trialStatus.daysRemaining} days
					</span>{' '}
					left in your trial. Get in touch with questions or feedback.
				</CardDescription>
			</CardHeader>
			<CardContent className="-mt-4 flex flex-col gap-1 p-2 pb-0">
				<Button
					variant="secondary"
					size="sm"
					className="bg-sidebar-foreground text-sidebar hover:bg-sidebar-foreground/70 w-full"
					asChild
				>
					<Link to={`/app/${orgSlug}/settings/billing`}>Upgrade</Link>
				</Button>
				<Button
					variant="link"
					size="sm"
					className="text-sidebar-foreground hover:text-sidebar-foreground/80 w-full"
				>
					Get in touch
				</Button>
			</CardContent>
		</Card>
	)
}

// Account Sidebar Component
function AccountSidebar({
	user,
	location,
	orgSlug,
	onFeedbackClick,
}: {
	user: any
	location: any
	orgSlug: string | undefined
	onFeedbackClick: () => void
}) {
	const isProfileRoute = location.pathname === '/app/profile'
	const isSecurityRoute = location.pathname === '/app/security'
	const isOrganizationsRoute = location.pathname === '/app/organizations'

	const navMain = [
		{
			title: 'Dashboard',
			url: orgSlug ? `/app/${orgSlug}` : '/app/organizations',
			isActive: false,
			icon: ArrowLeftIcon,
		},
		{
			title: 'Profile',
			url: '/app/profile',
			isActive: isProfileRoute,
			icon: UserIcon,
		},
		{
			title: 'Security',
			url: '/app/security',
			isActive: isSecurityRoute,
			icon: LockOpenIcon,
		},
		{
			title: 'Organizations',
			url: '/app/organizations',
			isActive: isOrganizationsRoute,
			icon: BuildingIcon,
		},
	]

	const navSecondary = [
		{
			title: 'Get help',
			url: '#',
			icon: CircleHelpIcon,
		},
		{
			title: 'Give feedback',
			icon: MessageSquareMoreIcon,
			onClick: onFeedbackClick,
		},
	]

	return (
		<>
			<SidebarContent>
				<NavMain items={navMain} />
				<div className="mt-auto">
					<NavSecondary items={navSecondary} />
				</div>
			</SidebarContent>
			<SidebarFooter>
				<NavUser user={user} />
			</SidebarFooter>
		</>
	)
}

// Organization Sidebar Component
function OrganizationSidebar({
	user,
	location,
	onboardingProgress,
	orgSlug,
	organizationId,
	favoriteNotes,
	setHasVisibleFeatureUpdates,
	trialStatus,
	rootData,
	onFeedbackClick,
}: {
	user: any
	location: any
	onboardingProgress: OnboardingProgressData | null
	orgSlug: string | undefined
	organizationId: string | undefined
	favoriteNotes: any
	setHasVisibleFeatureUpdates: (value: boolean) => void
	trialStatus?: { isActive: boolean; daysRemaining: number }
	rootData: any
	onFeedbackClick: () => void
}) {
	const navMain = [
		{
			title: 'Dashboard',
			url: `/app/${orgSlug}`,
			isActive: location.pathname === `/app/${orgSlug}`,
			icon: HomeIcon,
		},
		{
			title: 'Notes',
			url: `/app/${orgSlug}/notes`,
			isActive: location.pathname.includes(`/app/${orgSlug}/notes`),
			icon: FoldersIcon,
		},
		{
			title: 'MCP Server',
			url: `/app/${orgSlug}/mcp`,
			isActive: location.pathname.includes(`/app/${orgSlug}/mcp`),
			icon: McpIcon
		},
		{
			title: 'Settings',
			url: `/app/${orgSlug}/settings`,
			isActive: location.pathname.includes(`/app/${orgSlug}/settings`),
			icon: SettingsGearIcon,
			items: [
				{
					title: 'General',
					url: `/app/${orgSlug}/settings`,
					isActive: location.pathname === `/app/${orgSlug}/settings`,
				},
				{
					title: 'Members',
					url: `/app/${orgSlug}/settings/members`,
					isActive: location.pathname === `/app/${orgSlug}/settings/members`,
				},
				{
					title: 'Integrations',
					url: `/app/${orgSlug}/settings/integrations`,
					isActive:
						location.pathname === `/app/${orgSlug}/settings/integrations`,
				},
				{
					title: 'Billing',
					url: `/app/${orgSlug}/settings/billing`,
					isActive: location.pathname === `/app/${orgSlug}/settings/billing`,
				},
			],
		},
	]

	const navSecondary = [
		{
			title: 'Add members',
			url: `/app/${orgSlug}/settings/members`,
			icon: UserRoundPlusIcon,
		},
		{
			title: 'Get help',
			url: '#',
			icon: CircleHelpIcon,
		},
		{
			title: 'Give feedback',
			icon: MessageSquareMoreIcon,
			onClick: onFeedbackClick,
		},
	]

	return (
		<>
			<SidebarHeader className="p-2">
				<Link to="/">
					<Logo className="text-md mb-0" />
				</Link>
				<TeamSwitcher />
			</SidebarHeader>

			<SidebarContent>
				{/* Onboarding Checklist */}
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

				<NavMain items={navMain} />

				{/* Favorite Notes */}
				{favoriteNotes && orgSlug && (
					<FavoriteNotes favoriteNotes={favoriteNotes} orgSlug={orgSlug} />
				)}

				<div className="mt-auto">
					{/* Upgrade Account Card */}
					{trialStatus && orgSlug && (
						<UpgradeAccountCard trialStatus={trialStatus} orgSlug={orgSlug} />
					)}
					{/* Feature Updates */}
					{!trialStatus && (
						<FeatureUpdates onVisibilityChange={setHasVisibleFeatureUpdates} />
					)}
					{/* NavSecondary */}
					<NavSecondary items={navSecondary} />
				</div>
			</SidebarContent>

			<SidebarFooter>
				<NavUser
					user={user}
					userPreference={rootData?.requestInfo?.userPrefs?.theme}
				/>
			</SidebarFooter>
		</>
	)
}

export function AppSidebar({
	onboardingProgress,
	trialStatus,
	...props
}: React.ComponentProps<typeof Sidebar> & {
	onboardingProgress?: OnboardingProgressData | null
	trialStatus?: { isActive: boolean; daysRemaining: number }
}) {
	const rootData = useRouteLoaderData<typeof rootLoader>('root')
	const location = useLocation()
	const [, setHasVisibleFeatureUpdates] = React.useState(true)
	const [isFeedbackModalOpen, setIsFeedbackModalOpen] = React.useState(false)

	const orgSlug =
		rootData?.userOrganizations?.currentOrganization?.organization.slug
	const organizationId =
		rootData?.userOrganizations?.currentOrganization?.organization.id

	// Check if we're on profile or organizations routes
	const isProfileRoute = location.pathname === '/app/profile'
	const isSecurityRoute = location.pathname === '/app/security'
	const isOrganizationsRoute = location.pathname === '/app/organizations'
	const isAccountRoute =
		isProfileRoute || isSecurityRoute || isOrganizationsRoute

	const userData = rootData?.user
		? {
			name: rootData.user.name || rootData.user.username || 'User',
			email: rootData.user.username,
			avatar: rootData.user.image
				? `/resources/images?objectKey=${rootData.user.image.objectKey}`
				: '/avatars/user.jpg',
			roles: rootData.user.roles,
		}
		: {
			name: 'Guest',
			email: '',
			avatar: '/avatars/user.jpg',
			roles: [],
		}

	return (
		<Sidebar collapsible="offcanvas" {...props} className="overflow-hidden">
			<FeedbackModal
				isOpen={isFeedbackModalOpen}
				onOpenChange={setIsFeedbackModalOpen}
			/>
			<div className="relative h-full">
				{/* Account Sidebar */}
				<motion.div
					initial={{
						x: isAccountRoute ? 0 : -300,
						opacity: isAccountRoute ? 1 : 0,
					}}
					animate={{
						x: isAccountRoute ? 0 : -300,
						opacity: isAccountRoute ? 1 : 0,
					}}
					transition={{
						duration: 0.4,
						ease: [0.4, 0, 0.2, 1],
						opacity: { duration: 0.3 },
					}}
					className="absolute inset-0 flex h-full flex-col"
					style={{ pointerEvents: isAccountRoute ? 'auto' : 'none' }}
				>
					<AccountSidebar
						user={userData}
						location={location}
						orgSlug={orgSlug}
						onFeedbackClick={() => setIsFeedbackModalOpen(true)}
					/>
				</motion.div>

				{/* Organization Sidebar */}
				<motion.div
					initial={{
						x: !isAccountRoute ? 0 : 300,
						opacity: !isAccountRoute ? 1 : 0,
					}}
					animate={{
						x: !isAccountRoute ? 0 : 300,
						opacity: !isAccountRoute ? 1 : 0,
					}}
					transition={{
						duration: 0.4,
						ease: [0.4, 0, 0.2, 1],
						opacity: { duration: 0.3 },
					}}
					className="absolute inset-0 flex h-full flex-col"
					style={{ pointerEvents: !isAccountRoute ? 'auto' : 'none' }}
				>
					<OrganizationSidebar
						user={userData}
						location={location}
						onboardingProgress={onboardingProgress}
						orgSlug={orgSlug}
						organizationId={organizationId}
						favoriteNotes={rootData?.favoriteNotes}
						setHasVisibleFeatureUpdates={setHasVisibleFeatureUpdates}
						trialStatus={trialStatus}
						rootData={rootData}
						onFeedbackClick={() => setIsFeedbackModalOpen(true)}
					/>
				</motion.div>
			</div>
		</Sidebar>
	)
}
