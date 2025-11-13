import { Outlet, useLoaderData } from 'react-router'
import { MarketingLayout } from '#app/components/marketing-layout.tsx'
import { requireUserId } from '#app/utils/auth.server.ts'
import {
	getOnboardingProgress,
	autoDetectCompletedSteps,
	type OnboardingProgressData,
} from '#app/utils/onboarding.ts'
import { getUserDefaultOrganization } from '#app/utils/organizations.server.ts'
import { getSidebarState } from '#app/utils/sidebar-cookie.server.ts'
import { getTrialStatus } from '#app/utils/payments.server.ts'

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
			try {
				await autoDetectCompletedSteps(userId, defaultOrg.organization.id)
			} catch (autoDetectError) {
				// Continue without auto-detection if there's an error
			}

			// Get current progress
			try {
				onboardingProgress = await getOnboardingProgress(
					userId,
					defaultOrg.organization.id,
				)
			} catch (onboardingError) {
				// Continue without onboarding progress if there's an error
				onboardingProgress = null
			}

			// Get trial status using environment variables
			try {
				trialStatus = await getTrialStatus(userId, defaultOrg.organization.slug)
			} catch (trialError) {
				// Continue without trial status if there's an error
			}
		}
	} catch (error) {
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
