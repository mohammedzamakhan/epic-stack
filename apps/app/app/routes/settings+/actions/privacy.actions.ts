import {
	createErasureRequest,
	cancelErasureRequest,
} from '#app/utils/gdpr.server.ts'

type PrivacyActionArgs = {
	request: Request
	userId: string
	formData: FormData
}

export async function requestDataDeletionAction({
	request,
	userId,
}: PrivacyActionArgs) {
	const result = await createErasureRequest(userId, request)

	if (!result.success) {
		return Response.json(
			{
				status: 'error',
				error: result.error,
				scheduledFor: result.scheduledFor?.toISOString(),
			},
			{ status: 400 },
		)
	}

	return Response.json({
		status: 'success',
		requestId: result.requestId,
		scheduledFor: result.scheduledFor?.toISOString(),
	})
}

export async function cancelDataDeletionAction({
	request,
	userId,
}: PrivacyActionArgs) {
	const result = await cancelErasureRequest(userId, request)

	if (!result.success) {
		return Response.json(
			{
				status: 'error',
				error: result.error,
			},
			{ status: 400 },
		)
	}

	return Response.json({
		status: 'success',
		requestId: result.requestId,
	})
}
