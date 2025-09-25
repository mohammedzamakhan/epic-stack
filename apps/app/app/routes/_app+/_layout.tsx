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
import { getTrialStatus } from '#app/utils/payments.server'

export async function loader({ request }: { request: Request }) {
	const isCollapsed = await getSidebarState(request)
	const userId = await requireUserId(request)

	let onboardingProgress = null
	let trialStatus = null
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

			// Get trial status using environment variables
			try {
				trialStatus = await getTrialStatus(userId, defaultOrg.organization.slug)
			} catch (trialError) {
				console.error('Error fetching trial status:', trialError)
				// Continue without trial status if there's an error
			}
		}
	} catch (error) {
		console.error('Error fetching onboarding progress in app layout:', error)
		// Don't throw, just continue without onboarding progress
	}

	return {
		isCollapsed,
		onboardingProgress,
		trialStatus,
		extensionId: process.env.EXTENSION_ID,
	}
}

export default function MarketingLayoutRoute() {
	const { isCollapsed, onboardingProgress, trialStatus, extensionId } =
		useLoaderData<{
			isCollapsed: boolean
			onboardingProgress: OnboardingProgressData | null
			trialStatus: { isActive: boolean; daysRemaining: number } | null
			extensionId: string | null
		}>()

	return (
		<MarketingLayout
			isCollapsed={isCollapsed}
			onboardingProgress={onboardingProgress}
			trialStatus={trialStatus}
			extensionId={extensionId}
		>
			<Outlet />
		</MarketingLayout>
	)
}
