// learn more: https://fly.io/docs/reference/configuration/#services-http_checks
import { prisma } from '@repo/database'
import { ENV } from 'varlock/env'
import { type Route } from './+types/healthcheck.ts'

function getValidatedHost(request: Request): string | null {
	const forwardedHost = request.headers.get('X-Forwarded-Host')
	const host = request.headers.get('host')
	const candidateHost = forwardedHost ?? host

	if (!candidateHost) {
		return null
	}

	const hostWithoutPort = candidateHost.split(':')[0]?.toLowerCase()

	if (!hostWithoutPort) {
		return null
	}

	if (
		hostWithoutPort === 'localhost' ||
		hostWithoutPort === '127.0.0.1' ||
		hostWithoutPort === '::1'
	) {
		return candidateHost
	}

	const baseUrlHost = new URL(ENV.BASE_URL).hostname.toLowerCase()
	if (
		hostWithoutPort === baseUrlHost ||
		hostWithoutPort.endsWith(`.${baseUrlHost}`)
	) {
		return candidateHost
	}

	return host
}

export async function loader({ request }: Route.LoaderArgs) {
	const host = getValidatedHost(request)

	if (!host) {
		return new Response('ERROR: Invalid host', { status: 400 })
	}

	try {
		// if we can connect to the database and make a simple query
		// and make a HEAD request to ourselves, then we're good.
		await Promise.all([
			prisma.user.count(),
			fetch(`${new URL(request.url).protocol}//${host}`, {
				method: 'HEAD',
				headers: { 'X-Healthcheck': 'true' },
			}).then((r) => {
				if (!r.ok) return Promise.reject(r)
			}),
		])
		return new Response('OK')
	} catch {
		return new Response('ERROR', { status: 500 })
	}
}
