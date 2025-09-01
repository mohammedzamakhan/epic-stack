import { invariant } from '@epic-web/invariant'
import { type LoaderFunctionArgs } from 'react-router'
import { requireUserId } from '#app/utils/auth.server'
import {
	getOnboardingProgress,
	autoDetectCompletedSteps,
} from '#app/utils/onboarding'

export async function loader({ request }: LoaderFunctionArgs) {
	const userId = await requireUserId(request)
	const url = new URL(request.url)
	const organizationId = url.searchParams.get('organizationId')

	invariant(typeof organizationId === 'string', 'organizationId is required')

	try {
		// Auto-detect completed steps first
		await autoDetectCompletedSteps(userId, organizationId)

		// Get current progress
		const progress = await getOnboardingProgress(userId, organizationId)

		return Response.json({ progress })
	} catch (error) {
		console.error('Error fetching onboarding progress:', error)
		return Response.json(
			{ error: 'Failed to fetch onboarding progress' },
			{ status: 500 },
		)
	}
}
