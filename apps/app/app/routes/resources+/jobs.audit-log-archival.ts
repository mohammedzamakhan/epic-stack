import { auditRetentionManager } from '@repo/audit'
import { requireInternalCommandAuth } from '#app/utils/internal-command-auth.server.ts'
import { type Route } from './+types/jobs.audit-log-archival.ts'

export async function action({ request }: Route.ActionArgs) {
	if (request.method !== 'POST') {
		return new Response('Method Not Allowed', { status: 405 })
	}

	await requireInternalCommandAuth(request)

	const { archived, deleted } = await auditRetentionManager.archiveOldLogs()

	return Response.json({
		success: true,
		archived,
		deleted,
		timestamp: new Date().toISOString(),
	})
}
