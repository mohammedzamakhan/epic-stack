import { Outlet, useLoaderData } from 'react-router'
import { MarketingLayout } from '#app/components/marketing-layout'
import { requireUserId } from '#app/utils/auth.server'
import {
	getOnboardingProgress,
	autoDetectCompletedSteps,
	type OnboardingProgressData,
} from '#app/utils/onboarding'
import { getUserDefaultOrganization } from '#app/utils/organizations.server'
import { getSidebarState } from '#app/utils/sidebar-cookie.server'

export async function loader({ request }: { request: Request }) {
	const isCollapsed = await getSidebarState(request)
	const userId = await requireUserId(request)

	let onboardingProgress = null
	try {
		// Get user's default organization
		const defaultOrg = await getUserDefaultOrganization(userId)

		if (defaultOrg?.organization?.id) {
			// Auto-detect completed steps first
			await autoDetectCompletedSteps(userId, defaultOrg.organization.id)

			// Get current progress
			onboardingProgress = await getOnboardingProgress(
				userId,
				defaultOrg.organization.id,
			)
		}
	} catch (error) {
		console.error('Error fetching onboarding progress in app layout:', error)
		// Don't throw, just continue without onboarding progress
	}

	return { isCollapsed, onboardingProgress }
}

export default function MarketingLayoutRoute() {
	const { isCollapsed, onboardingProgress } = useLoaderData<{
		isCollapsed: boolean
		onboardingProgress: OnboardingProgressData | null
	}>()

	return (
		<MarketingLayout
			isCollapsed={isCollapsed}
			onboardingProgress={onboardingProgress}
		>
			<Outlet />
		</MarketingLayout>
	)
}
