// learn more: https://fly.io/docs/reference/configuration/#services-http_checks
import { getValidatedHost } from '@repo/common/headers'
import { prisma } from '@repo/database'
import { ENV } from 'varlock/env'
import { type Route } from './+types/healthcheck.ts'

export async function loader({ request }: Route.LoaderArgs) {
	const host = getValidatedHost(request, ENV.BASE_URL)

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
