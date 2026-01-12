import { type OnboardingProgressData } from '@repo/common/onboarding'
import { SidebarInset, SidebarProvider } from '@repo/ui/sidebar'
import { type ReactNode } from 'react'
import { AppSidebar } from '#app/components/app-sidebar.tsx'
import { SiteHeader } from '#app/components/site-header.tsx'
import { EpicProgress } from './progress-bar'

type MarketingLayoutProps = {
	children: ReactNode
	isCollapsed?: boolean
	onboardingProgress?: OnboardingProgressData | null
	trialStatus?: { isActive: boolean; daysRemaining: number } | null
	extensionId?: string | null
}

export function MarketingLayout({
	children,
	isCollapsed = false,
	onboardingProgress,
	trialStatus = null,
	extensionId = null,
}: MarketingLayoutProps) {
	return (
		<>
			<SidebarProvider
				open={!isCollapsed}
				style={
					{
						'--sidebar-width': 'calc(var(--spacing) * 60)',
						'--header-height': 'calc(var(--spacing) * 12)',
					} as React.CSSProperties
				}
			>
				<AppSidebar
					variant="inset"
					onboardingProgress={onboardingProgress}
					trialStatus={trialStatus || undefined}
					extensionId={extensionId || undefined}
				/>
				<SidebarInset>
					<SiteHeader isCollapsed={isCollapsed} />
					<div className="flex flex-1 flex-col">
						<div className="@container/main flex flex-1 flex-col gap-2 px-4 md:px-2">
							{children}
						</div>
					</div>
				</SidebarInset>
			</SidebarProvider>
			<EpicProgress />
		</>
	)
}

// Export these hooks to be used in the layout
export { useNonce } from '#app/utils/nonce-provider.ts'
export { useOptionalTheme } from '#app/routes/resources+/theme-switch.tsx'
