import { invariant } from '@epic-web/invariant'
import { type ActionFunctionArgs } from 'react-router'
import { requireUserId } from '#app/utils/auth.server'
import { hideOnboarding } from '#app/utils/onboarding'

export async function action({ request }: ActionFunctionArgs) {
	const userId = await requireUserId(request)
	const formData = await request.formData()

	// Get organizationId from URL or form data
	const url = new URL(request.url)
	let organizationId =
		formData.get('organizationId') || url.searchParams.get('organizationId')

	invariant(typeof organizationId === 'string', 'organizationId is required')

	try {
		await hideOnboarding(userId, organizationId)

		return Response.json({ success: true })
	} catch (error) {
		console.error('Error hiding onboarding:', error)
		return Response.json(
			{ error: 'Failed to hide onboarding' },
			{ status: 500 },
		)
	}
}
