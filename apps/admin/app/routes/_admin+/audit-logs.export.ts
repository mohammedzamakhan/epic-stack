import { type Route } from './+types/audit-logs.export.ts'
import { auditService, AuditAction } from '#app/utils/audit.server.ts'
import { requireUserWithRole } from '#app/utils/permissions.server.ts'

/**
 * Export audit logs as CSV or JSON
 * GET /audit-logs/export?format=csv&organizationId=xxx&startDate=xxx&endDate=xxx
 */
export async function loader({ request }: Route.LoaderArgs) {
	await requireUserWithRole(request, 'admin')

	const url = new URL(request.url)
	const format = url.searchParams.get('format') || 'csv'
	const organizationId = url.searchParams.get('organizationId') || undefined
	const userId = url.searchParams.get('userId') || undefined
	const startDateStr = url.searchParams.get('startDate')
	const endDateStr = url.searchParams.get('endDate')
	const actionsStr = url.searchParams.get('actions')

	// Parse dates
	const startDate = startDateStr ? new Date(startDateStr) : undefined
	const endDate = endDateStr ? new Date(endDateStr) : undefined

	// Parse actions
	const actions = actionsStr
		? (actionsStr.split(',') as AuditAction[])
		: undefined

	const filters = {
		organizationId,
		userId,
		startDate,
		endDate,
		actions,
	}

	let content: string
	let contentType: string
	let filename: string

	if (format === 'json') {
		content = await auditService.exportJSON(filters)
		contentType = 'application/json'
		filename = `audit-logs-${new Date().toISOString().split('T')[0]}.json`
	} else {
		// Default to CSV
		content = await auditService.exportCSV(filters)
		contentType = 'text/csv'
		filename = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`
	}

	// Log the export action
	const adminUserId = await requireUserWithRole(request, 'admin').then(
		() => request.headers.get('x-user-id') || undefined,
	)
	await auditService.logAdminOperation(
		AuditAction.AUDIT_LOG_EXPORTED,
		adminUserId || 'system',
		`Audit logs exported in ${format} format`,
		{
			format,
			organizationId,
			userId,
			startDate: startDate?.toISOString(),
			endDate: endDate?.toISOString(),
			actionsFilter: actions,
		},
		request,
	)

	return new Response(content, {
		headers: {
			'Content-Type': contentType,
			'Content-Disposition': `attachment; filename="${filename}"`,
			'Cache-Control': 'no-cache, no-store, must-revalidate',
		},
	})
}
