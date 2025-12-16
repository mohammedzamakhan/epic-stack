import { Trans, msg } from '@lingui/macro'
import { useLingui } from '@lingui/react'
import { type OnboardingProgressData } from '@repo/common/onboarding'
import { getCrossAppUrl } from '@repo/common/url'
import { Button } from '@repo/ui/button'
import { Card, CardContent, CardDescription, CardHeader } from '@repo/ui/card'
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarHeader,
} from '@repo/ui/sidebar'
import { UserIcon } from '@repo/ui/user-icon'
import { MessageSquareMoreIcon } from '@repo/ui/message-square-more'
import { HomeIcon } from '@repo/ui/home-icon'
import { BuildingIcon } from '@repo/ui/building-icon'
import { SettingsGearIcon } from '@repo/ui/settings-gear-icon'
import { motion } from 'motion/react'
import React, { useEffect, useState } from 'react'
import { useLocation, useRouteLoaderData, Link } from 'react-router'
import { BellIcon } from '#app/components/icons/bell-icon.tsx'
import { FoldersIcon } from '#app/components/icons/folders-icon.tsx'
import { LockOpenIcon } from '#app/components/icons/lock-open-icon.tsx'
import { NavMain } from '#app/components/nav-main.tsx'
import { NavUser } from '#app/components/nav-user.tsx'
import { OnboardingChecklist } from '#app/components/onboarding-checklist.tsx'
import { TeamSwitcher } from '#app/components/team-switcher.tsx'

import { type loader as rootLoader } from '#app/root.tsx'
import FeedbackModal from './core/feedback-modal'
import FavoriteNotes from './favorite-notes'
import { FeatureUpdates } from './feature-updates'
import { ArrowLeftIcon } from './icons/arrow-left-icon'
import { CircleHelpIcon } from './icons/circle-help'
import { ExternalLinkIcon } from './icons/external-link-icon'
import { Logo } from './icons/logo'
import { McpIcon } from './icons/mcp-icon'
import { UserRoundPlusIcon } from './icons/user-round-plus'
import { NavSecondary } from './nav-secondary'

