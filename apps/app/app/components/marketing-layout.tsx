import { type OnboardingProgressData } from '@repo/common/onboarding'
import { SidebarInset, SidebarProvider } from '@repo/ui/sidebar'
import { type ReactNode } from 'react'
import { AppSidebar } from '#app/components/app-sidebar.tsx'
import { AIPanelProvider } from '#app/components/ai/ai-panel-context.tsx'
import { GlobalAIChat } from '#app/components/ai/global-ai-panel.tsx'
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
		<AIPanelProvider>
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
				{/* Main column: the inset (sidebar + header + page content). */}
				<SidebarInset role="main" className="min-w-0">
					<SiteHeader isCollapsed={isCollapsed} />
					<div className="@container/main flex flex-1 flex-col gap-2 px-4 md:px-2">
						{children}
					</div>
				</SidebarInset>
				{/* AI panel — sibling of the inset, pinned to the right edge of
				    the viewport. Animates its own width; never wraps the main
				    content. */}
				<GlobalAIChat />
			</SidebarProvider>
			<EpicProgress />
		</AIPanelProvider>
	)
}

// Export these hooks to be used in the layout
export { useNonce } from '@repo/common'
export { useOptionalTheme } from '#app/routes/resources+/theme-switch.tsx'
