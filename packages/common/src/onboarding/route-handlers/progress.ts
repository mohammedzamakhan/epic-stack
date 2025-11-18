import { invariant } from '@epic-web/invariant'
import { type LoaderFunctionArgs } from 'react-router'

export interface OnboardingProgressDependencies {
	requireUserId: (request: Request) => Promise<string>
	getOnboardingProgress: (
		userId: string,
		organizationId: string,
	) => Promise<any>
	autoDetectCompletedSteps: (
		userId: string,
		organizationId: string,
	) => Promise<void>
}

/**
 * Shared handler for getting onboarding progress.
 * Used by both the admin and app applications.
 *
 * @param request - The incoming request
 * @param deps - Dependencies (auth, onboarding utilities)
 * @returns JSON response with onboarding progress
 */
export async function handleOnboardingProgress(
	{ request }: LoaderFunctionArgs,
	deps: OnboardingProgressDependencies,
) {
	const userId = await deps.requireUserId(request)
	const url = new URL(request.url)
	const organizationId = url.searchParams.get('organizationId')

	invariant(typeof organizationId === 'string', 'organizationId is required')

	try {
		// Auto-detect completed steps first
		await deps.autoDetectCompletedSteps(userId, organizationId)

		// Get current progress
		const progress = await deps.getOnboardingProgress(userId, organizationId)

		return Response.json({ progress })
	} catch (error) {
		console.error('Error fetching onboarding progress:', error)
		return Response.json(
			{ error: 'Failed to fetch onboarding progress' },
			{ status: 500 },
		)
	}
}
