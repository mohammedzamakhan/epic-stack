import { type ReactNode } from 'react'
import { AppSidebar } from '#app/components/app-sidebar'
import { SiteHeader } from '#app/components/site-header'
import { SidebarInset, SidebarProvider } from '@repo/ui'
import { type OnboardingProgressData } from '#app/utils/onboarding'
import { EpicProgress } from './progress-bar'

type MarketingLayoutProps = {
	children: ReactNode
	isCollapsed?: boolean
	onboardingProgress?: OnboardingProgressData | null
	extensionId?: string | null
}

export function MarketingLayout({
	children,
	isCollapsed = false,
	onboardingProgress,
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
					trialStatus={{ isActive: true, daysRemaining: 7 }}
					extensionId={extensionId}
				/>
				<SidebarInset
					style={
						{
							'--sidebar-background': '15 23 42', // slate-900
							'--sidebar-foreground': '248 250 252', // slate-50
							'--sidebar-primary': '248 250 252', // slate-50Add commentMore actions
							'--sidebar-primary-foreground': '15 23 42', // slate-900
							'--sidebar-accent': '30 41 59', // slate-800
							'--sidebar-accent-foreground': '248 250 252', // slate-50
							'--sidebar-border': '51 65 85', // slate-600
							'--sidebar-ring': '148 163 184', // slate-400
						} as React.CSSProperties
					}
					className="dark:bg-muted/50"
				>
					<SiteHeader />
					<div className="flex flex-1 flex-col">
						<div className="dark:bg-muted/50 @container/main flex flex-1 flex-col gap-2 px-4 md:px-2">
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
