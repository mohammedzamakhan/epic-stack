import { sanitizeUrl } from '@repo/observability'
import { PostHog } from 'posthog-node'
import { createContext, type RouterContextProvider } from 'react-router'
import { ENV } from 'varlock/env'
import { type Route } from '../+types/root.ts'

type PostHogRequestContext = {
	client: PostHog
	distinctId: string
	sessionId?: string
}

export const posthogContext = createContext<PostHogRequestContext | null>(null)

function getPostHogConfig() {
	const projectToken = ENV.POSTHOG_PROJECT_TOKEN?.trim()
	const host = ENV.POSTHOG_HOST?.trim().replace(/\/$/, '')

	if (!projectToken?.startsWith('phc_') || !host) return null

	return { projectToken, host }
}

export const posthogMiddleware: Route.MiddlewareFunction = async (
	{ request, context },
	next,
) => {
	const config = getPostHogConfig()
	if (!config) return next()

	const client = new PostHog(config.projectToken, {
		host: config.host,
		flushAt: 1,
		flushInterval: 0,
	})
	const headerDistinctId = request.headers.get('x-posthog-distinct-id')?.trim()
	const distinctId = headerDistinctId || crypto.randomUUID()
	const sessionId = request.headers.get('x-posthog-session-id')?.trim()

	context.set(posthogContext, {
		client,
		distinctId,
		sessionId: sessionId || undefined,
	})

	try {
		return await next()
	} finally {
		await client.shutdown().catch(() => undefined)
	}
}

export function capturePostHogServerException(
	context: Readonly<RouterContextProvider>,
	error: unknown,
	request: Request,
) {
	const requestContext = context.get(posthogContext)
	if (!requestContext) return

	try {
		requestContext.client.captureException(error, requestContext.distinctId, {
			$current_url: sanitizeUrl(request.url),
			$session_id: requestContext.sessionId,
			$process_person_profile: Boolean(
				request.headers.get('x-posthog-distinct-id'),
			),
			method: request.method,
			service: 'app-worker',
		})
	} catch {
		// Telemetry must never replace or mask the original request error.
	}
}
