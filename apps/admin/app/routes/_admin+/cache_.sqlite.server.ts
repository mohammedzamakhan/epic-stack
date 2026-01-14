import { redirect } from 'react-router'
import { z } from 'zod'
import { cache } from '#app/utils/cache.server.ts'
import { ENV } from '#app/utils/env.server.ts'
import { getInstanceInfo } from '#app/utils/litefs.server.ts'
import { type Route } from './+types/cache_.sqlite.ts'

export async function action({ request }: Route.ActionArgs) {
	const { currentIsPrimary, primaryInstance } = await getInstanceInfo()
	if (!currentIsPrimary) {
		throw new Error(
			`${request.url} should only be called on the primary instance (${primaryInstance})}`,
		)
	}
	const token = ENV.INTERNAL_COMMAND_TOKEN
	const isAuthorized =
		request.headers.get('Authorization') === `Bearer ${token}`
	if (!isAuthorized) {
		// nah, you can't be here...
		return redirect('https://www.youtube.com/watch?v=dQw4w9WgXcQ')
	}
	const { key, cacheValue } = z
		.object({ key: z.string(), cacheValue: z.unknown().optional() })
		.parse(await request.json())
	if (cacheValue === undefined) {
		await cache.delete(key)
	} else {
		// @ts-expect-error - we don't reliably know the type of cacheValue
		await cache.set(key, cacheValue)
	}
	return { success: true }
}
