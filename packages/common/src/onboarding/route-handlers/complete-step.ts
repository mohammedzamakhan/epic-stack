import { invariant } from '@epic-web/invariant'
import { type ActionFunctionArgs } from 'react-router'

export interface OnboardingCompleteStepDependencies {
	requireUserId: (request: Request) => Promise<string>
	markStepCompleted: (
		userId: string,
		organizationId: string,
		stepKey: string,
		options: { completedVia: string },
	) => Promise<void>
}

/**
 * Shared handler for marking an onboarding step as completed.
 * Used by both the admin and app applications.
 *
 * @param request - The incoming request
 * @param deps - Dependencies (auth, onboarding utilities)
 * @returns JSON response indicating success
 */
export async function handleOnboardingCompleteStep(
	{ request }: ActionFunctionArgs,
	deps: OnboardingCompleteStepDependencies,
) {
	const userId = await deps.requireUserId(request)
	const formData = await request.formData()
	const stepKey = formData.get('stepKey')

	// Get organizationId from URL or form data
	const url = new URL(request.url)
	let organizationId =
		formData.get('organizationId') || url.searchParams.get('organizationId')

	invariant(typeof stepKey === 'string', 'stepKey is required')
	invariant(typeof organizationId === 'string', 'organizationId is required')

	try {
		await deps.markStepCompleted(userId, organizationId, stepKey, {
			completedVia: 'manual',
		})

		return Response.json({ success: true })
	} catch (error) {
		console.error('Error completing onboarding step:', error)
		return Response.json({ error: 'Failed to complete step' }, { status: 500 })
	}
}
