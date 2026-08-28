// Health check endpoint - validates database connection and self-reachability
import { getValidatedHost } from '@repo/common/headers'
import { countUsers } from '@repo/database'
import { ENV } from 'varlock/env'
import { type Route } from './+types/healthcheck.ts'

async function assertSelfReachable(request: Request, host: string) {
	const hostname = host.split(':')[0]?.toLowerCase() ?? ''
	const isLoopback =
		hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1'
	// Node listens on HTTP locally; TLS is terminated at the dev proxy.
	const protocol = isLoopback ? 'http:' : new URL(request.url).protocol
	const response = await fetch(`${protocol}//${host}`, {
		method: 'HEAD',
		headers: { 'X-Healthcheck': 'true' },
		redirect: 'manual',
	})
	// `/` often 302s to login. Any non-5xx means the HTTP server is up.
	if (response.status >= 500) {
		throw new Error(`Self-check failed with ${response.status}`)
	}
}

export async function loader({ request }: Route.LoaderArgs) {
	const host = getValidatedHost(request, ENV.BASE_URL)

	if (!host) {
		return new Response('ERROR: Invalid host', { status: 400 })
	}

	try {
		await Promise.all([countUsers(), assertSelfReachable(request, host)])
		return new Response('OK')
	} catch (error) {
		console.error('healthcheck ❌', error)
		return new Response('ERROR', { status: 500 })
	}
}
