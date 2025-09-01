import { invariant } from '@epic-web/invariant'
import { type ActionFunctionArgs } from 'react-router'
import { requireUserId } from '#app/utils/auth.server'
import { markStepCompleted } from '#app/utils/onboarding'

export async function action({ request }: ActionFunctionArgs) {
	const userId = await requireUserId(request)
	const formData = await request.formData()
	const stepKey = formData.get('stepKey')

	// Get organizationId from URL or form data
	const url = new URL(request.url)
	let organizationId =
		formData.get('organizationId') || url.searchParams.get('organizationId')

	invariant(typeof stepKey === 'string', 'stepKey is required')
	invariant(typeof organizationId === 'string', 'organizationId is required')

	try {
		await markStepCompleted(userId, organizationId, stepKey, {
			completedVia: 'manual',
		})

		return Response.json({ success: true })
	} catch (error) {
		console.error('Error completing onboarding step:', error)
		return Response.json({ error: 'Failed to complete step' }, { status: 500 })
	}
}
