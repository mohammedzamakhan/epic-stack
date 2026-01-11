// learn more: https://fly.io/docs/reference/configuration/#services-http_checks

import { getDomainUrl } from '../misc.tsx'

export interface HealthcheckDependencies {
	prisma: {
		user: {
			count: () => Promise<number>
		}
	}
}

export async function healthcheckLoader(
	request: Request,
	deps: HealthcheckDependencies,
) {
	try {
		// if we can connect to the database and make a simple query
		// and make a HEAD request to ourselves, then we're good.
		await Promise.all([
			deps.prisma.user.count(),
			fetch(getDomainUrl(request), {
				method: 'HEAD',
				headers: { 'X-Healthcheck': 'true' },
			}).then((r) => {
				if (!r.ok) return Promise.reject(r)
			}),
		])
		return new Response('OK')
	} catch (error: unknown) {
		console.log('healthcheck ❌', { error })
		return new Response('ERROR', { status: 500 })
	}
}
