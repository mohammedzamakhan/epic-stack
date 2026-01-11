import { invariant } from '@epic-web/invariant'
import { type ActionFunctionArgs } from 'react-router'

export interface OnboardingHideDependencies {
	requireUserId: (request: Request) => Promise<string>
	checkUserOrganizationAccess: (
		userId: string,
		organizationId: string,
	) => Promise<unknown>
	hideOnboarding: (userId: string, organizationId: string) => Promise<void>
}

/**
 * Shared handler for hiding onboarding.
 * Used by both the admin and app applications.
 *
 * @param request - The incoming request
 * @param deps - Dependencies (auth, onboarding utilities)
 * @returns JSON response indicating success
 */
export async function handleOnboardingHide(
	{ request }: ActionFunctionArgs,
	deps: OnboardingHideDependencies,
) {
	const userId = await deps.requireUserId(request)
	const formData = await request.formData()

	// Get organizationId from URL or form data
	const url = new URL(request.url)
	let organizationId =
		formData.get('organizationId') || url.searchParams.get('organizationId')

	invariant(typeof organizationId === 'string', 'organizationId is required')

	const userOrg = await deps.checkUserOrganizationAccess(userId, organizationId)
	if (!userOrg) {
		return Response.json(
			{ error: 'Access denied: You do not have access to this organization' },
			{ status: 403 },
		)
	}

	try {
		await deps.hideOnboarding(userId, organizationId)

		return Response.json({ success: true })
	} catch (error) {
		console.error('Error hiding onboarding:', error)
		return Response.json(
			{ error: 'Failed to hide onboarding' },
			{ status: 500 },
		)
	}
}
