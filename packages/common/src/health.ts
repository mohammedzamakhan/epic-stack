export interface HealthPayload {
	status: 'ok'
	timestamp: string
	service: string
	[key: string]: unknown
}

/**
 * Lightweight liveness response for uptime monitors and deploy smoke tests.
 * Deep checks (DB, self-reachability) live at `/resources/healthcheck` on App/Admin.
 */
export function createHealthResponse(
	service: string,
	extra?: Record<string, unknown>,
): Response {
	const body: HealthPayload = {
		status: 'ok',
		timestamp: new Date().toISOString(),
		service,
		...extra,
	}

	return Response.json(body, {
		status: 200,
		headers: {
			'Cache-Control': 'no-cache, no-store, must-revalidate',
			'Content-Type': 'application/json',
		},
	})
}
