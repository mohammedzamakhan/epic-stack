import { auditService, AuditAction } from '@repo/audit'
import { requireUserId } from '@repo/auth'
import {
	createExportRequest,
	generateUserDataExport,
} from '#app/utils/gdpr.server.ts'
import { type Route } from './+types/download-user-data.ts'

export async function loader({ request }: Route.LoaderArgs) {
	const userId = await requireUserId(request)

	const result = await createExportRequest(userId, request)

	if (!result.success || !result.requestId) {
		await auditService.log({
			action: AuditAction.DATA_EXPORT_FAILED,
			userId,
			details: result.error || 'Failed to create export request',
			request,
			severity: 'error',
		})

		return Response.json(
			{ error: result.error || 'Failed to create export request' },
			{ status: 400 },
		)
	}

	try {
		const exportData = await generateUserDataExport(
			userId,
			result.requestId,
			request,
		)

		const timestamp = new Date().toISOString().split('T')[0]
		const filename = `user-data-export-${timestamp}.json`

		return new Response(JSON.stringify(exportData, null, 2), {
			headers: {
				'Content-Type': 'application/json',
				'Content-Disposition': `attachment; filename="${filename}"`,
				'Cache-Control': 'no-store, no-cache, must-revalidate',
			},
		})
	} catch (error) {
		await auditService.log({
			action: AuditAction.DATA_EXPORT_FAILED,
			userId,
			details:
				error instanceof Error ? error.message : 'Failed to generate export',
			request,
			severity: 'error',
			metadata: {
				requestId: result.requestId,
			},
		})

		throw error
	}
}
