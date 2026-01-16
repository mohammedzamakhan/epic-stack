import { auditService, AuditAction } from '@repo/audit'
import { getUserId } from '#app/utils/auth.server.ts'

export async function auditSensitiveRoutes(
	request: Request,
	response?: Response,
) {
	try {
		const url = new URL(request.url)
		const pathname = url.pathname

		// In admin app, almost everything is sensitive, but we can target specific areas
		const sensitiveRoutes = [
			{
				pattern: /^\/users\/.*\/impersonate/,
				details: 'Accessed user impersonation',
			},
			{
				pattern: /^\/users\/.*\/ban/,
				details: 'Accessed user ban page',
			},
			{
				pattern: /^\/organizations\/.*\/sso/,
				details: 'Accessed SSO configuration',
			},
			{
				pattern: /^\/feature-flags/,
				details: 'Accessed feature flags',
			},
			{
				pattern: /^\/audit-logs/,
				details: 'Accessed audit logs',
			},
		]

		const match = sensitiveRoutes.find((r) => r.pattern.test(pathname))
		if (!match) return

		// Get user
		const userId = await getUserId(request)
		if (!userId) return

		// Log it
		auditService
			.log({
				action: AuditAction.SENSITIVE_ROUTE_ACCESSED,
				userId,
				details: `Admin: ${match.details}`,
				request,
				metadata: {
					path: pathname,
					method: request.method,
					statusCode: response?.status,
					userAgent: request.headers.get('user-agent'),
				},
				severity: 'warning', // Admin actions are more sensitive
			})
			.catch((error) => {
				console.error('Failed to log admin sensitive route access:', error)
			})
	} catch (error) {
		console.error('Error in admin audit middleware:', error)
	}
}
