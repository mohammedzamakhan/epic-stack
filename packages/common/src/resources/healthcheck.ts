// learn more: https://fly.io/docs/reference/configuration/#services-http_checks

import { getDomainUrl } from '@repo/common'
import { countUsers } from '@repo/database'

export async function healthcheckLoader(request: Request) {
	try {
		await Promise.all([
			countUsers(),
			fetch(getDomainUrl(request), {
				method: 'HEAD',
				headers: { 'X-Healthcheck': 'true' },
				redirect: 'manual',
			}).then((response) => {
				if (response.status >= 500) {
					throw new Error(`Self-check failed with ${response.status}`)
				}
			}),
		])
		return new Response('OK')
	} catch (error: unknown) {
		console.error('healthcheck ❌', error)
		return new Response('ERROR', { status: 500 })
	}
}
