import { createAuditMiddleware } from '@repo/audit'
import { getUserId } from '@repo/auth'

const auditMiddleware = createAuditMiddleware({
	getUserId,
})

export async function auditSensitiveRoutes(
	request: Request,
	response?: Response,
) {
	return auditMiddleware(request, response)
}
