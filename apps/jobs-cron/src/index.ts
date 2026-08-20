import { StorageMigrationWorkflow } from './storage-migration-workflow'

export interface Env {
	APP_BASE_URL: string
	INTERNAL_COMMAND_TOKEN: string
	STORAGE_MIGRATION_WORKFLOW: Workflow<{ migrationId: string }>
}

const JOB_ROUTES = {
	'0 2 * * *': '/resources/jobs/audit-log-archival',
	'0 3 * * *': '/resources/jobs/mcp-token-cleanup',
	'0 4 * * *': '/resources/jobs/gdpr-erasure',
} as const

async function safeCompareAsync(
	a: string | null | undefined,
	b: string | null | undefined,
): Promise<boolean> {
	if (!a || !b) return false

	const encoder = new TextEncoder()
	const hash = async (value: string) => {
		const digest = await crypto.subtle.digest('SHA-256', encoder.encode(value))
		return new Uint8Array(digest)
	}

	const hashA = await hash(a)
	const hashB = await hash(b)
	if (hashA.length !== hashB.length) return false

	let result = 0
	for (let i = 0; i < hashA.length; i++) {
		result |= hashA[i]! ^ hashB[i]!
	}
	return result === 0
}

async function requireInternalAuth(request: Request, env: Env) {
	const authHeader = request.headers.get('Authorization')
	const isAuthorized = await safeCompareAsync(
		authHeader,
		`Bearer ${env.INTERNAL_COMMAND_TOKEN}`,
	)
	if (!isAuthorized) {
		return new Response('Unauthorized', { status: 401 })
	}
	return null
}

async function invokeJob(env: Env, path: string) {
	const response = await fetch(
		`${env.APP_BASE_URL.replace(/\/$/, '')}${path}`,
		{
			method: 'POST',
			headers: {
				Authorization: `Bearer ${env.INTERNAL_COMMAND_TOKEN}`,
			},
		},
	)

	if (!response.ok) {
		const body = await response.text().catch(() => '')
		throw new Error(
			`Job ${path} failed: ${response.status} ${response.statusText}${body ? `\n${body}` : ''}`,
		)
	}

	return response.json()
}

export default {
	async fetch(request: Request, env: Env) {
		const url = new URL(request.url)

		if (
			url.pathname === '/workflows/storage-migration/start' &&
			request.method === 'POST'
		) {
			const unauthorized = await requireInternalAuth(request, env)
			if (unauthorized) return unauthorized

			const body = (await request.json()) as { migrationId?: string }
			if (!body.migrationId) {
				return Response.json(
					{ error: 'migrationId is required' },
					{ status: 400 },
				)
			}

			const instance = await env.STORAGE_MIGRATION_WORKFLOW.create({
				id: body.migrationId,
				params: { migrationId: body.migrationId },
			})

			return Response.json({ instanceId: instance.id })
		}

		return new Response('Not Found', { status: 404 })
	},

	async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
		const path = JOB_ROUTES[event.cron as keyof typeof JOB_ROUTES]
		if (!path) {
			console.error('Unknown cron schedule', { cron: event.cron })
			return
		}

		ctx.waitUntil(
			invokeJob(env, path).catch((error) => {
				console.error('Scheduled job failed', {
					cron: event.cron,
					path,
					error: error instanceof Error ? error.message : String(error),
				})
				throw error
			}),
		)
	},
}

export { StorageMigrationWorkflow }
