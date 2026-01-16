import { auditService, AuditAction } from '@repo/audit'
import { getUserId } from '#app/utils/auth.server.ts'

export async function auditSensitiveRoutes(
	request: Request,
	response?: Response,
) {
	try {
		const url = new URL(request.url)
		const pathname = url.pathname

		// Define sensitive routes patterns and their corresponding audit actions
		const sensitiveRoutes = [
			{
				pattern: /^\/settings\/billing/,
				details: 'Accessed billing settings',
			},
			{
				pattern: /^\/settings\/api-keys/,
				details: 'Accessed API keys settings',
			},
			{
				pattern: /^\/admin/,
				details: 'Accessed admin area',
			},
			{
				pattern: /^\/org\/.*\/settings/,
				details: 'Accessed organization settings',
			},
		]

		const match = sensitiveRoutes.find((r) => r.pattern.test(pathname))
		if (!match) return

		// Get user (only log authenticated access)
		const userId = await getUserId(request)
		if (!userId) return

		// Log it (fire and forget)
		auditService
			.log({
				action: AuditAction.SENSITIVE_ROUTE_ACCESSED,
				userId,
				details: match.details,
				request,
				metadata: {
					path: pathname,
					method: request.method,
					statusCode: response?.status,
					userAgent: request.headers.get('user-agent'),
				},
				severity: 'info',
			})
			.catch((error) => {
				console.error('Failed to log sensitive route access:', error)
			})
	} catch (error) {
		// Fail safe - don't crash the request if audit fails
		console.error('Error in audit middleware:', error)
	}
}
