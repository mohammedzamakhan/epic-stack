import {
	createErasureRequest,
	cancelErasureRequest,
} from '#app/utils/gdpr.server.ts'
import { redirectWithToast } from '@repo/common/toast'

type PrivacyActionArgs = {
	request: Request
	userId: string
}

export async function requestDataDeletionAction({
	request,
	userId,
}: PrivacyActionArgs) {
	const result = await createErasureRequest(userId, request)

	if (!result.success) {
		return redirectWithToast('/security', {
			title: 'Account Deletion Request Failed',
			description: result.error!,
			type: 'error',
		})
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
