import { invariantResponse } from '@epic-web/invariant'
import { lruCache } from '@repo/server-utils'
import {
	getAllInstances,
	getInstanceInfo,
	ensureInstance,
} from '@repo/server-utils'
import { requireUserWithRole } from '@repo/auth'
import { type Route } from './+types/cache_.lru.$cacheKey.ts'

export async function loader({ request, params }: Route.LoaderArgs) {
	await requireUserWithRole(request, 'admin')
	const searchParams = new URL(request.url).searchParams
	const currentInstanceInfo = await getInstanceInfo()
	const allInstances = await getAllInstances()
	const instance =
		searchParams.get('instance') ?? currentInstanceInfo.currentInstance
	await ensureInstance(instance)

	const { cacheKey } = params
	invariantResponse(cacheKey, 'cacheKey is required')
	return {
		instance: {
			hostname: instance,
			region: allInstances[instance],
			isPrimary: currentInstanceInfo.primaryInstance === instance,
		},
		cacheKey,
		value: lruCache.get(cacheKey),
	}
}