// Upgrade Account Card Component
function UpgradeAccountCard({
	trialStatus,
	orgSlug,
	launchStatus,
}: {
	trialStatus: { isActive: boolean; daysRemaining: number }
	orgSlug: string
	launchStatus?: string
}) {
	if (!trialStatus.isActive || trialStatus.daysRemaining < 0) return null
	// Hide upgrade card for PUBLIC_BETA and CLOSED_BETA
	if (launchStatus === 'PUBLIC_BETA' || launchStatus === 'CLOSED_BETA')
		return null

	return (
		<Card className="bg-sidebar-accent dark:bg-sidebar-accent border-sidebar-border mx-2 mb-4 gap-1 border p-2 group-data-[collapsible=icon]:hidden">
			<CardHeader className="p-2">
				<CardDescription className="text-sidebar-foreground">
					<Trans>
						There are{' '}
						<span className="font-bold text-red-400">
							{trialStatus.daysRemaining} days
						</span>{' '}
						left in your trial. Get in touch with questions or feedback.
					</Trans>
				</CardDescription>
			</CardHeader>
			<CardContent className="-mt-4 flex flex-col gap-1 border-0 bg-transparent p-2 pb-0 shadow-none ring-0">
				<Button
					variant="secondary"
					size="sm"
					className="bg-sidebar-foreground text-sidebar hover:bg-sidebar-foreground/70 w-full"
				>
					<Link to={`/${orgSlug}/settings/billing`}>
						<Trans>Upgrade</Trans>
					</Link>
				</Button>
				<Button
					variant="link"
					size="sm"
					className="text-sidebar-foreground hover:text-sidebar-foreground/80 w-full"
				>
					<Trans>Get in touch</Trans>
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
	const { _ } = useLingui()
	const isProfileRoute = location.pathname === '/profile'
	const isSecurityRoute = location.pathname === '/security'
	const isNotificationsRoute = location.pathname === '/notifications'
	const isOrganizationsRoute = location.pathname === '/organizations'

	const navMain = [
		{
			title: _(msg`Dashboard`),
			url: orgSlug ? `/${orgSlug}` : '/organizations',
			isActive: false,
			icon: ArrowLeftIcon,
		},
		{
			title: _(msg`Profile`),
			url: '/profile',
			isActive: isProfileRoute,
			icon: UserIcon,
		},
		{
			title: _(msg`Security`),
			url: '/security',
			isActive: isSecurityRoute,
			icon: LockOpenIcon,
		},
		{
			title: _(msg`Notifications`),
			url: '/notifications',
			isActive: isNotificationsRoute,
			icon: BellIcon,
		},
		{
			title: _(msg`Organizations`),
			url: '/organizations',
			isActive: isOrganizationsRoute,
			icon: BuildingIcon,
		},
	]

	const navSecondary = [
		{
			title: _(msg`Get help`),
			url: '#',
			icon: CircleHelpIcon,
		},
		{
			title: _(msg`Give feedback`),
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
	extensionId,
}: {
	user: any
	location: any
	onboardingProgress: OnboardingProgressData | null | undefined
	orgSlug: string | undefined
	organizationId: string | undefined
	favoriteNotes: any
	setHasVisibleFeatureUpdates: (value: boolean) => void
	trialStatus?: { isActive: boolean; daysRemaining: number }
	rootData: any
	onFeedbackClick: () => void
	extensionId?: string
}) {
	const { _ } = useLingui()
	const [isExtensionInstalled, setIsExtensionInstalled] = useState(false)
	const [helpUrl, setHelpUrl] = useState('https://docs.epic-stack.me:2999')

	useEffect(() => {
		setHelpUrl(getCrossAppUrl('docs', '', 'https://docs.epic-stack.me:2999'))
	}, [])

	useEffect(() => {
		if (!extensionId) return

		// Type assertion for Chrome extension API
		const chromeWindow = window as any
		if (chromeWindow?.chrome?.runtime?.sendMessage) {
			try {
				chromeWindow.chrome.runtime.sendMessage(
					extensionId,
					{ type: 'PING' },
					() => {
						if (chromeWindow.chrome?.runtime?.lastError) {
							setIsExtensionInstalled(false)
						} else {
							setIsExtensionInstalled(true)
						}
					},
				)
			} catch {
				setIsExtensionInstalled(false)
			}
		}
	}, [extensionId])
	const navMain = [
		{
			title: _(msg`Dashboard`),
			url: `/${orgSlug}`,
			isActive: location.pathname === `/${orgSlug}`,
			icon: HomeIcon,
		},
		{
			title: _(msg`Notes`),
			url: `/${orgSlug}/notes`,
			isActive: location.pathname.includes(`/${orgSlug}/notes`),
			icon: FoldersIcon,
		},
		{
			title: _(msg`MCP Server`),
			url: `/${orgSlug}/mcp`,
			isActive: location.pathname.includes(`/${orgSlug}/mcp`),
			icon: McpIcon,
		},
		{
			title: _(msg`Settings`),
			url: `/${orgSlug}/settings`,
			isActive: location.pathname.includes(`/${orgSlug}/settings`),
			icon: SettingsGearIcon,
			items: [
				{
					title: _(msg`General`),
					url: `/${orgSlug}/settings`,
					isActive: location.pathname === `/${orgSlug}/settings`,
				},
				{
					title: _(msg`Members`),
					url: `/${orgSlug}/settings/members`,
					isActive: location.pathname === `/${orgSlug}/settings/members`,
				},
				{
					title: _(msg`Integrations`),
					url: `/${orgSlug}/settings/integrations`,
					isActive: location.pathname === `/${orgSlug}/settings/integrations`,
				},
				// Hide billing for PUBLIC_BETA and CLOSED_BETA
				...(rootData?.launchStatus !== 'PUBLIC_BETA' &&
				rootData?.launchStatus !== 'CLOSED_BETA'
					? [
							{
								title: _(msg`Billing`),
								url: `/${orgSlug}/settings/billing`,
								isActive: location.pathname === `/${orgSlug}/settings/billing`,
							},
						]
					: []),
			],
		},
	]

	const navSecondary = [
		...(!isExtensionInstalled &&
		extensionId &&
		extensionId !== 'your-extension-id'
			? [
					{
						title: _(msg`Get chrome extension`),
						url: `https://chrome.google.com/webstore/detail/${extensionId}`,
						icon: ExternalLinkIcon,
						target: '_blank',
					},
				]
			: []),
		{
			title: _(msg`Add members`),
			url: `/${orgSlug}/settings/members`,
			icon: UserRoundPlusIcon,
		},
		{
			title: _(msg`Get help`),
			url: helpUrl,
			icon: CircleHelpIcon,
			target: '_blank',
		},
		{
			title: _(msg`Give feedback`),
			icon: MessageSquareMoreIcon,
			onClick: onFeedbackClick,
		},
	]

	return (
		<>
			<SidebarHeader className="px-2 pt-2 pb-0">
				<Link to="/">
					<Logo className="text-md m-1 mx-2" />
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
						<Link to={`/${orgSlug}`}>
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
						<UpgradeAccountCard
							trialStatus={trialStatus}
							orgSlug={orgSlug}
							launchStatus={rootData?.launchStatus}
						/>
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
	extensionId,
	...props
}: React.ComponentProps<typeof Sidebar> & {
	onboardingProgress?: OnboardingProgressData | null
	trialStatus?: { isActive: boolean; daysRemaining: number }
	extensionId?: string
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
	const isProfileRoute = location.pathname === '/profile'
	const isSecurityRoute = location.pathname === '/security'
	const isNotificationsRoute = location.pathname === '/notifications'
	const isOrganizationsRoute = location.pathname === '/organizations'
	const isAccountRoute =
		isProfileRoute ||
		isSecurityRoute ||
		isNotificationsRoute ||
		isOrganizationsRoute

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
		<Sidebar collapsible="icon" {...props} className="overflow-hidden">
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
						extensionId={extensionId}
					/>
				</motion.div>
			</div>
		</Sidebar>
	)
}
